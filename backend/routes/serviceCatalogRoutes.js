const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");
const {
  getCatalog,
  createService,
  updateService,
  deleteService,
  getTenantServices,
  setTenantServices,
} = require("../controllers/serviceCatalogController");

// All routes here are superadmin-only
router.use(authMiddleware, requireRole("superadmin"));

// Global catalog management
router.get("/services", getCatalog);
router.post("/services", createService);
router.put("/services/:key", updateService);
router.delete("/services/:key", deleteService);

// Per-tenant access control (reuses the /:id pattern from organizationRoutes)
router.get("/organizations/:id/services", getTenantServices);
router.put("/organizations/:id/services", setTenantServices);

module.exports = router;
