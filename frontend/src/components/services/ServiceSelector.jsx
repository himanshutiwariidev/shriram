import React, { useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2, Search } from "lucide-react";
import useTenantTheme from "../../hooks/useTenantTheme";
import { resolveServiceIcon } from "../../config/serviceIcons";
import ServiceCard from "./ServiceCard";

const newInstanceId = () => `svc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

// The top of the Services Builder: a searchable multi-select tile grid
// of tenant-enabled services, plus the list of selected-service instance
// cards below it, with drag-reorder, duplicate, expand/collapse-all.
// `catalog` is passed from ProposalForm which fetches /api/tenant/services once.
export default function ServiceSelector({ services, onChange, catalog = [] }) {
  const { T } = useTenantTheme();
  const [search, setSearch] = useState("");
  const [collapsedMap, setCollapsedMap] = useState({});
  const dragIndexRef = useRef(null);

  const filteredTiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((s) => s.label.toLowerCase().includes(q));
  }, [search, catalog]);

  const selectedKeys = useMemo(() => new Set(services.map((s) => s.serviceKey)), [services]);

  const toggleTile = (serviceKey) => {
    if (selectedKeys.has(serviceKey)) {
      onChange(services.filter((s) => s.serviceKey !== serviceKey));
    } else {
      onChange([...services, { instanceId: newInstanceId(), serviceKey, data: {} }]);
    }
  };

  const duplicateInstance = (instanceId) => {
    const idx = services.findIndex((s) => s.instanceId === instanceId);
    if (idx === -1) return;
    const clone = { ...services[idx], instanceId: newInstanceId(), data: JSON.parse(JSON.stringify(services[idx].data || {})) };
    const next = [...services];
    next.splice(idx + 1, 0, clone);
    onChange(next);
  };

  const removeInstance = (instanceId) => onChange(services.filter((s) => s.instanceId !== instanceId));

  const updateInstanceData = (instanceId, data) =>
    onChange(services.map((s) => (s.instanceId === instanceId ? { ...s, data } : s)));

  const reorder = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    const next = [...services];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onChange(next);
  };

  const setAllCollapsed = (value) => {
    const map = {};
    services.forEach((s) => { map[s.instanceId] = value; });
    setCollapsedMap(map);
  };

  return (
    <div>
      {/* ── Tile picker ─────────────────────────────────────────────── */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={15} strokeWidth={2} color={T.textMuted} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input
          type="text"
          placeholder="Search services…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px 10px 38px", background: T.inputBg, border: `1.5px solid ${T.inputBorder}`, borderRadius: 10, color: T.textPrimary, fontSize: 13.5, outline: "none", fontFamily: "inherit" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: services.length ? 20 : 0 }}>
        {filteredTiles.map((svc) => {
          const Icon = resolveServiceIcon(svc.icon);
          const active = selectedKeys.has(svc.key);
          return (
            <button
              key={svc.key}
              type="button"
              onClick={() => toggleTile(svc.key)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 11, cursor: "pointer",
                border: `1.5px solid ${active ? T.brand : T.inputBorder}`,
                background: active ? T.brandLight : "#fff",
                textAlign: "left", transition: "border-color .15s, background .15s",
              }}
            >
              <div style={{ width: 30, height: 30, borderRadius: 9, background: active ? "#fff" : T.inputBg, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Icon size={15} strokeWidth={2} color={active ? T.brand : T.textMuted} />
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: active ? T.brand : T.textSecondary, lineHeight: 1.25 }}>{svc.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Selected service cards ──────────────────────────────────── */}
      {services.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".06em" }}>
              {services.length} service{services.length !== 1 ? "s" : ""} configured
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={() => setAllCollapsed(false)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 600, color: T.textSecondary }}>
                <Maximize2 size={11} strokeWidth={2} /> Expand all
              </button>
              <button type="button" onClick={() => setAllCollapsed(true)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 600, color: T.textSecondary }}>
                <Minimize2 size={11} strokeWidth={2} /> Collapse all
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {services.map((instance, index) => {
              const config = catalog.find((s) => s.key === instance.serviceKey);
              if (!config) return null;
              return (
                <div
                  key={instance.instanceId}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIndexRef.current != null) reorder(dragIndexRef.current, index);
                    dragIndexRef.current = null;
                  }}
                >
                  <ServiceCard
                    config={config}
                    instance={instance}
                    collapsed={!!collapsedMap[instance.instanceId]}
                    onToggleCollapse={() => setCollapsedMap((m) => ({ ...m, [instance.instanceId]: !m[instance.instanceId] }))}
                    onChange={(data) => updateInstanceData(instance.instanceId, data)}
                    onDuplicate={() => duplicateInstance(instance.instanceId)}
                    onRemove={() => removeInstance(instance.instanceId)}
                    dragHandleProps={{
                      draggable: true,
                      onDragStart: () => { dragIndexRef.current = index; },
                      onDragEnd: () => { dragIndexRef.current = null; },
                    }}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
