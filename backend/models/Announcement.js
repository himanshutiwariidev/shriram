const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

const AnnouncementSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    priority: { type: String, enum: ["info", "warning", "urgent"], default: "info" },
    // "all" | "roles" | "branches"
    audienceType: { type: String, enum: ["all", "roles", "branches"], default: "all" },
    targetRoles: [{ type: String }],
    targetBranches: [{ type: mongoose.Schema.Types.ObjectId, ref: "Branch" }],
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

AnnouncementSchema.index({ tenantId: 1, isActive: 1, expiresAt: 1 });
AnnouncementSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("Announcement", AnnouncementSchema);
