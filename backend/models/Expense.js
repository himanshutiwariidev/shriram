const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

const AttachmentSchema = new mongoose.Schema(
  { filename: String, url: String, mimetype: String, size: Number },
  { _id: false }
);

const ApprovalEntrySchema = new mongoose.Schema(
  {
    action:  { type: String, enum: ["submitted", "approved", "rejected", "paid"] },
    by:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    comment: { type: String, trim: true },
    at:      { type: Date, default: Date.now },
  },
  { _id: false }
);

const ExpenseSchema = new mongoose.Schema(
  {
    tenantId:      { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    expenseId:     { type: String, trim: true }, // display ID e.g. EXP-20240115-0042
    title:         { type: String, required: true, trim: true },
    description:   { type: String, trim: true },
    categoryId:    { type: mongoose.Schema.Types.ObjectId, ref: "ExpenseCategory" },
    vendorId:      { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
    employeeId:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    departmentId:  { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    clientId:      { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    projectId:     { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    expenseType:   { type: String, trim: true },
    amount:        { type: Number, required: true, min: 0 },
    tax:           { type: Number, default: 0, min: 0 },
    totalAmount:   { type: Number, required: true, min: 0 },
    currency:      { type: String, default: "INR", trim: true },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Bank Transfer", "UPI", "Cheque", "Card", "Other"],
      default: "Cash",
    },
    expenseDate:   { type: Date, required: true },
    dueDate:       { type: Date },
    status: {
      type: String,
      enum: ["draft", "submitted", "pending", "approved", "rejected", "paid"],
      default: "draft",
    },
    notes:           { type: String, trim: true },
    attachments:     [AttachmentSchema],
    approvalHistory: [ApprovalEntrySchema],
    // recurring
    isRecurring: { type: Boolean, default: false },
    recurringRule: {
      frequency: { type: String, enum: ["daily", "weekly", "monthly", "quarterly", "yearly"] },
      nextDate:  { type: Date },
      endDate:   { type: Date },
    },
    // payroll integration
    source:       { type: String, enum: ["manual", "payroll", "recurring"], default: "manual" },
    salarySlipId: { type: mongoose.Schema.Types.ObjectId, ref: "SalarySlip" },
    // metadata
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ExpenseSchema.index({ tenantId: 1, expenseDate: -1 });
ExpenseSchema.index({ tenantId: 1, status: 1 });
ExpenseSchema.index({ tenantId: 1, categoryId: 1 });
ExpenseSchema.index({ tenantId: 1, employeeId: 1 });
// Prevents duplicate payroll expense per salary slip.
// Single-field sparse so null salarySlipId docs (manual expenses) are excluded.
ExpenseSchema.index({ salarySlipId: 1 }, { unique: true, sparse: true });
ExpenseSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("Expense", ExpenseSchema);
