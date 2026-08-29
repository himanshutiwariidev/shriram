const OrganizationAuditLog = require("../models/OrganizationAuditLog");

// Styled after utils/activityLogger.js — best-effort, never throws, so an
// audit-log write failure can't take down the action it's recording.
const logOrgAudit = async (tenantId, action, performedBy, message, meta) => {
  try {
    await OrganizationAuditLog.create({ tenantId, action, performedBy, message, meta });
  } catch (error) {
    console.error("Failed to write organization audit log:", error);
  }
};

module.exports = { logOrgAudit };
