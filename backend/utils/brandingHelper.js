const TenantBranding = require("../models/TenantBranding");
const Organization = require("../models/Organization");

// Lazy-migrates a tenant's branding the first time it's read after this
// collection was introduced, seeding it from the legacy fields that used to
// live directly on Organization (logoUrl/faviconUrl/primaryColor/
// secondaryColor/footerText). Those Organization fields are left in place,
// unused, rather than deleted — cheap safety net if anything here needs to
// be rolled back.
const getOrCreateBranding = async (tenantId) => {
  let branding = await TenantBranding.findOne({ tenantId });
  if (branding) return branding;

  const organization = await Organization.findById(tenantId).select(
    "logoUrl faviconUrl primaryColor secondaryColor footerText"
  );

  branding = await TenantBranding.create({
    tenantId,
    companyLogo: organization?.logoUrl || undefined,
    favicon: organization?.faviconUrl || undefined,
    primaryColor: organization?.primaryColor || "#f7931e",
    secondaryColor: organization?.secondaryColor || undefined,
    footerText: organization?.footerText || undefined,
  });

  return branding;
};

module.exports = { getOrCreateBranding };
