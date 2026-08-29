const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

const HolidaySchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    // null = applies to all branches; set = branch-specific
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    type: { type: String, enum: ["public", "company"], default: "public" },
    year: { type: Number, required: true },
  },
  { timestamps: true }
);

HolidaySchema.index({ tenantId: 1, year: 1 });
HolidaySchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("Holiday", HolidaySchema);
