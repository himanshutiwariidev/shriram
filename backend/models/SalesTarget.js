const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

const SalesTargetSchema = new mongoose.Schema(
  {
    tenantId:       { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    period:         { type: String, enum: ["monthly", "quarterly"], required: true },
    year:           { type: Number, required: true },
    month:          { type: Number, min: 1, max: 12 },   // set for monthly
    quarter:        { type: Number, min: 1, max: 4 },    // set for quarterly
    targetAmount:   { type: Number, required: true, min: 0 },
    commissionRate: { type: Number, default: 0, min: 0, max: 100 },
    notes:          { type: String, trim: true },
  },
  { timestamps: true }
);

SalesTargetSchema.index({ tenantId: 1, userId: 1, period: 1, year: 1, month: 1 });
SalesTargetSchema.index({ tenantId: 1, userId: 1, period: 1, year: 1, quarter: 1 });

SalesTargetSchema.plugin(tenantScopePlugin);
module.exports = mongoose.model("SalesTarget", SalesTargetSchema);
