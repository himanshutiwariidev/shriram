const express = require("express");
const router = express.Router();

const {
  getOrganizations,
  getOrganizationById,
  suspendOrganization,
  activateOrganization,
  deleteOrganization,
  createTenant,
  updateOrganization,
  getFeatureCatalog,
  getOrganizationFeatures,
  updateOrganizationFeatures,
  getOrganizationUsers,
  getOrganizationBranches,
  getOrganizationDepartments,
  getPlans,
  uploadLogo,
  deleteLogo,
  uploadFavicon,
  deleteFavicon,
  getOrganizationAuditLogs,
  uploadOwnerPhoto,
  deleteOwnerPhoto,
  updateOwner,
} = require("../controllers/organizationController");

const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");
const { createTenantValidator, updateOrganizationValidator } = require("../middleware/validator");
const uploadBranding = require("../middleware/uploadBranding");
const uploadOwnerPhotoMiddleware = require("../middleware/uploadOwnerPhoto");

// ── Super Admin only — platform-level, not tenant-scoped ───────────────────
router.use(authMiddleware, requireRole("superadmin"));

// Must come before "/:id" so "meta" isn't parsed as an organization id.
router.get("/meta/feature-catalog", getFeatureCatalog);
router.get("/meta/plans", getPlans);

router.get("/", getOrganizations);
router.post("/", createTenantValidator, createTenant);
router.get("/:id", getOrganizationById);
router.put("/:id", updateOrganizationValidator, updateOrganization);
router.patch("/:id/suspend", suspendOrganization);
router.patch("/:id/activate", activateOrganization);
router.delete("/:id", deleteOrganization);

router.get("/:id/features", getOrganizationFeatures);
router.put("/:id/features", updateOrganizationFeatures);

router.get("/:id/users", getOrganizationUsers);
router.get("/:id/branches", getOrganizationBranches);
router.get("/:id/departments", getOrganizationDepartments);

router.post("/:id/logo", uploadBranding.single("logo"), uploadLogo);
router.delete("/:id/logo", deleteLogo);
router.post("/:id/favicon", uploadBranding.single("favicon"), uploadFavicon);
router.delete("/:id/favicon", deleteFavicon);

router.get("/:id/audit-logs", getOrganizationAuditLogs);

router.post("/:id/owner-photo", uploadOwnerPhotoMiddleware.single("photo"), uploadOwnerPhoto);
router.delete("/:id/owner-photo", deleteOwnerPhoto);
router.put("/:id/owner", updateOwner);

module.exports = router;
