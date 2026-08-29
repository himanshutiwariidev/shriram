const mongoose = require("mongoose");

// One document per top-level proposal service. The `config` field stores
// the full nested tree (children, fields, gate, gateMode, type) as a plain
// JSON object — the same shape as the legacy hardcoded servicesConfig.js,
// so the existing renderer (NestedServiceRenderer) works unchanged.
// Not tenant-scoped: this is a platform-level catalog owned by superadmin.
const ServiceCatalogSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true, trim: true },
    icon: { type: String, default: "Briefcase" },
    sortOrder: { type: Number, default: 0 },
    // Full nested service tree stored as Mixed so any shape is accepted.
    // Top-level fields (key, label, icon) are mirrored here as well so the
    // renderer can treat a catalog doc exactly like a servicesConfig entry.
    config: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ServiceCatalog", ServiceCatalogSchema);
