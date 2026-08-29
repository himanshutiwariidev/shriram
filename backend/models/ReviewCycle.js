const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

const ReviewCycleSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    title: { type: String, required: true, trim: true },
    period: { type: String, enum: ["quarterly", "annual"], required: true },
    year: { type: Number, required: true },
    quarter: { type: Number, min: 1, max: 4 }, // only for quarterly
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ["draft", "open", "closed"], default: "draft" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Goal prompts employees fill in during self-assessment
    goals: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

ReviewCycleSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("ReviewCycle", ReviewCycleSchema);
