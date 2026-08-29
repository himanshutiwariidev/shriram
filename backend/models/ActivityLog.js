const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

const ActivityLogSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ActivityLogSchema.index({ clientId: 1, createdAt: -1 });

ActivityLogSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("ActivityLog", ActivityLogSchema);
