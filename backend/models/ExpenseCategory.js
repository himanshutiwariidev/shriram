const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

const ExpenseCategorySchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name:     { type: String, required: true, trim: true },
    color:    { type: String, default: "#f7931e" },
    icon:     { type: String, default: "Receipt" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ExpenseCategorySchema.index({ tenantId: 1, name: 1 }, { unique: true });
ExpenseCategorySchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("ExpenseCategory", ExpenseCategorySchema);
