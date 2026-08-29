const Leave = require("../models/Leave");
const User = require("../models/User");
const { withTenant, POPULATE_SKIP_TENANT } = require("../utils/tenantQuery");
const { notifyUser, notifyUsers } = require("../utils/notificationHelper");
const { checkAvailable, deductLeave } = require("./leavePolicyController");

const calcDays = (from, to) =>
  Math.ceil((new Date(to) - new Date(from)) / 86400000) + 1;

exports.applyLeave = async (req, res) => {
  try {
    const { fromDate, toDate, reason, leaveType } = req.body;

    if (!fromDate || !toDate || !reason) {
      return res.status(400).json({ message: "From date, to date and reason are required" });
    }

    if (new Date(fromDate) > new Date(toDate)) {
      return res.status(400).json({ message: "From date cannot be after to date" });
    }

    // Check leave balance — auto-reject when zero
    const days = calcDays(fromDate, toDate);
    const lt = leaveType || "casual";
    const hasBalance = await checkAvailable(req.tenantId, req.user.id, lt, days, req);
    if (!hasBalance) {
      return res.status(400).json({
        message: `Insufficient ${lt} leave balance. You do not have enough leave days remaining.`,
      });
    }

    const leave = await Leave.create({
      tenantId: req.tenantId,
      userId: req.user.id,
      fromDate, toDate, reason,
      leaveType: lt,
    });

    const approvers = await User.find(withTenant({ role: { $in: ["admin", "hr"] } }, req)).select("_id");
    const requester = await User.findById(req.user.id).select("name").setOptions({ skipTenantScope: true });
    await notifyUsers(
      req.tenantId,
      approvers.map((u) => u._id),
      "leave",
      "New leave request",
      `${requester?.name || "An employee"} requested ${lt} leave from ${new Date(fromDate).toLocaleDateString()} to ${new Date(toDate).toLocaleDateString()}`,
      "/dashboard?tab=attendance",
      { leaveId: leave._id }
    );

    return res.status(201).json({ message: "Leave request submitted", leave });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to submit leave request" });
  }
};

exports.getMyLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find(withTenant({ userId: req.user.id }, req)).sort({ createdAt: -1 });
    return res.json(leaves);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch leave requests" });
  }
};

exports.getAllLeaves = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const leaves = await Leave.find(withTenant(query, req))
      .populate({ path: "userId", select: "name email role", options: POPULATE_SKIP_TENANT })
      .sort({ createdAt: -1 });
    return res.json(leaves);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch leave requests" });
  }
};

exports.updateLeaveStatus = async (req, res) => {
  try {
    const { status, adminComment } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be approved or rejected" });
    }

    const leave = await Leave.findOne(withTenant({ _id: req.params.id }, req))
      .populate({ path: "userId", select: "name email role", options: POPULATE_SKIP_TENANT });

    if (!leave) return res.status(404).json({ message: "Leave request not found" });

    // Deduct from balance when approving
    if (status === "approved" && leave.status !== "approved") {
      const days = calcDays(leave.fromDate, leave.toDate);
      await deductLeave(req.tenantId, leave.userId._id, leave.leaveType, days, req);
    }

    leave.status = status;
    leave.adminComment = adminComment;
    leave.reviewedBy = req.user.id;
    leave.reviewedAt = new Date();
    await leave.save();

    if (leave.userId?._id) {
      await notifyUser(
        req.tenantId,
        leave.userId._id,
        "leave",
        `Leave request ${status}`,
        `Your leave request from ${new Date(leave.fromDate).toLocaleDateString()} to ${new Date(leave.toDate).toLocaleDateString()} was ${status}${adminComment ? `: ${adminComment}` : ""}`,
        "/dashboard?tab=attendance",
        { leaveId: leave._id }
      );
    }

    return res.json({ message: `Leave request ${status}`, leave });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to update leave request" });
  }
};
