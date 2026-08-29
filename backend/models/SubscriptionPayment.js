const mongoose = require("mongoose");

const SubscriptionPaymentSchema = new mongoose.Schema(
  {
    tenantId:         { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    organizationName: { type: String, default: "" },
    orderId:          { type: String, required: true, unique: true },
    paymentId:        { type: String, default: null },
    signature:        { type: String, default: null },
    amount:           { type: Number, required: true },      // in ₹
    amountPaise:      { type: Number, required: true },      // in paise (amount × 100)
    planName:         { type: String, enum: ["starter", "professional", "business", "enterprise"], required: true },
    durationMonths:   { type: Number, required: true },
    status:           { type: String, enum: ["created", "paid", "failed"], default: "created" },
    renewedBy:        { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    paidAt:           { type: Date, default: null },
    newExpiresAt:     { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SubscriptionPayment", SubscriptionPaymentSchema);
