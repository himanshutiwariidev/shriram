const mongoose = require("mongoose");

// One document per organization — a superadmin-managed profile row, not
// tenant-owned data itself, so it's keyed directly by tenantId rather than
// scoped via tenantScopePlugin. loginBackground is stored but intentionally
// never rendered anywhere: there's no subdomain/custom-domain routing to
// resolve which tenant is signing in before credentials are submitted, so a
// pre-login branded screen isn't buildable yet.
const TenantBrandingSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, unique: true, index: true },
    companyLogo: { type: String, trim: true },
    favicon: { type: String, trim: true },
    primaryColor: { type: String, trim: true, default: "#f7931e" },
    secondaryColor: { type: String, trim: true },
    accentColor: { type: String, trim: true },
    footerText: { type: String, trim: true },
    loginBackground: { type: String, trim: true },
    dashboardBackground: { type: String, trim: true },
    emailLogo: { type: String, trim: true },
    pdfLogo: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TenantBranding", TenantBrandingSchema);
