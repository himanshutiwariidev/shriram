// Small, dependency-free helpers for reading/writing a service instance's
// deeply-nested `data` object by path (array of keys) — no lodash needed
// for ~15 lines of immutable path-walking.

export const getIn = (obj, path) => {
  let cur = obj;
  for (const key of path) {
    if (cur == null) return undefined;
    cur = cur[key];
  }
  return cur;
};

export const setIn = (obj, path, value) => {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  const base = obj && typeof obj === "object" ? obj : {};
  return { ...base, [head]: setIn(base[head], rest, value) };
};

// A node is "configured" if: it's an optionLeaf and enabled, or it has no
// enabled flag but at least one of its own fields is filled (flat services
// like Telecast/OTT Ads have no per-option toggle — any filled field means
// the user is using it). Used for both the ServiceCard progress indicator
// and (mirrored server-side) the deliverables-sync bridge.
const isLeafConfigured = (node, nodeData) => {
  if (!nodeData) return false;
  if (node.type === "optionLeaf") {
    if (nodeData.enabled) return true;
    // No explicit enable field (e.g. YouTube's leaves) — configured if any field has a value.
    return (node.fields || []).some((f) => hasValue(nodeData[f.key]));
  }
  return (node.fields || []).some((f) => hasValue(nodeData[f.key]));
};

const hasValue = (v) => {
  if (v === undefined || v === null || v === "") return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
};

// Walks a node tree against its data slice, returning { total, configured }
// counts of every leaf (optionLeaf, or a childless group with its own
// fields) reachable under the current gate selection.
export function countConfiguredLeaves(node, data = {}) {
  if (!node) return { total: 0, configured: 0 };

  const isLeaf = node.type === "optionLeaf" || (!node.children && node.fields);
  if (isLeaf) {
    return { total: 1, configured: isLeafConfigured(node, data) ? 1 : 0 };
  }

  let total = 0;
  let configured = 0;

  if (node.gate) {
    const gateValue = getIn(data, ["gate", node.gate.key]);
    if (!gateValue) return { total: 0, configured: 0 };
    const children = node.gateMode === "filter"
      ? (node.children || []).filter((c) => matchesGate(c, gateValue))
      : node.children || [];
    for (const child of children) {
      const r = countConfiguredLeaves(child, data[child.key]);
      total += r.total;
      configured += r.configured;
    }
    return { total, configured };
  }

  for (const child of node.children || []) {
    const r = countConfiguredLeaves(child, data[child.key]);
    total += r.total;
    configured += r.configured;
  }
  return { total, configured };
}

// For gateMode:"filter" — the gate's option value is matched against the
// child's label (e.g. gate option "Google Ads" selects the child whose
// label is exactly "Google Ads").
export const matchesGate = (child, gateValue) => {
  if (Array.isArray(gateValue)) return gateValue.includes(child.label);
  return child.label === gateValue;
};

// Sums only fields that are genuinely budget/cost figures (by key name,
// not fabricated) across every instance's data tree — most services in
// this config have no cost field at all, so this only ever reflects real
// entered numbers (Sponsored Ads' monthlyBudget/budget, Film Production's
// budget, Event Management's budget, etc.), never an invented estimate.
const BUDGET_KEYS = ["budget", "monthlyBudget"];

const sumBudgetsInObject = (obj) => {
  if (!obj || typeof obj !== "object") return 0;
  let sum = 0;
  for (const [key, value] of Object.entries(obj)) {
    if (BUDGET_KEYS.includes(key) && typeof value === "number") {
      sum += value;
    } else if (value && typeof value === "object") {
      sum += sumBudgetsInObject(value);
    }
  }
  return sum;
};

export const sumServiceBudgets = (services = []) =>
  services.reduce((total, instance) => total + sumBudgetsInObject(instance.data), 0);

// Client-side mirror of backend/utils/servicesToDeliverables.js's walk, for
// the print preview — a visual preview only (the persisted deliverables[]
// is computed server-side on save, which stays the actual source of truth).
export function collectConfiguredLeaves(node, data = {}, labelPath = []) {
  if (!node || !data) return [];
  if (node.children && node.children.length > 0) {
    return node.children.flatMap((child) => collectConfiguredLeaves(child, data[child.key], [...labelPath, child.label]));
  }
  const configured = data.enabled === true || Object.entries(data).some(([k, v]) => {
    if (k === "gate") return false;
    if (v === undefined || v === null || v === "") return false;
    return Array.isArray(v) ? v.length > 0 : true;
  });
  if (!configured) return [];
  const title = labelPath.length ? labelPath.join(" — ") : node.label;
  const quantity = data.quantityPerMonth ?? data.numberOfKeywords ?? data.quantity ?? 1;
  return [{ title, quantity }];
}
