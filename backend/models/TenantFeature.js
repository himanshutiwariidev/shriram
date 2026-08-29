const mongoose = require("mongoose");

// One document per tenant, listing which modules (from featureCatalog.js)
// are enabled. Absence of a document for a tenant means "everything
// enabled" — see the fail-open behavior in middleware/checkFeature.js.
const TenantFeatureSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true,
    },
    enabledFeatures: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("TenantFeature", TenantFeatureSchema);
