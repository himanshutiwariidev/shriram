const mongoose = require("mongoose");

// Identity/profile fields, plus plan/subscription fields. White-label theme
// and custom-domain fields are still deferred to a later pass.
// maxUsers/maxBranches/maxDepartments/maxProjects/maxClients/maxStorageMB
// are ONLY read by the enforcement engine (utils/planLimits.js) when
// planName === "custom" — for every other plan, effective limits are looked
// up live from the Plan collection instead, so these fields are unused
// leftovers on non-custom tenants (kept for potential display convenience).
const OrganizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Organization name is required"], trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    // Branding — logoUrl/faviconUrl are file paths under /uploads/branding,
    // set only via the upload endpoints (controllers/organizationController.js
    // uploadLogo/uploadFavicon), never a raw URL a Super Admin types in.
    logoUrl: { type: String, trim: true },
    faviconUrl: { type: String, trim: true },
    primaryColor: { type: String, trim: true, default: "#f7931e" },
    secondaryColor: { type: String, trim: true },
    footerText: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    website: { type: String, trim: true },
    gstNumber: { type: String, trim: true },
    panNumber: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    timezone: { type: String, default: "Asia/Kolkata" },
    currency: { type: String, default: "INR" },
    businessType: { type: String, trim: true },
    status: { type: String, enum: ["trial", "active", "suspended", "expired"], default: "trial" },
    trialEndsAt: { type: Date },
    planName: { type: String, enum: ["starter", "professional", "business", "enterprise", "custom"], default: "starter" },
    trialDays: { type: Number, default: 14 },
    subscriptionStartDate: { type: Date },
    subscriptionExpiresAt: { type: Date },
    maxUsers: { type: Number, default: null },
    maxBranches: { type: Number, default: null },
    maxDepartments: { type: Number, default: null },
    maxProjects: { type: Number, default: null },
    maxClients: { type: Number, default: null },
    maxStorageMB: { type: Number, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Organization", OrganizationSchema);
