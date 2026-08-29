const mongoose = require("mongoose");
const Plan = require("../models/Plan");
const Client = require("../models/Client");

const LIMIT_FIELDS = ["maxUsers", "maxBranches", "maxDepartments", "maxProjects", "maxClients", "maxStorageMB"];

// Resolves a tenant's actual, currently-in-effect limits. For every plan
// except "custom" this is a LIVE lookup against the Plan collection (not a
// snapshot taken at tenant-creation time) — editing a plan's limits instantly
// changes what every tenant on that plan is allowed to do. Only "custom"
// tenants use their own per-tenant override fields on the Organization doc.
const getEffectiveLimits = async (organization) => {
  if (organization.planName === "custom") {
    return LIMIT_FIELDS.reduce((limits, field) => {
      limits[field] = organization[field] ?? null;
      return limits;
    }, {});
  }

  const plan = await Plan.findOne({ key: organization.planName });
  if (!plan) {
    // No plan document found (shouldn't happen once seedPlans has run) —
    // fail open rather than locking every tenant out of creating anything.
    return LIMIT_FIELDS.reduce((limits, field) => ({ ...limits, [field]: null }), {});
  }

  return LIMIT_FIELDS.reduce((limits, field) => {
    limits[field] = plan[field] ?? null;
    return limits;
  }, {});
};

// Real calculation (not a placeholder): sums the byte sizes already recorded
// on every PI attachment across a tenant's clients, converted to MB.
const getStorageUsedMB = async (tenantId) => {
  const result = await Client.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
    { $unwind: { path: "$piAttachments", preserveNullAndEmptyArrays: true } },
    { $group: { _id: null, totalBytes: { $sum: { $ifNull: ["$piAttachments.size", 0] } } } },
  ]);

  const totalBytes = result[0]?.totalBytes || 0;
  return Number((totalBytes / (1024 * 1024)).toFixed(2));
};

module.exports = { getEffectiveLimits, getStorageUsedMB, LIMIT_FIELDS };
