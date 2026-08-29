const Notification = require("../models/Notification");
const Organization = require("../models/Organization");
const { withTenant } = require("../utils/tenantQuery");

const EXPIRY_WARNING_DAYS = 7;

// Rather than a cron job, subscription-expiry warnings are synthesized
// lazily on read: if the caller's own org is within EXPIRY_WARNING_DAYS of
// its trial/subscription end and no warning has been persisted for that
// exact expiry date yet, write one now. Real, stored data — just generated
// on-demand instead of on a schedule. Only the admin role gets these
// (they're the one who can act on a subscription).
const maybeCreateExpiryWarning = async (req) => {
  if (req.user.role !== "admin" || !req.tenantId) return;

  const organization = await Organization.findById(req.tenantId).select("status trialEndsAt subscriptionExpiresAt");
  if (!organization) return;

  const expiryDate = organization.status === "trial" ? organization.trialEndsAt : organization.subscriptionExpiresAt;
  if (!expiryDate) return;

  const daysLeft = (new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
  if (daysLeft > EXPIRY_WARNING_DAYS) return;

  const expiryKey = new Date(expiryDate).toISOString().slice(0, 10);
  const existing = await Notification.findOne({
    tenantId: req.tenantId,
    userId: req.user.id,
    type: "subscription_expiry",
    "meta.expiryKey": expiryKey,
  });
  if (existing) return;

  const message = daysLeft < 0
    ? `Your ${organization.status === "trial" ? "trial" : "subscription"} expired on ${new Date(expiryDate).toLocaleDateString()}. Renew to avoid service interruption.`
    : `Your ${organization.status === "trial" ? "trial" : "subscription"} expires on ${new Date(expiryDate).toLocaleDateString()} (${Math.max(0, Math.ceil(daysLeft))} day${Math.ceil(daysLeft) === 1 ? "" : "s"} left).`;

  await Notification.create({
    tenantId: req.tenantId,
    userId: req.user.id,
    type: "subscription_expiry",
    title: daysLeft < 0 ? "Subscription expired" : "Subscription expiring soon",
    message,
    link: "/admin?tab=subscription",
    meta: { expiryKey },
  });
};

exports.getNotifications = async (req, res) => {
  try {
    await maybeCreateExpiryWarning(req);

    const { type, page = 1, limit = 20 } = req.query;
    const filter = { userId: req.user.id };
    if (type) filter.type = type;

    const notifications = await Notification.find(withTenant(filter, req))
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    return res.json({ notifications });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch notifications" });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    await maybeCreateExpiryWarning(req);

    const count = await Notification.countDocuments(withTenant({ userId: req.user.id, isRead: false }, req));
    return res.json({ count });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch unread count" });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      withTenant({ _id: req.params.id, userId: req.user.id }, req),
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    return res.json({ message: "Marked as read", notification });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to mark notification as read" });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(withTenant({ userId: req.user.id, isRead: false }, req), { isRead: true });
    return res.json({ message: "All notifications marked as read" });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to mark notifications as read" });
  }
};
