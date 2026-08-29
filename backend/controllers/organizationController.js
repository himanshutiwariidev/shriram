const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Organization = require("../models/Organization");
const User = require("../models/User");
const Branch = require("../models/Branch");
const Department = require("../models/Department");
const TenantFeature = require("../models/TenantFeature");
const Plan = require("../models/Plan");
const OrganizationAuditLog = require("../models/OrganizationAuditLog");
const TenantBranding = require("../models/TenantBranding");
const { TENANT_COLLECTIONS } = require("../utils/tenantCollections");
const { buildUniqueSlug } = require("../utils/slugify");
const { FEATURE_CATALOG, FEATURE_KEYS } = require("../config/featureCatalog");
const { getEffectiveLimits, getStorageUsedMB } = require("../utils/planLimits");
const { getOrCreateBranding } = require("../utils/brandingHelper");
const { logOrgAudit } = require("../utils/orgAuditLogger");
const { notifyUsers } = require("../utils/notificationHelper");
const { deletePublicFileIfExists } = require("../utils/fileCleanup");

// Cross-tenant helper (superadmin context has no req.tenantId) — finds the
// admin user(s) of a given organization so they can be notified of changes
// a Super Admin makes to their org.
const notifyOrgAdmins = async (tenantId, type, title, message, link, meta) => {
  const admins = await User.find({ tenantId, role: "admin" }).setOptions({ skipTenantScope: true }).select("_id");
  await notifyUsers(tenantId, admins.map((u) => u._id), type, title, message, link, meta);
};

// Flattens a TenantBranding document onto a plain organization object so
// every existing frontend read of organization.logoUrl/primaryColor/etc.
// keeps working unchanged — callers never need to know branding now lives
// in its own collection.
const withBranding = (organizationObject, branding) => ({
  ...organizationObject,
  logoUrl: branding.companyLogo || "",
  faviconUrl: branding.favicon || "",
  primaryColor: branding.primaryColor,
  secondaryColor: branding.secondaryColor || "",
  accentColor: branding.accentColor || "",
  footerText: branding.footerText || "",
  loginBackground: branding.loginBackground || "",
  dashboardBackground: branding.dashboardBackground || "",
  emailLogo: branding.emailLogo || "",
  pdfLogo: branding.pdfLogo || "",
});

const BRANDING_FIELDS = [
  "primaryColor", "secondaryColor", "accentColor", "footerText",
  "dashboardBackground", "emailLogo", "pdfLogo",
];

const BCRYPT_ROUNDS = 12;

// Organization documents are not themselves tenant-owned (there's no
// "tenantId" on an Organization), so these queries are intentionally global —
// gated by requireRole("superadmin") in organizationRoutes.js instead.

exports.getOrganizations = async (req, res) => {
  try {
    const organizations = await Organization.find()
      .sort({ createdAt: -1 })
      .populate({ path: "createdBy", select: "name email phone profileImage designation lastLogin", options: { skipTenantScope: true } });

    const usage = await Promise.all(
      organizations.map(async (org) => {
        const db = mongoose.connection.db;
        const [userCount, clientCount, projectCount, branding] = await Promise.all([
          db.collection("users").countDocuments({ tenantId: org._id }),
          db.collection("clients").countDocuments({ tenantId: org._id }),
          db.collection("projects").countDocuments({ tenantId: org._id }),
          getOrCreateBranding(org._id),
        ]);
        return {
          ...withBranding(org.toObject(), branding),
          usage: { users: userCount, clients: clientCount, projects: projectCount },
        };
      })
    );

    return res.json({ organizations: usage, total: usage.length });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch organizations" });
  }
};

exports.getOrganizationById = async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id)
      .populate({ path: "createdBy", select: "name email phone profileImage designation lastLogin isActive departmentId", options: { skipTenantScope: true } });
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const db = mongoose.connection.db;
    const usage = {};
    for (const name of TENANT_COLLECTIONS) {
      usage[name] = await db.collection(name).countDocuments({ tenantId: organization._id });
    }
    usage.storageMB = await getStorageUsedMB(organization._id);

    const limits = await getEffectiveLimits(organization);
    const branding = await getOrCreateBranding(organization._id);

    return res.json({ organization: withBranding(organization.toObject(), branding), usage, limits });
  } catch (error) {
    console.error("Error fetching organization:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch organization" });
  }
};

exports.suspendOrganization = async (req, res) => {
  try {
    const organization = await Organization.findByIdAndUpdate(
      req.params.id,
      { status: "suspended" },
      { new: true }
    );
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }
    await logOrgAudit(organization._id, "suspend", req.user.id, `Organization "${organization.name}" was suspended`);
    await notifyOrgAdmins(organization._id, "org_update", "Organization suspended", `"${organization.name}" has been suspended by the platform administrator.`, "/admin?tab=orgProfile");
    return res.json({ message: "Organization suspended", organization });
  } catch (error) {
    console.error("Error suspending organization:", error);
    return res.status(500).json({ message: error.message || "Failed to suspend organization" });
  }
};

exports.activateOrganization = async (req, res) => {
  try {
    const organization = await Organization.findByIdAndUpdate(
      req.params.id,
      { status: "active" },
      { new: true }
    );
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }
    await logOrgAudit(organization._id, "activate", req.user.id, `Organization "${organization.name}" was activated`);
    await notifyOrgAdmins(organization._id, "org_update", "Organization activated", `"${organization.name}" is now active again.`, "/admin?tab=orgProfile");
    return res.json({ message: "Organization activated", organization });
  } catch (error) {
    console.error("Error activating organization:", error);
    return res.status(500).json({ message: error.message || "Failed to activate organization" });
  }
};

// Cascades: deletes every document across every tenant-owned collection for
// this organization, then the Organization document itself. Irreversible.
exports.deleteOrganization = async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const db = mongoose.connection.db;
    const deletedCounts = {};
    for (const name of TENANT_COLLECTIONS) {
      const result = await db.collection(name).deleteMany({ tenantId: organization._id });
      deletedCounts[name] = result.deletedCount;
    }

    // Not part of TENANT_COLLECTIONS (that list also drives the Usage tab's
    // business-data counts and the historical migration script, neither of
    // which this internal metadata belongs in) — cleaned up explicitly here
    // instead, so deleting an organization doesn't leave orphaned rows.
    await TenantBranding.deleteMany({ tenantId: organization._id });
    await OrganizationAuditLog.deleteMany({ tenantId: organization._id });

    await Organization.findByIdAndDelete(req.params.id);

    return res.json({ message: "Organization and all its data deleted", deletedCounts });
  } catch (error) {
    console.error("Error deleting organization:", error);
    return res.status(500).json({ message: error.message || "Failed to delete organization" });
  }
};

// ── CREATE TENANT ────────────────────────────────────────────────────────────
// Full tenant provisioning by Super Admin: Organization + first admin User +
// a default Branch + a default Department + the tenant's feature selection.
// Mirrors authController.registerOrganization's create-then-rollback pattern.
exports.createTenant = async (req, res) => {
  const {
    organizationName, logoUrl, companyEmail, companyPhone, website,
    gstNumber, panNumber, address, city, state, country, postalCode,
    timezone, currency, businessType,
    planName, trialDays, subscriptionStartDate, subscriptionExpiresAt,
    maxUsers, maxBranches, maxDepartments, maxStorageMB, status,
    adminName, adminEmail, adminMobile, adminPassword, adminDesignation,
    enabledFeatures,
  } = req.body;

  const normalizedEmail = String(adminEmail).trim().toLowerCase();

  try {
    const slug = await buildUniqueSlug(organizationName);
    const resolvedTrialDays = Number(trialDays) || 14;

    const organization = await Organization.create({
      name: organizationName.trim(),
      slug,
      logoUrl,
      email: companyEmail,
      phone: companyPhone,
      website,
      gstNumber,
      panNumber,
      address,
      city,
      state,
      country,
      postalCode,
      timezone,
      currency,
      businessType,
      status: status || "trial",
      trialEndsAt: new Date(Date.now() + resolvedTrialDays * 24 * 60 * 60 * 1000),
      planName,
      trialDays: resolvedTrialDays,
      subscriptionStartDate,
      subscriptionExpiresAt,
      maxUsers: maxUsers || null,
      maxBranches: maxBranches || null,
      maxDepartments: maxDepartments || null,
      maxStorageMB: maxStorageMB || null,
    });

    let admin;
    let defaultBranch;
    try {
      const hashedPassword = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
      admin = await User.create({
        tenantId: organization._id,
        name: adminName.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: adminMobile,
        designation: adminDesignation || undefined,
        role: "admin",
      });

      defaultBranch = await Branch.create({
        tenantId: organization._id,
        name: "Head Office",
        status: "active",
      });

      await Department.create({
        tenantId: organization._id,
        name: "General",
        branch: defaultBranch._id,
      });

      const requestedFeatures = Array.isArray(enabledFeatures)
        ? enabledFeatures.filter((key) => FEATURE_KEYS.includes(key))
        : FEATURE_KEYS;

      await TenantFeature.create({
        tenantId: organization._id,
        enabledFeatures: requestedFeatures,
      });
    } catch (error) {
      // Roll back the just-created Organization — same compensating-delete
      // pattern used in clientController.createClient / authController.
      await Organization.findByIdAndDelete(organization._id);
      if (error?.code === 11000) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }
      throw error;
    }

    organization.createdBy = admin._id;
    await organization.save();

    return res.status(201).json({
      message: "Tenant created successfully",
      organization,
      admin: { id: admin._id, name: admin.name, email: admin.email },
    });
  } catch (error) {
    console.error("Error creating tenant:", error);
    if (error?.code === 11000) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }
    return res.status(500).json({ message: error.message || "Failed to create tenant" });
  }
};

const SUBSCRIPTION_FIELDS = [
  "planName", "status", "trialDays", "subscriptionStartDate", "subscriptionExpiresAt",
  "maxUsers", "maxBranches", "maxDepartments", "maxProjects", "maxClients", "maxStorageMB",
];

// ── UPDATE ORGANIZATION (profile/subscription/branding fields) ─────────────
exports.updateOrganization = async (req, res) => {
  try {
    const updatePayload = { ...req.body };
    // Admin creation / feature selection go through their own endpoints.
    delete updatePayload.adminName;
    delete updatePayload.adminEmail;
    delete updatePayload.adminPassword;
    delete updatePayload.enabledFeatures;
    delete updatePayload.slug;

    // Branding fields live in their own collection now — route them there
    // instead of onto the Organization document.
    const brandingUpdate = {};
    for (const field of BRANDING_FIELDS) {
      if (updatePayload[field] !== undefined) {
        brandingUpdate[field] = updatePayload[field];
        delete updatePayload[field];
      }
    }

    const organization = await Organization.findByIdAndUpdate(req.params.id, updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    let branding = await getOrCreateBranding(organization._id);
    if (Object.keys(brandingUpdate).length > 0) {
      Object.assign(branding, brandingUpdate);
      await branding.save();
    }

    const isSubscriptionChange = SUBSCRIPTION_FIELDS.some((field) => updatePayload[field] !== undefined);
    if (Object.keys(brandingUpdate).length > 0) {
      await logOrgAudit(organization._id, "branding_update", req.user.id, `Branding updated for "${organization.name}"`, brandingUpdate);
      await notifyOrgAdmins(organization._id, "org_update", "Branding updated", `Your organization's branding was updated by the platform administrator.`, "/admin?tab=orgProfile");
    }
    if (isSubscriptionChange) {
      await logOrgAudit(organization._id, "subscription_change", req.user.id, `Subscription/limits updated for "${organization.name}"`, updatePayload);
      await notifyOrgAdmins(organization._id, "org_update", "Subscription updated", `Your organization's subscription/plan was updated by the platform administrator.`, "/admin?tab=subscription");
    } else if (Object.keys(updatePayload).length > 0 && Object.keys(brandingUpdate).length === 0) {
      await logOrgAudit(organization._id, "org_update", req.user.id, `Organization profile updated for "${organization.name}"`, updatePayload);
    }

    return res.json({ message: "Tenant updated successfully", organization: withBranding(organization.toObject(), branding) });
  } catch (error) {
    console.error("Error updating organization:", error);
    return res.status(500).json({ message: error.message || "Failed to update tenant" });
  }
};

// ── FEATURE CATALOG (metadata for the checkbox matrix) ──────────────────────
exports.getFeatureCatalog = async (_req, res) => {
  return res.json({ catalog: FEATURE_CATALOG });
};

// ── GET / UPDATE a tenant's enabled features ────────────────────────────────
exports.getOrganizationFeatures = async (req, res) => {
  try {
    const record = await TenantFeature.findOne({ tenantId: req.params.id });
    return res.json({ enabledFeatures: record ? record.enabledFeatures : FEATURE_KEYS });
  } catch (error) {
    console.error("Error fetching tenant features:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch tenant features" });
  }
};

exports.updateOrganizationFeatures = async (req, res) => {
  try {
    const { enabledFeatures } = req.body;
    if (!Array.isArray(enabledFeatures)) {
      return res.status(400).json({ message: "enabledFeatures must be an array" });
    }

    const validFeatures = enabledFeatures.filter((key) => FEATURE_KEYS.includes(key));

    const record = await TenantFeature.findOneAndUpdate(
      { tenantId: req.params.id },
      { tenantId: req.params.id, enabledFeatures: validFeatures },
      { new: true, upsert: true, runValidators: true }
    );

    await logOrgAudit(req.params.id, "feature_change", req.user.id, "Feature access updated", { enabledFeatures: validFeatures });

    return res.json({ message: "Feature access updated", enabledFeatures: record.enabledFeatures });
  } catch (error) {
    console.error("Error updating tenant features:", error);
    return res.status(500).json({ message: error.message || "Failed to update tenant features" });
  }
};

// ── Read-only sub-resource views for the Tenant Detail page ────────────────
// Superadmin's own JWT has no tenantId, so these bypass the normal
// withTenant()/req.tenantId path and filter explicitly by the :id param.
exports.getOrganizationUsers = async (req, res) => {
  try {
    const users = await User.find({ tenantId: req.params.id }).select("-password").sort({ createdAt: -1 });
    return res.json({ users, total: users.length });
  } catch (error) {
    console.error("Error fetching tenant users:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch tenant users" });
  }
};

exports.getOrganizationBranches = async (req, res) => {
  try {
    const branches = await Branch.find({ tenantId: req.params.id }).sort({ createdAt: -1 });
    return res.json({ branches, total: branches.length });
  } catch (error) {
    console.error("Error fetching tenant branches:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch tenant branches" });
  }
};

exports.getOrganizationDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ tenantId: req.params.id })
      .populate({ path: "branch", select: "name", options: { skipTenantScope: true } })
      .sort({ createdAt: -1 });
    return res.json({ departments, total: departments.length });
  } catch (error) {
    console.error("Error fetching tenant departments:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch tenant departments" });
  }
};

// ── Plan catalog (powers the Create/Edit Tenant form's auto-population) ────
exports.getPlans = async (_req, res) => {
  try {
    const plans = await Plan.find().sort({ createdAt: 1 });
    return res.json({ plans });
  } catch (error) {
    console.error("Error fetching plans:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch plans" });
  }
};

// ── Audit Logs (Edit Organization's Audit Logs tab) ─────────────────────────
exports.getOrganizationAuditLogs = async (req, res) => {
  try {
    const logs = await OrganizationAuditLog.find({ tenantId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate({ path: "performedBy", select: "name email", options: { skipTenantScope: true } });
    return res.json({ logs, total: logs.length });
  } catch (error) {
    console.error("Error fetching organization audit logs:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch audit logs" });
  }
};

// ── Branding: logo / favicon upload & delete ────────────────────────────────
// Stored value is always a served /uploads path, never a raw URL the Super
// Admin typed in — replaces the old logoUrl text field entirely.

exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const organization = await Organization.findById(req.params.id).select("name");
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const branding = await getOrCreateBranding(organization._id);
    deletePublicFileIfExists(branding.companyLogo);
    branding.companyLogo = `/uploads/branding/${req.file.filename}`;
    await branding.save();

    await logOrgAudit(organization._id, "branding_update", req.user.id, `Logo replaced for "${organization.name}"`);

    return res.json({ message: "Logo uploaded successfully", logoUrl: branding.companyLogo });
  } catch (error) {
    console.error("Error uploading logo:", error);
    return res.status(500).json({ message: error.message || "Failed to upload logo" });
  }
};

exports.deleteLogo = async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id).select("name");
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const branding = await getOrCreateBranding(organization._id);
    deletePublicFileIfExists(branding.companyLogo);
    branding.companyLogo = undefined;
    await branding.save();

    await logOrgAudit(organization._id, "branding_update", req.user.id, `Logo removed for "${organization.name}"`);

    return res.json({ message: "Logo removed successfully" });
  } catch (error) {
    console.error("Error deleting logo:", error);
    return res.status(500).json({ message: error.message || "Failed to delete logo" });
  }
};

exports.uploadFavicon = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const organization = await Organization.findById(req.params.id).select("name");
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const branding = await getOrCreateBranding(organization._id);
    deletePublicFileIfExists(branding.favicon);
    branding.favicon = `/uploads/branding/${req.file.filename}`;
    await branding.save();

    await logOrgAudit(organization._id, "branding_update", req.user.id, `Favicon replaced for "${organization.name}"`);

    return res.json({ message: "Favicon uploaded successfully", faviconUrl: branding.favicon });
  } catch (error) {
    console.error("Error uploading favicon:", error);
    return res.status(500).json({ message: error.message || "Failed to upload favicon" });
  }
};

exports.deleteFavicon = async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id).select("name");
    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const branding = await getOrCreateBranding(organization._id);
    deletePublicFileIfExists(branding.favicon);
    branding.favicon = undefined;
    await branding.save();

    await logOrgAudit(organization._id, "branding_update", req.user.id, `Favicon removed for "${organization.name}"`);

    return res.json({ message: "Favicon removed successfully" });
  } catch (error) {
    console.error("Error deleting favicon:", error);
    return res.status(500).json({ message: error.message || "Failed to delete favicon" });
  }
};

// ── Owner profile: photo upload/delete + editable fields ───────────────────
// "Owner" is the organization's original admin User (Organization.createdBy)
// — deliberately not a separate collection, to avoid duplicating identity
// data that already lives on User.
exports.uploadOwnerPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const organization = await Organization.findById(req.params.id).select("name createdBy");
    if (!organization || !organization.createdBy) {
      return res.status(404).json({ message: "Organization owner not found" });
    }
    const owner = await User.findById(organization.createdBy).setOptions({ skipTenantScope: true });
    if (!owner) {
      return res.status(404).json({ message: "Organization owner not found" });
    }

    deletePublicFileIfExists(owner.profileImage);
    owner.profileImage = `/uploads/owners/${req.file.filename}`;
    await owner.save();

    await logOrgAudit(organization._id, "org_update", req.user.id, `Owner photo replaced for "${organization.name}"`);

    return res.json({ message: "Owner photo uploaded successfully", profileImage: owner.profileImage });
  } catch (error) {
    console.error("Error uploading owner photo:", error);
    return res.status(500).json({ message: error.message || "Failed to upload owner photo" });
  }
};

exports.deleteOwnerPhoto = async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id).select("name createdBy");
    if (!organization || !organization.createdBy) {
      return res.status(404).json({ message: "Organization owner not found" });
    }
    const owner = await User.findById(organization.createdBy).setOptions({ skipTenantScope: true });
    if (!owner) {
      return res.status(404).json({ message: "Organization owner not found" });
    }

    deletePublicFileIfExists(owner.profileImage);
    owner.profileImage = undefined;
    await owner.save();

    await logOrgAudit(organization._id, "org_update", req.user.id, `Owner photo removed for "${organization.name}"`);

    return res.json({ message: "Owner photo removed successfully" });
  } catch (error) {
    console.error("Error deleting owner photo:", error);
    return res.status(500).json({ message: error.message || "Failed to delete owner photo" });
  }
};

exports.updateOwner = async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id).select("name createdBy");
    if (!organization || !organization.createdBy) {
      return res.status(404).json({ message: "Organization owner not found" });
    }

    const { name, email, phone, designation, departmentId } = req.body;
    const updatePayload = {};
    if (name !== undefined) updatePayload.name = name;
    if (email !== undefined) updatePayload.email = String(email).trim().toLowerCase();
    if (phone !== undefined) updatePayload.phone = phone;
    if (designation !== undefined) updatePayload.designation = designation;
    if (departmentId !== undefined) updatePayload.departmentId = departmentId || null;

    const owner = await User.findByIdAndUpdate(organization.createdBy, updatePayload, {
      new: true,
      runValidators: true,
      skipTenantScope: true,
    }).select("-password");

    if (!owner) {
      return res.status(404).json({ message: "Organization owner not found" });
    }

    await logOrgAudit(organization._id, "org_update", req.user.id, `Owner details updated for "${organization.name}"`);

    return res.json({ message: "Owner updated successfully", owner });
  } catch (error) {
    console.error("Error updating owner:", error);
    if (error?.code === 11000) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }
    return res.status(500).json({ message: error.message || "Failed to update owner" });
  }
};
