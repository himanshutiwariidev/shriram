const { getServiceConfig } = require("../config/servicesConfig");

// Runs server-side (not client-side) so it can't be bypassed by a stale
// client and stays the single source of truth: walks the Services
// Builder's submitted state against the config's label tree and emits one
// legacy-shaped deliverables[] entry per configured leaf, so every existing
// consumer of Proposal.deliverables (DeliverablesTracker, the client
// dashboard, the emailed PDF's Scope Of Work table, the completion-rate
// KPI tiles) keeps working unchanged for proposals built with Services.

const hasAnyValue = (data) => {
  if (!data || typeof data !== "object") return false;
  return Object.entries(data).some(([key, value]) => {
    if (key === "gate") return false; // a gate selection alone doesn't count as "configured"
    if (value === undefined || value === null || value === "") return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return hasAnyValue(value);
    return true;
  });
};

const isConfigured = (data) => !!data && (data.enabled === true || hasAnyValue(data));

const extractQuantity = (data) =>
  data?.quantityPerMonth ?? data?.numberOfKeywords ?? data?.quantity ?? 1;

const walk = (node, data, labelPath, out, titleSuffix) => {
  if (!node || !data) return;

  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      walk(child, data[child.key], [...labelPath, child.label], out, titleSuffix);
    }
    return;
  }

  // Leaf — either an optionLeaf (has an `enabled` flag) or a flat
  // node with only its own fields (no per-option toggle in the spec).
  if (isConfigured(data)) {
    const title = (labelPath.length ? labelPath.join(" — ") : node.label) + titleSuffix;
    out.push({
      title,
      quantity: Number(extractQuantity(data)) || 1,
      delivered: 0,
      frequency: "month",
      status: "Pending",
    });
  }
};

// `services` is the array of {instanceId, serviceKey, data} instances
// submitted by the Services Builder. Returns a plain deliverables[] array
// matching Proposal.deliverables' existing schema shape exactly.
function servicesToDeliverables(services) {
  if (!Array.isArray(services) || services.length === 0) return [];

  const keyOccurrences = {};
  const deliverables = [];

  for (const instance of services) {
    const config = getServiceConfig(instance.serviceKey);
    if (!config) continue;

    keyOccurrences[instance.serviceKey] = (keyOccurrences[instance.serviceKey] || 0) + 1;
    const occurrence = keyOccurrences[instance.serviceKey];
    // Only disambiguate with a suffix once a service is duplicated —
    // a single instance's titles stay clean.
    const titleSuffix = occurrence > 1 ? ` (${occurrence})` : "";

    walk(config, instance.data || {}, [], deliverables, titleSuffix);
  }

  return deliverables;
}

module.exports = { servicesToDeliverables };
