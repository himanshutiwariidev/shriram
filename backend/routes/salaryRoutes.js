const express = require("express");

const { paySalary, getMySalarySlips } = require("../controllers/salaryController");
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");
const { requireRole } = require("../middleware/roleAccess");
const checkFeature = require("../middleware/checkFeature");

const router = express.Router();

router.get("/my-slips", authMiddleware, checkFeature("payroll"), getMySalarySlips);
router.post("/pay/:id", authMiddleware, checkFeature("payroll"), requireRole("admin", "hr"), paySalary);

module.exports = router;
