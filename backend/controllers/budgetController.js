const asyncHandler = require("../utils/asyncHandler");
const Budget = require("../models/Budget");
const Expense = require("../models/Expense");
const { withTenant, POPULATE_SKIP_TENANT } = require("../utils/tenantQuery");
const mongoose = require("mongoose");

exports.getBudgets = asyncHandler(async (req, res) => {
  const budgets = await Budget.find(withTenant({ isActive: true }, req))
    .sort({ year: -1, month: -1 })
    .populate({ path: "categoryId", select: "name color icon", options: POPULATE_SKIP_TENANT })
    .populate({ path: "departmentId", select: "name", options: POPULATE_SKIP_TENANT })
    .populate({ path: "projectId", select: "companyName domain", options: POPULATE_SKIP_TENANT });

  const tenantObjectId = new mongoose.Types.ObjectId(req.tenantId);
  const now = new Date();

  const enriched = await Promise.all(
    budgets.map(async (b) => {
      const bObj = b.toObject();

      // Build expense match for this budget scope + period
      const match = { tenantId: tenantObjectId, status: { $in: ["approved", "paid"] } };

      if (b.period === "monthly" && b.month) {
        const start = new Date(b.year, b.month - 1, 1);
        const end = new Date(b.year, b.month, 0, 23, 59, 59);
        match.expenseDate = { $gte: start, $lte: end };
      } else {
        const start = new Date(b.year, 0, 1);
        const end = new Date(b.year, 11, 31, 23, 59, 59);
        match.expenseDate = { $gte: start, $lte: end };
      }

      if (b.categoryId) match.categoryId = new mongoose.Types.ObjectId(b.categoryId._id || b.categoryId);
      if (b.departmentId) match.departmentId = new mongoose.Types.ObjectId(b.departmentId._id || b.departmentId);
      if (b.projectId) match.projectId = new mongoose.Types.ObjectId(b.projectId._id || b.projectId);
      if (b.clientId) match.clientId = new mongoose.Types.ObjectId(b.clientId);

      const [agg] = await Expense.aggregate([
        { $match: match },
        { $group: { _id: null, spent: { $sum: "$totalAmount" } } },
      ]);

      bObj.spent = agg?.spent || 0;
      bObj.remaining = Math.max(0, b.amount - bObj.spent);
      bObj.usagePercent = b.amount > 0 ? Math.min(100, Math.round((bObj.spent / b.amount) * 100)) : 0;
      return bObj;
    })
  );

  res.json({ budgets: enriched });
});

exports.createBudget = asyncHandler(async (req, res) => {
  const { name, period, year, month, amount, categoryId, departmentId, projectId, clientId, notes } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "Budget name is required" });
  if (!period) return res.status(400).json({ message: "Period (monthly/yearly) is required" });
  if (!year) return res.status(400).json({ message: "Year is required" });
  if (!amount || Number(amount) <= 0) return res.status(400).json({ message: "Budget amount must be greater than 0" });
  if (period === "monthly" && !month) return res.status(400).json({ message: "Month is required for monthly budgets" });

  const budget = await Budget.create(
    withTenant({ name: name.trim(), period, year: Number(year), month: month ? Number(month) : undefined, amount: Number(amount), categoryId: categoryId || undefined, departmentId: departmentId || undefined, projectId: projectId || undefined, clientId: clientId || undefined, notes }, req)
  );
  res.status(201).json({ budget });
});

exports.updateBudget = asyncHandler(async (req, res) => {
  const { name, period, year, month, amount, categoryId, departmentId, projectId, clientId, notes, isActive } = req.body;
  const budget = await Budget.findOneAndUpdate(
    withTenant({ _id: req.params.id }, req),
    { $set: { ...(name && { name }), ...(period && { period }), ...(year && { year: Number(year) }), ...(month !== undefined && { month: month ? Number(month) : undefined }), ...(amount && { amount: Number(amount) }), categoryId: categoryId || undefined, departmentId: departmentId || undefined, projectId: projectId || undefined, clientId: clientId || undefined, ...(notes !== undefined && { notes }), ...(isActive !== undefined && { isActive }) } },
    { new: true }
  );
  if (!budget) return res.status(404).json({ message: "Budget not found" });
  res.json({ budget });
});

exports.deleteBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOneAndDelete(withTenant({ _id: req.params.id }, req));
  if (!budget) return res.status(404).json({ message: "Budget not found" });
  res.json({ message: "Budget deleted" });
});
