const asyncHandler = require("../utils/asyncHandler");
const Vendor = require("../models/Vendor");
const Expense = require("../models/Expense");
const { withTenant } = require("../utils/tenantQuery");
const mongoose = require("mongoose");

exports.getVendors = asyncHandler(async (req, res) => {
  const vendors = await Vendor.find(withTenant({}, req)).sort({ name: 1 });
  res.json({ vendors });
});

exports.createVendor = asyncHandler(async (req, res) => {
  const { name, email, phone, gstNumber, pan, address, paymentTerms, notes } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "Vendor name is required" });

  const vendor = await Vendor.create(
    withTenant({ name: name.trim(), email, phone, gstNumber, pan, address, paymentTerms, notes }, req)
  );
  res.status(201).json({ vendor });
});

exports.updateVendor = asyncHandler(async (req, res) => {
  const { name, email, phone, gstNumber, pan, address, paymentTerms, notes, isActive } = req.body;
  const vendor = await Vendor.findOneAndUpdate(
    withTenant({ _id: req.params.id }, req),
    { $set: { name, email, phone, gstNumber, pan, address, paymentTerms, notes, ...(isActive !== undefined && { isActive }) } },
    { new: true, runValidators: true }
  );
  if (!vendor) return res.status(404).json({ message: "Vendor not found" });
  res.json({ vendor });
});

exports.deleteVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOneAndDelete(withTenant({ _id: req.params.id }, req));
  if (!vendor) return res.status(404).json({ message: "Vendor not found" });
  res.json({ message: "Vendor deleted" });
});

exports.getVendorStats = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tenantObjectId = new mongoose.Types.ObjectId(req.tenantId);
  const vendorObjectId = new mongoose.Types.ObjectId(id);

  const [stats] = await Expense.aggregate([
    { $match: { tenantId: tenantObjectId, vendorId: vendorObjectId } },
    {
      $group: {
        _id: null,
        totalSpent: { $sum: "$totalAmount" },
        count: { $sum: 1 },
        lastExpenseDate: { $max: "$expenseDate" },
      },
    },
  ]);

  res.json({ totalSpent: stats?.totalSpent || 0, count: stats?.count || 0, lastExpenseDate: stats?.lastExpenseDate || null });
});
