const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const jwt = require("jsonwebtoken");

// ── Shared response factory ─────────────────────────────────────────────────
const limitMessage = (message) => ({
  status: 429,
  message,
});

// This limiter runs before authMiddleware in the pipeline, so req.user isn't
// set yet — decode the token directly (best-effort) to key by user id when
// possible, so heavy legitimate dashboard traffic from one account doesn't
// get lumped in with unrelated traffic sharing the same IP (office NAT, etc).
// Falls back to IP for unauthenticated requests or an invalid/expired token.
const keyByUserOrIp = (req, res) => {
  try {
    const token = req.cookies?.access_token || req.headers.authorization?.split(" ")[1];
    if (token) {
      const decoded = jwt.decode(token);
      if (decoded?.id) return String(decoded.id);
    }
  } catch {
    // fall through to IP
  }
  return ipKeyGenerator(req, res);
};

// ── 1. General API limiter — applied globally ───────────────────────────────
// A coarse DoS backstop, not a per-feature throttle — a single dashboard
// mount alone fires a dozen-plus background GETs, so this needs real
// headroom for legitimate use, not a tight per-endpoint budget.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,   // Return RateLimit-* headers (RFC 6585)
  legacyHeaders: false,    // Disable X-RateLimit-* legacy headers
  keyGenerator: keyByUserOrIp,
  message: limitMessage("Too many requests. Please try again after 15 minutes."),
  skip: (req) => req.path === "/",  // Health-check route excluded
});

// ── 2. Login limiter ────────────────────────────────────────────────────────
// 5 attempts per 15 minutes; only failed requests count toward the quota
// (a successful login doesn't penalise the user).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: limitMessage(
    "Too many login attempts. Please try again after 15 minutes."
  ),
});

// ── 3. Create-user limiter ──────────────────────────────────────────────────
// Admin can create at most 20 users per hour (prevents bulk abuse).
const createUserLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage(
    "Too many user-creation requests. Please try again after an hour."
  ),
});

// ── 4. Register-organization limiter ────────────────────────────────────────
// 5 new-tenant signups per hour per IP — prevents automated signup abuse.
const registerOrgLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage(
    "Too many organization sign-up attempts. Please try again after an hour."
  ),
});

module.exports = { generalLimiter, loginLimiter, createUserLimiter, registerOrgLimiter };
