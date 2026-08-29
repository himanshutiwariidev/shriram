const ServiceCatalog = require("../models/ServiceCatalog");
const DEFAULT_SERVICES = require("../config/defaultServiceCatalog");

// Runs once on startup. If ServiceCatalog is empty, seeds the 13 default
// services. Never overwrites existing docs, so superadmin edits are preserved.
async function seedServiceCatalog() {
  try {
    const count = await ServiceCatalog.countDocuments();
    if (count > 0) return;

    await ServiceCatalog.insertMany(DEFAULT_SERVICES);
    console.log(`[seed] Inserted ${DEFAULT_SERVICES.length} default services into ServiceCatalog.`);
  } catch (err) {
    console.error("[seed] ServiceCatalog seed failed:", err.message);
  }
}

module.exports = { seedServiceCatalog };
