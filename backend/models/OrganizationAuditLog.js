const mongoose = require("mongoose");

// Org-level admin-action history for the Super Admin panel's Audit Logs
// tab — deliberately separate from models/ActivityLog.js, which is
// clientId-required and powers the unrelated per-client activity feed on
// the Client Detail page.
const OrganizationAuditLogSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    action: {
      type: String,
      required: true,
      enum: ["suspend", "activate", "org_update", "branding_update", "feature_change", "subscription_change"],
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    message: { type: String, required: true, trim: true },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

OrganizationAuditLogSchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.model("OrganizationAuditLog", OrganizationAuditLogSchema);
