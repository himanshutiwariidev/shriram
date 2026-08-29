const TenantFeature = require("../models/TenantFeature");

// Gates a route behind a tenant's enabled-features list. Must run after
// authMiddleware (needs req.tenantId). Fails open when no TenantFeature
// document exists for the tenant — every tenant created before this system
// existed keeps full access with no migration required; only tenants that
// get an explicit feature selection are ever restricted.
const checkFeature = (featureKey) => async (req, res, next) => {
  try {
    if (!req.tenantId) return next();

    const record = await TenantFeature.findOne({ tenantId: req.tenantId });
    if (!record) return next();

    if (!record.enabledFeatures.includes(featureKey)) {
      return res.status(403).json({
        success: false,
        message: "This feature is not available in your subscription.",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = checkFeature;
