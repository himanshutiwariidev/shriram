const asyncHandler = require("../utils/asyncHandler");
const mongoose = require("mongoose");
const path = require("path");
const Expense = require("../models/Expense");
const ExpenseCategory = require("../models/ExpenseCategory");
const { withTenant, POPULATE_SKIP_TENANT } = require("../utils/tenantQuery");

const buildExpenseId = () => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `EXP-${ymd}-${rand}`;
};

const POPULATE_OPTS = { options: POPULATE_SKIP_TENANT };

// ─── Dashboard stats ──────────────────────────────────────────────────────────
exports.getExpenseDashboard = asyncHandler(async (req, res) => {
  const tenantOid = new mongoose.Types.ObjectId(req.tenantId);
  const now = new Date();

  // Accept optional start/end params for date filtering (sent as ISO strings)
  let periodStart = req.query.start ? new Date(req.query.start) : null;
  let periodEnd   = req.query.end   ? new Date(req.query.end)   : null;
  if (!periodStart || Number.isNaN(periodStart.getTime())) {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (!periodEnd || Number.isNaN(periodEnd.getTime())) {
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  const startOfYear  = new Date(periodStart.getFullYear(), 0, 1);
  const last12Months = new Date(periodStart.getFullYear(), periodStart.getMonth() - 11, 1);

  const [totals] = await Expense.aggregate([
    { $match: { tenantId: tenantOid } },
    {
      $group: {
        _id: null,
        totalAll:      { $sum: "$totalAmount" },
        totalMonth:    { $sum: { $cond: [{ $and: [{ $gte: ["$expenseDate", periodStart] }, { $lte: ["$expenseDate", periodEnd] }] }, "$totalAmount", 0] } },
        totalYear:     { $sum: { $cond: [{ $gte: ["$expenseDate", startOfYear] }, "$totalAmount", 0] } },
        pendingAmt:    { $sum: { $cond: [{ $in: ["$status", ["submitted", "pending"]] }, "$totalAmount", 0] } },
        pendingCount:  { $sum: { $cond: [{ $in: ["$status", ["submitted", "pending"]] }, 1, 0] } },
        approvedAmt:   { $sum: { $cond: [{ $eq: ["$status", "approved"] }, "$totalAmount", 0] } },
        paidAmt:       { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$totalAmount", 0] } },
        payrollAmt:    { $sum: { $cond: [{ $eq: ["$source", "payroll"] }, "$totalAmount", 0] } },
        totalCount:    { $sum: 1 },
      },
    },
  ]);

  // Monthly trend (last 12 months)
  const monthlyTrend = await Expense.aggregate([
    { $match: { tenantId: tenantOid, expenseDate: { $gte: last12Months } } },
    {
      $group: {
        _id:   { year: { $year: "$expenseDate" }, month: { $month: "$expenseDate" } },
        total: { $sum: "$totalAmount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const trendData = monthlyTrend.map((m) => ({
    month: `${MONTH_NAMES[m._id.month - 1]} ${m._id.year}`,
    amount: m.total,
    count: m.count,
  }));

  // Category breakdown
  const categoryBreakdown = await Expense.aggregate([
    { $match: { tenantId: tenantOid, expenseDate: { $gte: startOfYear } } },
    { $group: { _id: "$categoryId", total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
    { $limit: 8 },
    {
      $lookup: {
        from: "expensecategories",
        localField: "_id",
        foreignField: "_id",
        as: "cat",
      },
    },
    {
      $project: {
        name:  { $ifNull: [{ $arrayElemAt: ["$cat.name", 0] }, "Uncategorized"] },
        color: { $ifNull: [{ $arrayElemAt: ["$cat.color", 0] }, "#94a3b8"] },
        total: 1,
        count: 1,
      },
    },
  ]);

  // Status distribution
  const statusDist = await Expense.aggregate([
    { $match: { tenantId: tenantOid } },
    { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$totalAmount" } } },
  ]);

  // Recent 5 expenses
  const recent = await Expense.find(withTenant({}, req))
    .sort({ createdAt: -1 })
    .limit(5)
    .populate({ path: "categoryId", select: "name color", ...POPULATE_OPTS })
    .populate({ path: "employeeId", select: "name", ...POPULATE_OPTS });

  res.json({
    totals: totals || {},
    trendData,
    categoryBreakdown,
    statusDist,
    recent,
  });
});

// ─── List with filters & pagination ──────────────────────────────────────────
exports.getExpenses = asyncHandler(async (req, res) => {
  const {
    page = 1, limit = 20, status, categoryId, vendorId, employeeId,
    departmentId, projectId, source, startDate, endDate, search,
  } = req.query;

  const filter = withTenant({}, req);

  if (status) filter.status = status;
  if (categoryId) filter.categoryId = categoryId;
  if (vendorId) filter.vendorId = vendorId;
  if (employeeId) filter.employeeId = employeeId;
  if (departmentId) filter.departmentId = departmentId;
  if (projectId) filter.projectId = projectId;
  if (source) filter.source = source;

  if (startDate || endDate) {
    filter.expenseDate = {};
    if (startDate) filter.expenseDate.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.expenseDate.$lte = end;
    }
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { expenseId: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .sort({ expenseDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate({ path: "categoryId",   select: "name color icon", ...POPULATE_OPTS })
      .populate({ path: "vendorId",     select: "name",            ...POPULATE_OPTS })
      .populate({ path: "employeeId",   select: "name email",      ...POPULATE_OPTS })
      .populate({ path: "departmentId", select: "name",            ...POPULATE_OPTS }),
    Expense.countDocuments(filter),
  ]);

  res.json({
    expenses,
    pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) },
  });
});

// ─── Single expense ──────────────────────────────────────────────────────────
exports.getExpenseById = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne(withTenant({ _id: req.params.id }, req))
    .populate({ path: "categoryId",   select: "name color icon",              ...POPULATE_OPTS })
    .populate({ path: "vendorId",     select: "name email phone",             ...POPULATE_OPTS })
    .populate({ path: "employeeId",   select: "name email profileImage",      ...POPULATE_OPTS })
    .populate({ path: "departmentId", select: "name",                         ...POPULATE_OPTS })
    .populate({ path: "projectId",    select: "companyName domain",           ...POPULATE_OPTS })
    .populate({ path: "clientId",     select: "businessName",                 ...POPULATE_OPTS })
    .populate({ path: "createdBy",    select: "name",                         ...POPULATE_OPTS })
    .populate({ path: "approvalHistory.by", select: "name",                   ...POPULATE_OPTS });

  if (!expense) return res.status(404).json({ message: "Expense not found" });
  res.json({ expense });
});

// ─── Create expense ──────────────────────────────────────────────────────────
exports.createExpense = asyncHandler(async (req, res) => {
  const {
    title, description, categoryId, vendorId, employeeId, departmentId,
    clientId, projectId, expenseType, amount, tax, currency, paymentMethod,
    expenseDate, dueDate, status, notes, isRecurring,
  } = req.body;

  if (!title?.trim()) return res.status(400).json({ message: "Title is required" });
  if (!amount || Number(amount) < 0) return res.status(400).json({ message: "Amount is required" });
  if (!expenseDate) return res.status(400).json({ message: "Expense date is required" });

  const parsedAmount = Number(amount) || 0;
  const parsedTax = Number(tax) || 0;
  const totalAmount = Number((parsedAmount + parsedTax).toFixed(2));

  const expense = await Expense.create(
    withTenant(
      {
        expenseId: buildExpenseId(),
        title: title.trim(),
        description,
        categoryId: categoryId || undefined,
        vendorId: vendorId || undefined,
        employeeId: employeeId || undefined,
        departmentId: departmentId || undefined,
        clientId: clientId || undefined,
        projectId: projectId || undefined,
        expenseType,
        amount: parsedAmount,
        tax: parsedTax,
        totalAmount,
        currency: currency || "INR",
        paymentMethod: paymentMethod || "Cash",
        expenseDate: new Date(expenseDate),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status: status || "draft",
        notes,
        isRecurring: Boolean(isRecurring),
        source: "manual",
        createdBy: req.user?.id,
      },
      req
    )
  );

  res.status(201).json({ expense });
});

// ─── Update expense ──────────────────────────────────────────────────────────
exports.updateExpense = asyncHandler(async (req, res) => {
  const existing = await Expense.findOne(withTenant({ _id: req.params.id }, req));
  if (!existing) return res.status(404).json({ message: "Expense not found" });

  if (existing.source === "payroll") {
    return res.status(403).json({ message: "Payroll-generated expenses cannot be edited" });
  }

  const {
    title, description, categoryId, vendorId, employeeId, departmentId,
    clientId, projectId, expenseType, amount, tax, currency, paymentMethod,
    expenseDate, dueDate, status, notes,
  } = req.body;

  const parsedAmount = amount !== undefined ? Number(amount) : existing.amount;
  const parsedTax = tax !== undefined ? Number(tax) : existing.tax;
  const totalAmount = Number((parsedAmount + parsedTax).toFixed(2));

  const updated = await Expense.findOneAndUpdate(
    withTenant({ _id: req.params.id }, req),
    {
      $set: {
        ...(title && { title: title.trim() }),
        ...(description !== undefined && { description }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(vendorId !== undefined && { vendorId: vendorId || null }),
        ...(employeeId !== undefined && { employeeId: employeeId || null }),
        ...(departmentId !== undefined && { departmentId: departmentId || null }),
        ...(clientId !== undefined && { clientId: clientId || null }),
        ...(projectId !== undefined && { projectId: projectId || null }),
        ...(expenseType !== undefined && { expenseType }),
        amount: parsedAmount,
        tax: parsedTax,
        totalAmount,
        ...(currency && { currency }),
        ...(paymentMethod && { paymentMethod }),
        ...(expenseDate && { expenseDate: new Date(expenseDate) }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
    },
    { new: true }
  );

  res.json({ expense: updated });
});

// ─── Delete expense ──────────────────────────────────────────────────────────
exports.deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne(withTenant({ _id: req.params.id }, req));
  if (!expense) return res.status(404).json({ message: "Expense not found" });

  if (expense.source === "payroll") {
    return res.status(403).json({ message: "Payroll-generated expenses cannot be deleted" });
  }

  await Expense.findOneAndDelete(withTenant({ _id: req.params.id }, req));
  res.json({ message: "Expense deleted" });
});

// ─── Approve / reject / mark paid ────────────────────────────────────────────
exports.updateExpenseStatus = asyncHandler(async (req, res) => {
  const { status, comment } = req.body;
  const ALLOWED_TRANSITIONS = {
    draft:     ["submitted"],
    submitted: ["pending", "approved", "rejected"],
    pending:   ["approved", "rejected"],
    approved:  ["paid", "rejected"],
    rejected:  ["submitted"],
    paid:      [],
  };

  const expense = await Expense.findOne(withTenant({ _id: req.params.id }, req));
  if (!expense) return res.status(404).json({ message: "Expense not found" });

  const allowed = ALLOWED_TRANSITIONS[expense.status] || [];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: `Cannot transition from "${expense.status}" to "${status}"` });
  }

  expense.status = status;
  expense.approvalHistory.push({
    action: status,
    by: req.user?.id,
    comment: comment || "",
    at: new Date(),
  });

  await expense.save();
  res.json({ expense });
});

// ─── Upload attachment ────────────────────────────────────────────────────────
exports.uploadAttachment = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne(withTenant({ _id: req.params.id }, req));
  if (!expense) return res.status(404).json({ message: "Expense not found" });

  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  const attachment = {
    filename: req.file.originalname,
    url: `/uploads/expense-attachments/${req.file.filename}`,
    mimetype: req.file.mimetype,
    size: req.file.size,
  };

  expense.attachments.push(attachment);
  await expense.save();
  res.json({ attachment, attachments: expense.attachments });
});

// ─── Reports ──────────────────────────────────────────────────────────────────
exports.getExpenseReport = asyncHandler(async (req, res) => {
  const {
    startDate, endDate, categoryId, departmentId, employeeId,
    status, groupBy = "month",
  } = req.query;

  const tenantOid = new mongoose.Types.ObjectId(req.tenantId);
  const match = { tenantId: tenantOid };

  if (startDate || endDate) {
    match.expenseDate = {};
    if (startDate) match.expenseDate.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      match.expenseDate.$lte = end;
    }
  }

  if (categoryId) match.categoryId = new mongoose.Types.ObjectId(categoryId);
  if (departmentId) match.departmentId = new mongoose.Types.ObjectId(departmentId);
  if (employeeId) match.employeeId = new mongoose.Types.ObjectId(employeeId);
  if (status) match.status = status;

  let groupStage;
  if (groupBy === "category") {
    groupStage = { $group: { _id: "$categoryId", total: { $sum: "$totalAmount" }, count: { $sum: 1 } } };
  } else if (groupBy === "department") {
    groupStage = { $group: { _id: "$departmentId", total: { $sum: "$totalAmount" }, count: { $sum: 1 } } };
  } else if (groupBy === "employee") {
    groupStage = { $group: { _id: "$employeeId", total: { $sum: "$totalAmount" }, count: { $sum: 1 } } };
  } else if (groupBy === "status") {
    groupStage = { $group: { _id: "$status", total: { $sum: "$totalAmount" }, count: { $sum: 1 } } };
  } else {
    // default: month
    groupStage = {
      $group: {
        _id:   { year: { $year: "$expenseDate" }, month: { $month: "$expenseDate" } },
        total: { $sum: "$totalAmount" },
        count: { $sum: 1 },
      },
    };
  }

  const [summary] = await Expense.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 }, avg: { $avg: "$totalAmount" } } },
  ]);

  const grouped = await Expense.aggregate([
    { $match: match },
    groupStage,
    { $sort: { total: -1 } },
  ]);

  const rawExpenses = await Expense.find(withTenant(
    {
      ...(match.expenseDate && { expenseDate: match.expenseDate }),
      ...(categoryId && { categoryId }),
      ...(departmentId && { departmentId }),
      ...(employeeId && { employeeId }),
      ...(status && { status }),
    },
    req
  ))
    .sort({ expenseDate: -1 })
    .limit(500)
    .populate({ path: "categoryId",   select: "name color", ...POPULATE_OPTS })
    .populate({ path: "employeeId",   select: "name",       ...POPULATE_OPTS })
    .populate({ path: "departmentId", select: "name",       ...POPULATE_OPTS });

  res.json({ summary: summary || { total: 0, count: 0, avg: 0 }, grouped, expenses: rawExpenses });
});
