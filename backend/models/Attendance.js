const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

const attendanceSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
    },
    loginTime: {
      type: Date,
      required: true,
      index: true,
    },
    logoutTime: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["Active", "Offline"],
      default: "Active",
      index: true,
    },
    totalSessionTime: {
      type: Number,
      default: 0,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    lateByMinutes: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ userId: 1, date: 1, loginTime: -1 });

// sessionId uniqueness is scoped per tenant, not global.
attendanceSchema.index({ sessionId: 1, tenantId: 1 }, { unique: true });

attendanceSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("Attendance", attendanceSchema);
