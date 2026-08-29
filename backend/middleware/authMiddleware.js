const jwt = require("jsonwebtoken");
const Organization = require("../models/Organization");

// Accepts tokens from two sources (highest-security first):
//   1. HttpOnly cookie "access_token" — set by the server on login.
//   2. Authorization: Bearer <token> header — backward-compatible with the
//      existing React frontend that reads tokens from localStorage.
// Both paths set req.user identically; no behaviour change for existing callers.
const authMiddleware = async (req, res, next) => {
  try {
    // Prefer the httpOnly cookie when present
    let token = req.cookies?.access_token;

    // Fall back to the Authorization header (existing frontend flow)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Tokens issued before the multi-tenant migration lack a tenantId claim.
    // Only superadmin accounts are tenant-less; every other role must have one.
    if (decoded.role !== "superadmin" && !decoded.tenantId) {
      return res.status(401).json({ message: "Session expired, please log in again" });
    }

    // Re-checked on every request, not just at login — otherwise a token
    // issued before a suspension keeps working for its full remaining
    // lifetime. This is what makes suspending an organization take effect
    // immediately for already-logged-in sessions.
    if (decoded.role !== "superadmin") {
      const organization = await Organization.findById(decoded.tenantId)
        .select("status subscriptionExpiresAt trialEndsAt");

      if (!organization) {
        return res.status(403).json({
          success: false,
          code: "ORG_NOT_FOUND",
          message: "Your organization could not be found. Please contact your Platform Administrator.",
        });
      }

      // Auto-expire: status field is a snapshot — check the actual dates on
      // every request so expiry takes effect immediately without the superadmin
      // having to manually flip the status field.
      const now = new Date();
      let effectiveStatus = organization.status;

      if (
        effectiveStatus === "active" &&
        organization.subscriptionExpiresAt &&
        organization.subscriptionExpiresAt < now
      ) {
        effectiveStatus = "expired";
        // Update DB in the background so the next request is instant
        Organization.updateOne({ _id: organization._id }, { $set: { status: "expired" } }).catch(() => {});
      }

      if (
        effectiveStatus === "trial" &&
        organization.trialEndsAt &&
        organization.trialEndsAt < now
      ) {
        effectiveStatus = "expired";
        Organization.updateOne({ _id: organization._id }, { $set: { status: "expired" } }).catch(() => {});
      }

      if (effectiveStatus === "suspended") {
        return res.status(403).json({
          success: false,
          code: "ORG_SUSPENDED",
          message: "Your organization account has been suspended. Please contact your Platform Partner or Administrator for assistance.",
        });
      }
      if (effectiveStatus === "expired") {
        return res.status(403).json({
          success: false,
          code: "ORG_EXPIRED",
          message: "Your organization's subscription has expired. Please renew your subscription to continue.",
        });
      }
    }

    req.user = decoded;
    req.tenantId = decoded.tenantId;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Lightweight token-only auth for renewal endpoints — verifies JWT and sets
// req.user/tenantId but intentionally skips org-status checks so that tenants
// with expired subscriptions can still reach the payment routes.
const authForRenewal = (req, res, next) => {
  try {
    let token = req.cookies?.access_token;
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) token = authHeader.split(" ")[1];
    }
    if (!token) return res.status(401).json({ message: "Authentication required" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.tenantId) return res.status(401).json({ message: "Tenant account required" });

    req.user     = decoded;
    req.tenantId = decoded.tenantId;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;
module.exports.authForRenewal = authForRenewal;
