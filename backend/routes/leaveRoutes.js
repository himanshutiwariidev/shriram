const express = require("express");

const {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  updateLeaveStatus,
} = require("../controllers/leaveController");

const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");
const checkFeature = require("../middleware/checkFeature");

const router = express.Router();

router.post("/", authMiddleware, checkFeature("leaves"), applyLeave);
router.get("/my", authMiddleware, checkFeature("leaves"), getMyLeaves);
router.get("/", authMiddleware, checkFeature("leaves"), requireRole("admin", "hr"), getAllLeaves);
router.put("/:id/status", authMiddleware, checkFeature("leaves"), requireRole("admin", "hr"), updateLeaveStatus);

module.exports = router;
