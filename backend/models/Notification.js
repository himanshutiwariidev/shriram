const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

// Per-recipient documents (not a broadcast/announcement row fanned out at
// read time) — one row per user per event, so isRead/unread-count queries
// stay a simple indexed filter instead of needing a separate read-receipts
// join.
const NotificationSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ["meeting", "subscription_expiry", "org_update", "new_user", "task", "leave", "attendance", "announcement"],
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    link: { type: String, trim: true },
    isRead: { type: Boolean, default: false },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

NotificationSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("Notification", NotificationSchema);
