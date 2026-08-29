const ActivityLog = require("../models/ActivityLog");

// Best-effort audit trail — a logging failure must never break the real request.
const logActivity = async (tenantId, clientId, type, message, meta) => {
  try {
    if (!clientId || !tenantId) return;
    await ActivityLog.create({ tenantId, clientId, type, message, meta });
  } catch (error) {
    console.error("Failed to log activity:", error.message);
  }
};

module.exports = { logActivity };
