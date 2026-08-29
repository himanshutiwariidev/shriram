const mongoose = require("mongoose");

// Global, platform-level plan definitions — not tenant-owned (no tenantId).
// Limits are looked up live at enforcement time (see utils/planLimits.js), so
// editing a plan here instantly changes limits for every tenant subscribed
// to it. Only the "custom" plan's limits are ignored in favor of a per-tenant
// override stored directly on the Organization document.
//
// whiteLabel/customDomain/reportsAccess/analyticsAccess/automationAccess/
// aiFeatures and maxApiRequestsPerDay/maxFileUploadSizeMB are informational
// only this pass — no real subsystem exists yet to gate on them.
const PlanSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      enum: ["starter", "professional", "business", "enterprise", "custom"],
      required: true,
      unique: true,
    },
    displayName: { type: String, required: true },
    maxUsers: { type: Number, default: null },
    maxBranches: { type: Number, default: null },
    maxDepartments: { type: Number, default: null },
    maxProjects: { type: Number, default: null },
    maxClients: { type: Number, default: null },
    maxStorageMB: { type: Number, default: null },
    maxApiRequestsPerDay: { type: Number, default: null },
    maxFileUploadSizeMB: { type: Number, default: null },
    whiteLabel: { type: Boolean, default: false },
    customDomain: { type: Boolean, default: false },
    reportsAccess: { type: Boolean, default: true },
    analyticsAccess: { type: Boolean, default: false },
    automationAccess: { type: Boolean, default: false },
    aiFeatures: { type: Boolean, default: false },
    trialDays: { type: Number, default: 14 },
    isCustom: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plan", PlanSchema);
