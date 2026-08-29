const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

const meetingSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    location: { type: String, trim: true },
    // Recurrence expansion isn't implemented yet — every meeting is a single
    // occurrence today; this flag exists so a future pass can add it without
    // a schema migration.
    isRecurring: { type: Boolean, default: false },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reminderMinutesBefore: { type: Number, default: 15 },
    status: { type: String, enum: ["scheduled", "completed", "cancelled"], default: "scheduled" },
  },
  { timestamps: true }
);

meetingSchema.index({ tenantId: 1, startTime: 1 });

meetingSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("Meeting", meetingSchema);
