const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

// Annual quota rules per leave type. One policy document per tenant per leave type.
const LeavePolicySchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    leaveType: { type: String, required: true, enum: ["casual", "sick", "earned"], trim: true },
    annualQuota: { type: Number, required: true, min: 0, default: 12 },
    carryForward: { type: Boolean, default: false },
    maxCarryForward: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

LeavePolicySchema.index({ tenantId: 1, leaveType: 1 }, { unique: true });
LeavePolicySchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("LeavePolicy", LeavePolicySchema);
