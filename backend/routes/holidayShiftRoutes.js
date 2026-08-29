const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");
const {
  getHolidays, createHoliday, updateHoliday, deleteHoliday,
  getShifts, createShift, updateShift, deleteShift,
  assignShift, getMyShift,
} = require("../controllers/holidayShiftController");

// ── Holidays — all staff can view, admin manages
router.get("/holidays", authMiddleware, getHolidays);
router.post("/holidays", authMiddleware, adminOnly, createHoliday);
router.put("/holidays/:id", authMiddleware, adminOnly, updateHoliday);
router.delete("/holidays/:id", authMiddleware, adminOnly, deleteHoliday);

// ── Shifts — all staff can view, admin manages + assigns
router.get("/shifts", authMiddleware, getShifts);
router.post("/shifts", authMiddleware, adminOnly, createShift);
router.put("/shifts/:id", authMiddleware, adminOnly, updateShift);
router.delete("/shifts/:id", authMiddleware, adminOnly, deleteShift);
router.post("/shifts/assign", authMiddleware, adminOnly, assignShift);
router.get("/my-shift", authMiddleware, getMyShift);

module.exports = router;
