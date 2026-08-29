const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

const GoalResponseSchema = new mongoose.Schema({
  goal: String,
  selfResponse: String,
}, { _id: false });

const AppraisalSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    cycleId: { type: mongoose.Schema.Types.ObjectId, ref: "ReviewCycle", required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["pending", "self_assessed", "reviewed", "finalized"],
      default: "pending",
    },
    // Self-assessment
    selfRating: { type: Number, min: 1, max: 5 },
    selfComment: { type: String, trim: true },
    goalResponses: [GoalResponseSchema],
    // Manager review
    managerRating: { type: Number, min: 1, max: 5 },
    managerComment: { type: String, trim: true },
    // Final
    finalRating: { type: Number, min: 1, max: 5 },
    salaryRevisionFlag: { type: Boolean, default: false },
    salaryRevisionPercent: { type: Number, min: 0, max: 100, default: 0 },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

AppraisalSchema.index({ tenantId: 1, cycleId: 1, employeeId: 1 }, { unique: true });
AppraisalSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("Appraisal", AppraisalSchema);
