const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

const BudgetSchema = new mongoose.Schema(
  {
    tenantId:     { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name:         { type: String, required: true, trim: true },
    period:       { type: String, enum: ["monthly", "yearly"], required: true },
    year:         { type: Number, required: true },
    month:        { type: Number, min: 1, max: 12 }, // only for monthly
    amount:       { type: Number, required: true, min: 0 },
    // scope — at most one of these is set
    categoryId:   { type: mongoose.Schema.Types.ObjectId, ref: "ExpenseCategory" },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    projectId:    { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    clientId:     { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    notes:        { type: String, trim: true },
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

BudgetSchema.index({ tenantId: 1, year: 1, month: 1 });
BudgetSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("Budget", BudgetSchema);
