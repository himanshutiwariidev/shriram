const attendanceService = require("../services/attendanceService");

const handleError = (res, error) => {
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({ message: error.message || "Internal server error" });
};

exports.getAttendance = async (req, res) => {
  try {
    const result = await attendanceService.getAttendanceList({ ...req.query, tenantId: req.tenantId });
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getTodayAttendance = async (req, res) => {
  try {
    const result = await attendanceService.getTodayAttendance({ ...req.query, tenantId: req.tenantId });
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getAttendanceDashboard = async (req, res) => {
  try {
    const result = await attendanceService.getAttendanceDashboard({ ...req.query, tenantId: req.tenantId });
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.getAttendanceByUser = async (req, res) => {
  try {
    const requestedUserId = req.params.userId;

    // Users can only read their own records, admins can read any user.
    if (req.user.role !== "admin" && req.user.id !== requestedUserId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const result = await attendanceService.getAttendanceByUser(requestedUserId, { ...req.query, tenantId: req.tenantId });
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
};

exports.exportAttendanceExcel = async (req, res) => {
  try {
    const fileData = await attendanceService.exportAttendanceWorkbookBuffer({ ...req.query, tenantId: req.tenantId });
    const dateStamp = new Date().toISOString().slice(0, 10);

    res.setHeader("Content-Type", fileData.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=attendance-${dateStamp}.${fileData.extension}`
    );

    return res.send(fileData.buffer);
  } catch (error) {
    return handleError(res, error);
  }
};
