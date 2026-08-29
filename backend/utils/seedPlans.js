const Plan = require("../models/Plan");

// Idempotent — only inserts plans that don't already exist, so Super Admin
// edits to a plan's limits (via the DB or a future Plans-admin UI) are never
// clobbered by a re-run of this seed on server restart.
const DEFAULT_PLANS = [
  {
    key: "starter",
    displayName: "Starter",
    maxUsers: 10,
    maxBranches: 1,
    maxDepartments: 5,
    maxProjects: 20,
    maxClients: 50,
    maxStorageMB: 5120,
    maxApiRequestsPerDay: 5000,
    maxFileUploadSizeMB: 10,
    trialDays: 14,
  },
  {
    key: "professional",
    displayName: "Professional",
    maxUsers: 50,
    maxBranches: 5,
    maxDepartments: 20,
    maxProjects: 100,
    maxClients: 250,
    maxStorageMB: 25600,
    maxApiRequestsPerDay: 25000,
    maxFileUploadSizeMB: 25,
    analyticsAccess: true,
    trialDays: 14,
  },
  {
    key: "business",
    displayName: "Business",
    maxUsers: 200,
    maxBranches: 20,
    maxDepartments: 100,
    maxProjects: 500,
    maxClients: 1000,
    maxStorageMB: 102400,
    maxApiRequestsPerDay: 100000,
    maxFileUploadSizeMB: 50,
    analyticsAccess: true,
    automationAccess: true,
    trialDays: 14,
  },
  {
    key: "enterprise",
    displayName: "Enterprise",
    maxUsers: null,
    maxBranches: null,
    maxDepartments: null,
    maxProjects: null,
    maxClients: null,
    maxStorageMB: null,
    maxApiRequestsPerDay: null,
    maxFileUploadSizeMB: 100,
    whiteLabel: true,
    customDomain: true,
    analyticsAccess: true,
    automationAccess: true,
    aiFeatures: true,
    trialDays: 30,
  },
  {
    key: "custom",
    displayName: "Custom",
    isCustom: true,
    trialDays: 14,
    // All limits null here on purpose — a custom-plan tenant's real limits
    // live on its own Organization document (per-tenant override), not here.
  },
];

const seedDefaultPlans = async () => {
  for (const plan of DEFAULT_PLANS) {
    const exists = await Plan.findOne({ key: plan.key });
    if (!exists) {
      await Plan.create(plan);
      console.log(`Seeded plan: ${plan.key}`);
    }
  }
};

module.exports = { seedDefaultPlans };
