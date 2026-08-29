const express = require("express");
const router  = express.Router();
const { getSummary, upsertTarget, deleteTarget } = require("../controllers/salesTargetController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");

// Both admin and sales can read summaries (sales role filtered to own data on the frontend)
router.get("/summary", authMiddleware, requireRole("admin", "sales", "tenant_admin"), getSummary);

// Only admin can create/update/delete targets
router.post(  "/",    authMiddleware, requireRole("admin", "tenant_admin"), upsertTarget);
router.delete("/:id", authMiddleware, requireRole("admin", "tenant_admin"), deleteTarget);

module.exports = router;
