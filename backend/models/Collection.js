const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

const CollectionSchema = new mongoose.Schema(
  {
    tenantId:      { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    title:         { type: String, required: true, trim: true },
    clientName:    { type: String, trim: true },
    amount:        { type: Number, required: true, min: 0 },
    paymentDate:   { type: Date, default: Date.now },
    method:        { type: String, enum: ["UPI", "Bank Transfer", "Cash", "Razorpay", "Cheque", "Other"], default: "Other" },
    reference:     { type: String, trim: true },
    notes:         { type: String, trim: true },
    recordedBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

CollectionSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("Collection", CollectionSchema);
