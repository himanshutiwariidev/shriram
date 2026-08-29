const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

// Per-employee, per-year leave balance tracking.
// used = days actually approved; quota from policy + carryForward from previous year.
const LeaveBalanceSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    year: { type: Number, required: true },
    casual:  { quota: { type: Number, default: 0 }, used: { type: Number, default: 0 }, carryForward: { type: Number, default: 0 } },
    sick:    { quota: { type: Number, default: 0 }, used: { type: Number, default: 0 }, carryForward: { type: Number, default: 0 } },
    earned:  { quota: { type: Number, default: 0 }, used: { type: Number, default: 0 }, carryForward: { type: Number, default: 0 } },
  },
  { timestamps: true }
);

LeaveBalanceSchema.index({ tenantId: 1, userId: 1, year: 1 }, { unique: true });
LeaveBalanceSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("LeaveBalance", LeaveBalanceSchema);
