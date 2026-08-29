const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

// No controllers/routes exist for this model yet — it's the data foundation
// for a future pass that wires employees/attendance/projects to a branch.
const BranchSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: [true, "Branch name is required"], trim: true },
    address: { type: String, trim: true },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    phone: { type: String, trim: true },
    workingHours: { type: String, trim: true },
    timezone: { type: String, default: "Asia/Kolkata" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

BranchSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("Branch", BranchSchema);
