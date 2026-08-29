const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");
const { getPolicies, upsertPolicy, getMyBalance, getAllBalances, adjustBalance } = require("../controllers/leavePolicyController");

router.get("/policies", authMiddleware, getPolicies);
router.post("/policies", authMiddleware, requireRole("admin", "hr"), upsertPolicy);
router.get("/my-balance", authMiddleware, getMyBalance);
router.get("/balances", authMiddleware, requireRole("admin", "hr"), getAllBalances);
router.post("/balances/adjust", authMiddleware, requireRole("admin", "hr"), adjustBalance);

module.exports = router;
