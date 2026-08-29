const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

// roomId conventions:
//   department:<departmentId>  — team room auto-created per department
//   project:<projectId>        — project room auto-created per project
//   dm:<smallerId>_<largerId>  — deterministic DM channel between two users
const MessageSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    roomId: { type: String, required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

MessageSchema.index({ tenantId: 1, roomId: 1, createdAt: -1 });
MessageSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("Message", MessageSchema);
