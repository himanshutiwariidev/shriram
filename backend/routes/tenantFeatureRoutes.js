const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const TenantFeature = require("../models/TenantFeature");
const Organization = require("../models/Organization");
const { FEATURE_CATALOG, FEATURE_KEYS } = require("../config/featureCatalog");
const { getEffectiveLimits, getStorageUsedMB } = require("../utils/planLimits");
const { getOrCreateBranding } = require("../utils/brandingHelper");
const authMiddleware = require("../middleware/authMiddleware");
const asyncHandler = require("../utils/asyncHandler");

// What the logged-in tenant user's own frontend polls to build its dynamic
// sidebar. Any authenticated tenant role can call this (it's read-only and
// only reveals which modules exist for their own tenant).
router.get(
  "/features",
  authMiddleware,
  asyncHandler(async (req, res) => {
    if (!req.tenantId) {
      return res.json({ enabledFeatures: FEATURE_KEYS });
    }
    const record = await TenantFeature.findOne({ tenantId: req.tenantId });
    return res.json({ enabledFeatures: record ? record.enabledFeatures : FEATURE_KEYS });
  })
);

// Catalog metadata (group/label names) for the tenant-side Subscription
// view's feature badge list — a copy of the superadmin-only meta endpoint,
// but reachable by any authenticated tenant role instead of superadmin-only.
router.get(
  "/feature-catalog",
  authMiddleware,
  asyncHandler(async (_req, res) => res.json({ catalog: FEATURE_CATALOG }))
);

// Powers the tenant-side Subscription view: plan/status/dates, real
// usage-vs-limit numbers, and the tenant's own feature access — everything
// a tenant admin needs to see without asking Super Admin, polled
// periodically so plan/feature changes propagate without a re-login.
router.get(
  "/subscription",
  authMiddleware,
  asyncHandler(async (req, res) => {
    if (!req.tenantId) {
      return res.status(404).json({ message: "No organization associated with this account" });
    }

    const organization = await Organization.findById(req.tenantId).populate({
      path: "createdBy", select: "name email phone profileImage designation lastLogin", options: { skipTenantScope: true },
    });
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const db = mongoose.connection.db;
    const usage = {};
    for (const name of ["users", "branches", "departments", "projects", "clients"]) {
      usage[name] = await db.collection(name).countDocuments({ tenantId: organization._id });
    }
    usage.storageMB = await getStorageUsedMB(organization._id);

    const limits = await getEffectiveLimits(organization);
    const branding = await getOrCreateBranding(organization._id);

    const featureRecord = await TenantFeature.findOne({ tenantId: req.tenantId });
    const enabledFeatures = featureRecord ? featureRecord.enabledFeatures : FEATURE_KEYS;

    return res.json({
      organization: {
        name: organization.name,
        email: organization.email,
        phone: organization.phone,
        website: organization.website,
        address: organization.address,
        city: organization.city,
        state: organization.state,
        country: organization.country,
        postalCode: organization.postalCode,
        planName: organization.planName,
        status: organization.status,
        trialEndsAt: organization.trialEndsAt,
        subscriptionStartDate: organization.subscriptionStartDate,
        subscriptionExpiresAt: organization.subscriptionExpiresAt,
        createdAt: organization.createdAt,
        logoUrl: branding.companyLogo || null,
        faviconUrl: branding.favicon || null,
        primaryColor: branding.primaryColor || null,
        secondaryColor: branding.secondaryColor || null,
        accentColor: branding.accentColor || null,
        footerText: branding.footerText || null,
      },
      owner: organization.createdBy
        ? {
            name: organization.createdBy.name,
            email: organization.createdBy.email,
            phone: organization.createdBy.phone,
            designation: organization.createdBy.designation,
            profileImage: organization.createdBy.profileImage || null,
            lastLogin: organization.createdBy.lastLogin,
          }
        : null,
      limits,
      usage,
      enabledFeatures,
    });
  })
);

// Powers dynamic tenant branding on the dashboard chrome (sidebar logo,
// favicon, title) — never the platform's own branding. No fallback to any
// platform logo file: the frontend shows a generic initials placeholder
// when a tenant hasn't uploaded one.
router.get(
  "/branding",
  authMiddleware,
  asyncHandler(async (req, res) => {
    if (!req.tenantId) {
      return res.json({ name: null, logoUrl: null, faviconUrl: null, primaryColor: null, secondaryColor: null, accentColor: null, footerText: null });
    }
    const organization = await Organization.findById(req.tenantId).select("name");
    if (!organization) {
      return res.json({ name: null, logoUrl: null, faviconUrl: null, primaryColor: null, secondaryColor: null, accentColor: null, footerText: null });
    }
    const branding = await getOrCreateBranding(organization._id);
    return res.json({
      name: organization.name,
      logoUrl: branding.companyLogo || null,
      faviconUrl: branding.favicon || null,
      primaryColor: branding.primaryColor || null,
      secondaryColor: branding.secondaryColor || null,
      accentColor: branding.accentColor || null,
      footerText: branding.footerText || null,
    });
  })
);

module.exports = router;
