const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

const PaymentReminderSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    reminderId: {
      type: String,
      required: true,
      trim: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    proposalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Proposal",
    },
    invoiceNumber: {
      type: String,
      trim: true,
    },
    amountDue: {
      type: Number,
      required: [true, "Amount due is required"],
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    dueDate: {
      type: Date,
    },
    reminderType: {
      type: String,
      enum: ["first-reminder", "second-reminder", "final-reminder", "custom"],
      default: "first-reminder",
    },
    sentAt: {
      type: Date,
    },
    sentTo: {
      type: String,
      trim: true,
    },
    reminderStatus: {
      type: String,
      enum: ["drafted", "sent", "received", "paid"],
      default: "drafted",
    },
    customMessage: {
      type: String,
      trim: true,
    },
    reminderCount: {
      type: Number,
      default: 1,
    },
    nextReminderDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// reminderId uniqueness is scoped per tenant, not global.
PaymentReminderSchema.index({ reminderId: 1, tenantId: 1 }, { unique: true });

PaymentReminderSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("PaymentReminder", PaymentReminderSchema);
