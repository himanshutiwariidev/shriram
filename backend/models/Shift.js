const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

// Shift defines the window within which an employee must check in to be
// considered "on time". isLate = loginTime > date @ startHour:startMinute.
const ShiftSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: true, trim: true },       // e.g. "Morning", "Evening", "Night"
    startHour: { type: Number, required: true, min: 0, max: 23 },
    startMinute: { type: Number, default: 0, min: 0, max: 59 },
    endHour: { type: Number, required: true, min: 0, max: 23 },
    endMinute: { type: Number, default: 0, min: 0, max: 59 },
  },
  { timestamps: true }
);

ShiftSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("Shift", ShiftSchema);
