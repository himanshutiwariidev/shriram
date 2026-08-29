const Holiday = require("../models/Holiday");
const Shift = require("../models/Shift");
const User = require("../models/User");
const { withTenant, POPULATE_SKIP_TENANT } = require("../utils/tenantQuery");

// ─── HOLIDAYS ────────────────────────────────────────────────────────────────

exports.getHolidays = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const holidays = await Holiday.find(withTenant({ year }, req))
      .populate({ path: "branchId", select: "name", options: POPULATE_SKIP_TENANT })
      .sort({ date: 1 });
    return res.json({ holidays });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to fetch holidays" });
  }
};

exports.createHoliday = async (req, res) => {
  try {
    const { name, date, branchId, type } = req.body;
    if (!name || !date) return res.status(400).json({ message: "name and date are required" });
    const d = new Date(date);
    const holiday = await Holiday.create({
      tenantId: req.tenantId,
      name, date: d, branchId: branchId || null,
      type: type || "public",
      year: d.getFullYear(),
    });
    return res.status(201).json({ holiday });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create holiday" });
  }
};

exports.updateHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findOneAndUpdate(
      withTenant({ _id: req.params.id }, req),
      req.body,
      { new: true }
    );
    if (!holiday) return res.status(404).json({ message: "Holiday not found" });
    return res.json({ holiday });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update holiday" });
  }
};

exports.deleteHoliday = async (req, res) => {
  try {
    await Holiday.findOneAndDelete(withTenant({ _id: req.params.id }, req));
    return res.json({ message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete holiday" });
  }
};

// ─── SHIFTS ──────────────────────────────────────────────────────────────────

exports.getShifts = async (req, res) => {
  try {
    const shifts = await Shift.find(withTenant({}, req)).sort({ startHour: 1 });
    return res.json({ shifts });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to fetch shifts" });
  }
};

exports.createShift = async (req, res) => {
  try {
    const { name, startHour, startMinute, endHour, endMinute } = req.body;
    if (!name || startHour === undefined || endHour === undefined) {
      return res.status(400).json({ message: "name, startHour, endHour are required" });
    }
    const shift = await Shift.create({
      tenantId: req.tenantId, name, startHour, startMinute: startMinute || 0, endHour, endMinute: endMinute || 0,
    });
    return res.status(201).json({ shift });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create shift" });
  }
};

exports.updateShift = async (req, res) => {
  try {
    const shift = await Shift.findOneAndUpdate(withTenant({ _id: req.params.id }, req), req.body, { new: true });
    if (!shift) return res.status(404).json({ message: "Shift not found" });
    return res.json({ shift });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update shift" });
  }
};

exports.deleteShift = async (req, res) => {
  try {
    await Shift.findOneAndDelete(withTenant({ _id: req.params.id }, req));
    // Unassign shift from users who had it
    await User.updateMany(withTenant({ shiftId: req.params.id }, req), { $unset: { shiftId: 1 } });
    return res.json({ message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete shift" });
  }
};

// ─── SHIFT ASSIGNMENT ────────────────────────────────────────────────────────

// Bulk-assign a shift to one or more employees
exports.assignShift = async (req, res) => {
  try {
    const { userIds, shiftId } = req.body;
    if (!userIds?.length) return res.status(400).json({ message: "userIds required" });
    await User.updateMany(
      withTenant({ _id: { $in: userIds } }, req),
      { shiftId: shiftId || null }
    );
    return res.json({ message: "Shift assigned" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to assign shift" });
  }
};

// Get shift assigned to the calling user (for employee self-service)
exports.getMyShift = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("shiftId name")
      .populate({ path: "shiftId", options: POPULATE_SKIP_TENANT })
      .setOptions({ skipTenantScope: true });
    return res.json({ shift: user?.shiftId || null });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to fetch shift" });
  }
};
