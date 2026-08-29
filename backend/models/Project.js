const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

const projectSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    projectCategory: {
      type: String,
      enum: ["allProjects", "ongoingProjects", "credentials", "domainDetails"],
      default: "allProjects",
    },
    companyName: { type: String, required: true, trim: true },
    domain: { type: String, trim: true },
    handoverdate:{type:Date,trim:true},
    salesPerson:{type:String,trim:true},
    businesstype:{type:String,enum:["Service","Product",],default:"Service"},
    assignTo: { type: String, trim: true },
    technology: { type: String, trim: true },
    deployedDate: { type: Date },
    developer: { type: String, trim: true },
    websiteDueDate: { type: Date },
    domainDueDate: { type: Date },
    platform: { type: String, trim: true },
    domainProvider: { type: String, trim: true },
    hostingProvider: { type: String, trim: true },
    domainOwnership: { type: String, trim: true },
    hostingOwnership: { type: String, trim: true },
    status: {
      type: String,
      enum: ["Active", "In-Active",],
      default: "Active",
    },
    credentials: [
      {
        credentialType: { type: String, trim: true },
        userId: { type: String, trim: true },
        password: { type: String, trim: true },
      },
    ],
    userId: { type: String, trim: true },
    password: { type: String, trim: true },
    credentialType: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

projectSchema.index({ companyName: 1, domain: 1 });
projectSchema.index({ status: 1 });

projectSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("Project", projectSchema);
