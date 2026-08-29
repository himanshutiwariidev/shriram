const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

const ClientSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    salesPerson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedDate: {
      type: Date,
    },
    leadSource: {
      type: String,
      enum: ["cold call", "reference", "visit", "self", "other"],
      requiredd: true
    },
    clientName: {
      type: String,
      required: [true, "Client name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Client email is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    gstNo: {
      type: String,
      trim: true,
    },
    tanNo: {
      type: String,
      trim: true,
    },
    clientType: {
      type: String,
      enum: ["pvt ltd", "ltd", "llp", "hup", "other"],
    },
    projectType: {
      type: String,
      enum: ["service", "product"],
      required: true,
    },
    projectName: {
      type: String,
      required: true
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    zipCode: {
      type: String,
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["open", "converted", "cold", "ni"],
      default: "open",
    },
    // Only meaningful once status === "converted": whether the client's work is
    // currently ongoing (active) or paused/ended (inactive).
    activeStatus: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    totalProjects: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    onboardedAt: {
      type: Date,
      default: Date.now,
    },
    remarks: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: { type: String },
        message: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    workProgress: [
      {
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        status: {
          type: String,
          enum: ["Pending", "In Progress", "On Hold", "Waiting for Client", "Completed"],
          default: "Pending",
        },
        percentage: { type: Number, min: 0, max: 100, default: 0 },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    piAttachments: [
      {
        filename: { type: String, required: true },
        originalname: { type: String, required: true },
        mimetype: { type: String },
        size: { type: Number },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Client email uniqueness is scoped per tenant, not global.
ClientSchema.index({ email: 1, tenantId: 1 }, { unique: true });

ClientSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("Client", ClientSchema);
