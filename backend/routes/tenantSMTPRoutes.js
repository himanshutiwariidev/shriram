const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/tenantSMTPController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole }  = require("../middleware/roleAccess");

const adminOnly = requireRole("admin", "tenant_admin");

router.get("/",     authMiddleware, adminOnly, ctrl.get);
router.post("/",    authMiddleware, adminOnly, ctrl.save);
router.delete("/",  authMiddleware, adminOnly, ctrl.remove);
router.post("/test",authMiddleware, adminOnly, ctrl.test);

module.exports = router;
