const ServiceCatalog = require("../models/ServiceCatalog");
const TenantServiceAccess = require("../models/TenantServiceAccess");
const asyncHandler = require("../utils/asyncHandler");

// ── SUPERADMIN — Global catalog ─────────────────────────────────────────────

// GET /api/superadmin/services
exports.getCatalog = asyncHandler(async (req, res) => {
  const services = await ServiceCatalog.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
  return res.json({ services });
});

// POST /api/superadmin/services
exports.createService = asyncHandler(async (req, res) => {
  const { key, label, icon, sortOrder, config } = req.body;

  if (!key || !label || !config) {
    return res.status(400).json({ message: "key, label, and config are required" });
  }

  const exists = await ServiceCatalog.findOne({ key });
  if (exists) {
    return res.status(400).json({ message: `A service with key "${key}" already exists` });
  }

  const service = await ServiceCatalog.create({
    key: key.trim(),
    label: label.trim(),
    icon: icon || "Briefcase",
    sortOrder: sortOrder ?? 99,
    config,
  });

  return res.status(201).json({ message: "Service created", service });
});

// PUT /api/superadmin/services/:key
exports.updateService = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { label, icon, sortOrder, config } = req.body;

  const service = await ServiceCatalog.findOne({ key });
  if (!service) {
    return res.status(404).json({ message: "Service not found" });
  }

  if (label !== undefined) service.label = label.trim();
  if (icon !== undefined) service.icon = icon;
  if (sortOrder !== undefined) service.sortOrder = sortOrder;
  if (config !== undefined) service.config = config;

  await service.save();
  return res.json({ message: "Service updated", service });
});

// DELETE /api/superadmin/services/:key
exports.deleteService = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const deleted = await ServiceCatalog.findOneAndDelete({ key });
  if (!deleted) return res.status(404).json({ message: "Service not found" });
  return res.json({ message: "Service deleted" });
});

// ── SUPERADMIN — Per-tenant access ─────────────────────────────────────────

// GET /api/superadmin/organizations/:id/services
exports.getTenantServices = asyncHandler(async (req, res) => {
  const tenantId = req.params.id;

  const [allServices, access] = await Promise.all([
    ServiceCatalog.find().sort({ sortOrder: 1 }).lean().select("key label icon sortOrder"),
    TenantServiceAccess.findOne({ tenantId }).lean(),
  ]);

  // null access document = all services enabled
  const enabledKeys = access ? access.enabledServiceKeys : allServices.map((s) => s.key);

  return res.json({ catalog: allServices, enabledServiceKeys: enabledKeys });
});

// PUT /api/superadmin/organizations/:id/services
exports.setTenantServices = asyncHandler(async (req, res) => {
  const tenantId = req.params.id;
  const { enabledServiceKeys } = req.body;

  if (!Array.isArray(enabledServiceKeys)) {
    return res.status(400).json({ message: "enabledServiceKeys must be an array" });
  }

  await TenantServiceAccess.findOneAndUpdate(
    { tenantId },
    { $set: { enabledServiceKeys } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.json({ message: "Tenant service access updated", enabledServiceKeys });
});

// ── TENANT-FACING — used by the proposal builder ───────────────────────────

// GET /api/tenant/services
// Returns the full config for only the services enabled for this tenant.
// Fail-open: if no TenantServiceAccess document exists, all services are returned.
exports.getMyServices = asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;

  const [allServices, access] = await Promise.all([
    ServiceCatalog.find().sort({ sortOrder: 1 }).lean(),
    tenantId ? TenantServiceAccess.findOne({ tenantId }).lean() : null,
  ]);

  let services;
  if (!access) {
    // No access document = all services enabled (fail-open)
    services = allServices;
  } else {
    const enabledSet = new Set(access.enabledServiceKeys);
    services = allServices.filter((s) => enabledSet.has(s.key));
  }

  // Return the config tree for each service — same shape as the old
  // SERVICES_CONFIG array so the frontend ServiceSelector works unchanged.
  return res.json({ services: services.map((s) => s.config) });
});
