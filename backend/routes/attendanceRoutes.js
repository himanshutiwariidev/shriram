const express = require("express");

const {
  getAttendance,
  getAttendanceByUser,
  getTodayAttendance,
  getAttendanceDashboard,
  exportAttendanceExcel,
} = require("../controllers/attendanceController");

const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");
const checkFeature = require("../middleware/checkFeature");

const router = express.Router();

router.get("/today", authMiddleware, checkFeature("attendance"), requireRole("admin", "hr"), getTodayAttendance);
router.get("/dashboard", authMiddleware, checkFeature("attendance"), requireRole("admin", "hr"), getAttendanceDashboard);
router.get("/export/excel", authMiddleware, checkFeature("attendance"), requireRole("admin", "hr"), exportAttendanceExcel);
router.get("/", authMiddleware, checkFeature("attendance"), requireRole("admin", "hr"), getAttendance);
router.get("/:userId", authMiddleware, checkFeature("attendance"), getAttendanceByUser);

module.exports = router;
