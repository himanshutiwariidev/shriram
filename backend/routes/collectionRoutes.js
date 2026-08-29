const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/collectionController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");

const adminAccess = requireRole("admin", "tenant_admin");

router.get("/",       authMiddleware, adminAccess, ctrl.getAll);
router.post("/",      authMiddleware, adminAccess, ctrl.create);
router.put("/:id",    authMiddleware, adminAccess, ctrl.update);
router.delete("/:id", authMiddleware, adminAccess, ctrl.remove);

module.exports = router;
