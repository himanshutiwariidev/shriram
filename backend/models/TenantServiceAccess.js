const mongoose = require("mongoose");

// Controls which catalog services each tenant sees in the proposal builder.
// Absence of a document for a tenant means "all catalog services enabled"
// (fail-open, same pattern as TenantFeature). An explicit empty array []
// means "no services enabled".
const TenantServiceAccessSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true,
      index: true,
    },
    // Keys from ServiceCatalog that are enabled for this tenant.
    // null / absent document = all enabled.  [] = none enabled.
    enabledServiceKeys: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("TenantServiceAccess", TenantServiceAccessSchema);
