import React, { useState } from "react";
import { ChevronDown, Copy, GripVertical, Trash2 } from "lucide-react";
import useTenantTheme from "../../hooks/useTenantTheme";
import { ConfirmModal } from "../../pages/sections/shared";
import { resolveServiceIcon } from "../../config/serviceIcons";
import { countConfiguredLeaves } from "../../utils/nestedState";
import NestedServiceRenderer from "./NestedServiceRenderer";

// Wraps one selected service instance: icon, name, drag handle, collapse,
// duplicate, remove, and a real progress indicator (X/Y options actually
// configured, walked from the live data — never a fabricated number).
export default function ServiceCard({ config, instance, onChange, onDuplicate, onRemove, collapsed, onToggleCollapse, dragHandleProps }) {
  const { T } = useTenantTheme();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const Icon = resolveServiceIcon(config.icon);
  const stats = countConfiguredLeaves(config, instance.data);

  return (
    <div className="card-in" style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: T.inputBg, borderBottom: collapsed ? "none" : `1px solid ${T.borderLight}` }}>
        <span {...dragHandleProps} style={{ display: "flex", cursor: "grab", color: T.textMuted, flexShrink: 0 }} title="Drag to reorder">
          <GripVertical size={16} strokeWidth={2} />
        </span>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: T.brandLight, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon size={17} strokeWidth={2} color={T.brand} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: T.textPrimary, fontFamily: "'Syne', sans-serif" }}>{config.label}</div>
          {stats.total > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <div style={{ width: 70, height: 4, background: T.borderLight, borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${stats.total ? Math.round((stats.configured / stats.total) * 100) : 0}%`, background: T.brand, borderRadius: 99 }} />
              </div>
              <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 600 }}>{stats.configured}/{stats.total} configured</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <button type="button" onClick={onDuplicate} title="Duplicate" style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: T.textMuted }}>
            <Copy size={15} strokeWidth={1.8} />
          </button>
          <button type="button" onClick={() => setConfirmRemove(true)} title="Remove" style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: T.red }}>
            <Trash2 size={15} strokeWidth={1.8} />
          </button>
          <button type="button" onClick={onToggleCollapse} title={collapsed ? "Expand" : "Collapse"} style={{ display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: T.textMuted }}>
            <ChevronDown size={16} strokeWidth={2} style={{ transform: collapsed ? "none" : "rotate(180deg)", transition: "transform .15s" }} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div style={{ padding: 16 }}>
          <NestedServiceRenderer node={config} data={instance.data} onChange={onChange} isRoot />
        </div>
      )}

      {confirmRemove && (
        <ConfirmModal
          title={`Remove ${config.label}`}
          message={`Remove this ${config.label} configuration from the proposal? This cannot be undone.`}
          onConfirm={() => { setConfirmRemove(false); onRemove(); }}
          onClose={() => setConfirmRemove(false)}
        />
      )}
    </div>
  );
}
