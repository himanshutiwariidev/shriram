const Notification = require("../models/Notification");

// Styled after activityLogger.js/orgAuditLogger.js — best-effort, never
// throws, so a notification write failure can't take down the action
// that triggered it.
const notifyUser = async (tenantId, userId, type, title, message, link, meta) => {
  try {
    await Notification.create({ tenantId, userId, type, title, message, link, meta });
  } catch (error) {
    console.error("Failed to write notification:", error);
  }
};

const notifyUsers = async (tenantId, userIds, type, title, message, link, meta) => {
  const uniqueIds = [...new Set((userIds || []).map((id) => id.toString()))];
  if (uniqueIds.length === 0) return;
  try {
    await Notification.insertMany(
      uniqueIds.map((userId) => ({ tenantId, userId, type, title, message, link, meta }))
    );
  } catch (error) {
    console.error("Failed to write notifications:", error);
  }
};

module.exports = { notifyUser, notifyUsers };
