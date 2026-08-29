const mongoose = require("mongoose");
const Organization = require("../models/Organization");
const { getEffectiveLimits } = require("../utils/planLimits");

const RESOURCE_CONFIG = {
  users: { limitField: "maxUsers", collection: "users" },
  branches: { limitField: "maxBranches", collection: "branches" },
  departments: { limitField: "maxDepartments", collection: "departments" },
  projects: { limitField: "maxProjects", collection: "projects" },
  clients: { limitField: "maxClients", collection: "clients" },
};

// Blocks creation once a tenant hits its plan's limit for a resource.
// null limit = unlimited, always passes. Must run after authMiddleware
// (needs req.tenantId).
const checkPlanLimit = (resource) => async (req, res, next) => {
  try {
    if (!req.tenantId) return next();

    const config = RESOURCE_CONFIG[resource];
    if (!config) return next();

    const organization = await Organization.findById(req.tenantId);
    if (!organization) return next();

    const limits = await getEffectiveLimits(organization);
    const max = limits[config.limitField];
    if (max == null) return next();

    const count = await mongoose.connection.db
      .collection(config.collection)
      .countDocuments({ tenantId: organization._id });

    if (count >= max) {
      return res.status(403).json({
        success: false,
        message: "You have reached your subscription limit. Please upgrade your plan.",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = checkPlanLimit;
