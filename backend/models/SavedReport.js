const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

const SavedReportSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: true, trim: true },
    domain: {
      type: String,
      required: true,
      enum: ["revenue", "tasks", "attendance", "expenses", "leaves", "salaries"],
    },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

SavedReportSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("SavedReport", SavedReportSchema);
