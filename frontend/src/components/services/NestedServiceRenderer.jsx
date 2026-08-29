import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import useTenantTheme from "../../hooks/useTenantTheme";
import FieldRenderer from "./FieldRenderer";
import { getIn, matchesGate, countConfiguredLeaves } from "../../utils/nestedState";

// The one recursive component every service in servicesConfig.js renders
// through — no node type is special-cased beyond optionLeaf's compact
// single-row treatment vs. a group's collapsible nested card. A node can
// have a gate, its own fields, and children simultaneously; all three are
// handled unconditionally.
export default function NestedServiceRenderer({ node, data = {}, onChange, isRoot = false }) {
  const { T } = useTenantTheme();
  const initialStats = countConfiguredLeaves(node, data);
  const [expanded, setExpanded] = useState(isRoot || initialStats.configured > 0);

  const setField = (key, value) => onChange({ ...data, [key]: value });
  const setChildData = (childKey, value) => onChange({ ...data, [childKey]: value });
  const setGateValue = (value) => onChange({ ...data, gate: { ...(data.gate || {}), [node.gate.key]: value } });

  // ── optionLeaf: compact single-row card with an implicit Enable checkbox ──
  if (node.type === "optionLeaf") {
    const enabled = !!data.enabled;
    return (
      <div style={{ border: `1.5px solid ${enabled ? T.brandMid : T.borderLight}`, borderRadius: 10, padding: "11px 14px", background: enabled ? T.brandLight : T.inputBg }}>
        <label style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer", fontSize: 13, fontWeight: 600, color: T.textPrimary }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setField("enabled", e.target.checked)}
            style={{ accentColor: T.brand, width: 15, height: 15, cursor: "pointer", flexShrink: 0 }}
          />
          {node.label}
        </label>
        {enabled && node.fields?.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 12, paddingLeft: 24 }}>
            {node.fields.map((f) => (
              <FieldRenderer key={f.key} field={f} value={data[f.key]} onChange={(v) => setField(f.key, v)} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── group node ──
  const gateValue = node.gate ? getIn(data, ["gate", node.gate.key]) : undefined;
  const gateAnswered = !node.gate || (Array.isArray(gateValue) ? gateValue.length > 0 : !!gateValue);

  const visibleChildren = !node.children
    ? []
    : node.gateMode === "filter"
      ? (gateAnswered ? node.children.filter((c) => matchesGate(c, gateValue)) : [])
      : node.gateMode === "reveal"
        ? (gateAnswered ? node.children : [])
        : node.children;

  const body = (
    <>
      {node.gate && (
        <div style={{ marginBottom: node.fields?.length || visibleChildren.length ? 16 : 0 }}>
          <FieldRenderer field={node.gate} value={gateValue} onChange={setGateValue} />
        </div>
      )}
      {node.fields?.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: visibleChildren.length ? 16 : 0 }}>
          {node.fields.map((f) => (
            <FieldRenderer key={f.key} field={f} value={data[f.key]} onChange={(v) => setField(f.key, v)} />
          ))}
        </div>
      )}
      {visibleChildren.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visibleChildren.map((child) => (
            <NestedServiceRenderer key={child.key} node={child} data={data[child.key]} onChange={(v) => setChildData(child.key, v)} />
          ))}
        </div>
      )}
    </>
  );

  if (isRoot) return body;

  const stats = countConfiguredLeaves(node, data);

  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, background: "#fff", overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary, fontFamily: "'Syne', sans-serif" }}>{node.label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {stats.total > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: stats.configured > 0 ? T.brand : T.textMuted }}>
              {stats.configured}/{stats.total}
            </span>
          )}
          <ChevronDown size={15} strokeWidth={2} color={T.textMuted} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        </div>
      </button>
      {expanded && <div style={{ padding: "0 14px 14px" }}>{body}</div>}
    </div>
  );
}
