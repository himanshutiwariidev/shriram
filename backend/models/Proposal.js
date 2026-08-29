const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

const ProposalSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    proposalNumber: {
      type: String,
      required: true,
      trim: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    projectName: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
    },
    // No longer required — the Services Builder replaced the manual
    // description/deliverables flow. Left optional (not removed) so
    // legacy proposals created before this change keep their data.
    projectDescription: {
      type: String,
      trim: true,
    },
    projectScope: {
      type: String,
      trim: true,
    },
    timeline: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    // The Services Builder's source-of-truth state — array of
    // {instanceId, serviceKey, data} instances (see
    // frontend/src/config/servicesConfig.js). deliverables[] below is
    // auto-derived from this on every save (backend/utils/servicesToDeliverables.js)
    // so existing deliverable-consuming features never see a difference.
    services: {
      type: [mongoose.Schema.Types.Mixed],
      default: undefined,
    },
    projectAmount: {
      type: Number,
      required: [true, "Project amount is required"],
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    paymentTerms: {
      type: String,
      trim: true,
    },
    validUntil: {
      type: Date,
    },
    proposalStatus: {
      type: String,
      enum: ["draft", "sent", "accepted", "rejected", "expired"],
      default: "draft",
    },
    sentAt: {
      type: Date,
    },
    sentTo: {
      type: String,
      trim: true,
    },
    clientResponse: {
      type: String,
      trim: true,
    },
    responseDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    deliverables: [
      {
        title: { type: String, trim: true, required: true },
        quantity: { type: Number, required: true, min: 0 },
        delivered: { type: Number, default: 0, min: 0 },
        frequency: {
          type: String,
          enum: ["one-time", "week", "month"],
          default: "one-time",
        },
        status: {
          type: String,
          enum: ["Pending", "In Progress", "Completed"],
          default: "Pending",
        },
      },
    ],
    payments: [
      {
        amount: { type: Number, required: true, min: 0 },
        paymentDate: { type: Date, default: Date.now },
        method: {
          type: String,
          enum: ["UPI", "Bank Transfer", "Cash", "Razorpay", "Other"],
          default: "Other",
        },
        notes: { type: String, trim: true },
      },
    ],
    receivedAmount: {
      type: Number,
      default: 0,
    },
    dueAmount: {
      type: Number,
      default: 0,
    },
    nextDueDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

ProposalSchema.pre("save", function () {
  // Deliverable due/pending/status are time-dependent (especially for recurring
  // weekly/monthly scope) so they're computed on read via utils/deliverableStats.js
  // instead of being persisted here.

  this.receivedAmount = this.payments.reduce(
    (sum, payment) => sum + (payment.amount || 0),
    0
  );
  this.dueAmount = (this.projectAmount || 0) - this.receivedAmount;
});

// proposalNumber uniqueness is scoped per tenant, not global.
ProposalSchema.index({ proposalNumber: 1, tenantId: 1 }, { unique: true });

ProposalSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("Proposal", ProposalSchema);
