const mongoose = require("mongoose");

// Support chat between tenant_admin and superadmin.
// No tenantScopePlugin — superadmin needs cross-tenant access.
const SupportMessageSchema = new mongoose.Schema(
  {
    tenantId:    { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    senderId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderRole:  { type: String, enum: ["tenant_admin", "superadmin"], required: true },
    senderName:  { type: String, default: "" },
    body:        { type: String, required: true, trim: true, maxlength: 4000 },
    readBySuperAdmin: { type: Boolean, default: false },
    readByTenant:     { type: Boolean, default: false },
  },
  { timestamps: true }
);

SupportMessageSchema.index({ tenantId: 1, createdAt: 1 });

module.exports = mongoose.model("SupportMessage", SupportMessageSchema);
