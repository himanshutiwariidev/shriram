const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

// No controllers/routes exist for this model yet — it's the data foundation
// for a future pass that wires employees to a department.
const DepartmentSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: [true, "Department name is required"], trim: true },
    description: { type: String, trim: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
  },
  { timestamps: true }
);

DepartmentSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("Department", DepartmentSchema);
