const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

// A saved, reusable Services Builder configuration ("save this combination
// of services as a template, load it into a future proposal").
const ProposalTemplateSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    services: { type: [mongoose.Schema.Types.Mixed], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ProposalTemplateSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("ProposalTemplate", ProposalTemplateSchema);
