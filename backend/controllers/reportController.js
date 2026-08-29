const mongoose = require("mongoose");
const SavedReport = require("../models/SavedReport");
const Proposal = require("../models/Proposal");
const Task = require("../models/Task");
const Attendance = require("../models/Attendance");
const Expense = require("../models/Expense");
const Leave = require("../models/Leave");
const { withTenant, POPULATE_SKIP_TENANT } = require("../utils/tenantQuery");

// ------------------------------------------------------------------
// Domain runners — each returns { columns: string[], rows: object[] }
// ------------------------------------------------------------------

async function runRevenue(tenantId, filters) {
  const { startDate, endDate } = filters;
  const match = { tenantId: new mongoose.Types.ObjectId(tenantId) };

  const proposals = await Proposal.aggregate([
    { $match: match },
    { $unwind: { path: "$payments", preserveNullAndEmptyArrays: false } },
    ...(startDate || endDate
      ? [{ $match: { "payments.paymentDate": {
          ...(startDate ? { $gte: new Date(startDate) } : {}),
          ...(endDate ? { $lte: new Date(endDate) } : {}),
        } } }]
      : []),
    { $lookup: { from: "clients", localField: "clientId", foreignField: "_id", as: "client" } },
    { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },
    { $project: {
        proposalTitle: "$title",
        clientName: { $ifNull: ["$client.clientName", "Unknown"] },
        salesPerson: { $ifNull: ["$client.salesPerson", "—"] },
        amount: "$payments.amount",
        paymentDate: "$payments.paymentDate",
        paymentMethod: "$payments.method",
    }},
    { $sort: { paymentDate: -1 } },
  ]);

  return {
    columns: ["Date", "Client", "Proposal", "Salesperson", "Amount (₹)", "Method"],
    rows: proposals.map((p) => ({
      Date: p.paymentDate ? new Date(p.paymentDate).toLocaleDateString("en-IN") : "—",
      Client: p.clientName,
      Proposal: p.proposalTitle,
      Salesperson: p.salesPerson,
      "Amount (₹)": p.amount?.toFixed(2) || "0.00",
      Method: p.paymentMethod || "—",
    })),
  };
}

async function runTasks(tenantId, filters) {
  const { startDate, endDate, userId } = filters;
  const match = { tenantId: new mongoose.Types.ObjectId(tenantId) };
  if (userId) match.assignedTo = new mongoose.Types.ObjectId(userId);
  if (startDate || endDate) {
    match.dueDate = {};
    if (startDate) match.dueDate.$gte = new Date(startDate);
    if (endDate) match.dueDate.$lte = new Date(endDate);
  }

  const tasks = await Task.find(match)
    .populate({ path: "assignedTo", select: "name", options: POPULATE_SKIP_TENANT })
    .sort({ dueDate: -1 })
    .lean();

  return {
    columns: ["Title", "Assigned To", "Status", "Priority", "Due Date"],
    rows: tasks.map((t) => ({
      Title: t.title,
      "Assigned To": t.assignedTo?.name || "—",
      Status: t.status,
      Priority: t.priority || "—",
      "Due Date": t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-IN") : "—",
    })),
  };
}

async function runAttendance(tenantId, filters) {
  const { startDate, endDate, userId } = filters;
  const match = { tenantId: new mongoose.Types.ObjectId(tenantId) };
  if (userId) match.userId = new mongoose.Types.ObjectId(userId);
  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = new Date(startDate);
    if (endDate) match.date.$lte = new Date(endDate);
  }

  const records = await Attendance.find(match)
    .populate({ path: "userId", select: "name", options: POPULATE_SKIP_TENANT })
    .sort({ date: -1 })
    .lean();

  return {
    columns: ["Date", "Employee", "Status", "Check In", "Check Out"],
    rows: records.map((r) => ({
      Date: new Date(r.date).toLocaleDateString("en-IN"),
      Employee: r.userId?.name || "—",
      Status: r.status,
      "Check In": r.checkIn ? new Date(r.checkIn).toLocaleTimeString("en-IN") : "—",
      "Check Out": r.checkOut ? new Date(r.checkOut).toLocaleTimeString("en-IN") : "—",
    })),
  };
}

async function runExpenses(tenantId, filters) {
  const { startDate, endDate, categoryId } = filters;
  const match = { tenantId: new mongoose.Types.ObjectId(tenantId) };
  if (categoryId) match.category = new mongoose.Types.ObjectId(categoryId);
  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = new Date(startDate);
    if (endDate) match.date.$lte = new Date(endDate);
  }

  const expenses = await Expense.find(match)
    .populate({ path: "category", select: "name", options: POPULATE_SKIP_TENANT })
    .populate({ path: "submittedBy", select: "name", options: POPULATE_SKIP_TENANT })
    .sort({ date: -1 })
    .lean();

  return {
    columns: ["Date", "Description", "Category", "Amount (₹)", "Submitted By", "Status"],
    rows: expenses.map((e) => ({
      Date: e.date ? new Date(e.date).toLocaleDateString("en-IN") : "—",
      Description: e.description || e.title || "—",
      Category: e.category?.name || "—",
      "Amount (₹)": e.amount?.toFixed(2) || "0.00",
      "Submitted By": e.submittedBy?.name || "—",
      Status: e.status || "—",
    })),
  };
}

async function runLeaves(tenantId, filters) {
  const { startDate, endDate, userId, status } = filters;
  const match = { tenantId: new mongoose.Types.ObjectId(tenantId) };
  if (userId) match.userId = new mongoose.Types.ObjectId(userId);
  if (status) match.status = status;
  if (startDate || endDate) {
    match.startDate = {};
    if (startDate) match.startDate.$gte = new Date(startDate);
    if (endDate) match.startDate.$lte = new Date(endDate);
  }

  const leaves = await Leave.find(match)
    .populate({ path: "userId", select: "name", options: POPULATE_SKIP_TENANT })
    .sort({ startDate: -1 })
    .lean();

  return {
    columns: ["Employee", "Type", "From", "To", "Days", "Status"],
    rows: leaves.map((l) => {
      const days = l.startDate && l.endDate
        ? Math.ceil((new Date(l.endDate) - new Date(l.startDate)) / 86400000) + 1
        : "—";
      return {
        Employee: l.userId?.name || "—",
        Type: l.leaveType || l.type || "—",
        From: l.startDate ? new Date(l.startDate).toLocaleDateString("en-IN") : "—",
        To: l.endDate ? new Date(l.endDate).toLocaleDateString("en-IN") : "—",
        Days: days,
        Status: l.status || "—",
      };
    }),
  };
}

// ------------------------------------------------------------------
// Controller methods
// ------------------------------------------------------------------

exports.runReport = async (req, res) => {
  try {
    const { domain, filters = {} } = req.body;
    let result;
    switch (domain) {
      case "revenue":    result = await runRevenue(req.tenantId, filters);    break;
      case "tasks":      result = await runTasks(req.tenantId, filters);      break;
      case "attendance": result = await runAttendance(req.tenantId, filters); break;
      case "expenses":   result = await runExpenses(req.tenantId, filters);   break;
      case "leaves":     result = await runLeaves(req.tenantId, filters);     break;
      default: return res.status(400).json({ message: "Unknown report domain" });
    }
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to run report" });
  }
};

exports.getSavedReports = async (req, res) => {
  try {
    const reports = await SavedReport.find(withTenant({}, req)).sort({ createdAt: -1 });
    return res.json({ reports });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to fetch saved reports" });
  }
};

exports.saveReport = async (req, res) => {
  try {
    const { name, domain, filters } = req.body;
    const report = await SavedReport.create({
      tenantId: req.tenantId,
      name, domain, filters: filters || {},
      createdBy: req.user.id,
    });
    return res.status(201).json({ report });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to save report" });
  }
};

exports.deleteSavedReport = async (req, res) => {
  try {
    await SavedReport.findOneAndDelete(withTenant({ _id: req.params.id }, req));
    return res.json({ message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete report" });
  }
};
