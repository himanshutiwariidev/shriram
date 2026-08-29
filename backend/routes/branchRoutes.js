const express = require("express");
const router = express.Router();

const { createBranch, getBranches, updateBranch, deleteBranch } = require("../controllers/branchController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");
const { branchValidator } = require("../middleware/validator");
const checkFeature = require("../middleware/checkFeature");
const checkPlanLimit = require("../middleware/checkPlanLimit");

router.get("/", authMiddleware, checkFeature("branches"), requireRole("admin", "hr"), getBranches);
router.post("/", authMiddleware, checkFeature("branches"), requireRole("admin"), checkPlanLimit("branches"), branchValidator, createBranch);
router.put("/:id", authMiddleware, checkFeature("branches"), requireRole("admin"), branchValidator, updateBranch);
router.delete("/:id", authMiddleware, checkFeature("branches"), requireRole("admin"), deleteBranch);

module.exports = router;
