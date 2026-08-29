import React, { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "Last 7 Days" },
  { key: "last30", label: "Last 30 Days" },
  { key: "thisMonth", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
  { key: "thisYear", label: "This Year" },
  { key: "custom", label: "Custom Range" },
];

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
// toISOString() reports the UTC calendar date, which can be a day off from the
// local date the user actually picked — format from local Y/M/D components instead.
const toInputValue = (d) => {
  const x = new Date(d);
  const year = x.getFullYear();
  const month = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function computeRangeForPreset(key) {
  const now = new Date();
  switch (key) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday": {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return { start: startOfDay(y), end: endOfDay(y) };
    }
    case "last7": {
      const s = new Date(now); s.setDate(s.getDate() - 6);
      return { start: startOfDay(s), end: endOfDay(now) };
    }
    case "last30": {
      const s = new Date(now); s.setDate(s.getDate() - 29);
      return { start: startOfDay(s), end: endOfDay(now) };
    }
    case "thisMonth":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
    case "lastMonth": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: s, end: endOfDay(e) };
    }
    case "thisYear":
      return { start: new Date(now.getFullYear(), 0, 1), end: endOfDay(new Date(now.getFullYear(), 11, 31)) };
    default:
      return null;
  }
}

const fmt = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function DateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(toInputValue(value.start));
  const [customTo, setCustomTo] = useState(toInputValue(value.end));
  const rootRef = useRef(null);

  useEffect(() => {
    setCustomFrom(toInputValue(value.start));
    setCustomTo(toInputValue(value.end));
  }, [value.start, value.end]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const presetLabel = PRESETS.find((p) => p.key === value.presetKey)?.label || "Custom Range";

  const pickPreset = (key) => {
    if (key === "custom") return;
    const range = computeRangeForPreset(key);
    onChange({ ...range, presetKey: key });
    setOpen(false);
  };

  const applyCustom = () => {
    if (!customFrom || !customTo) return;
    const start = startOfDay(new Date(customFrom));
    const end = endOfDay(new Date(customTo));
    if (start > end) return;
    onChange({ start, end, presetKey: "custom" });
    setOpen(false);
  };

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "9px 14px",
          border: "1px solid #e8eaf0", borderRadius: 10, fontSize: 12.5,
          color: "#475569", fontWeight: 500, background: "#fff", cursor: "pointer", fontFamily: "inherit",
        }}
      >
        <Calendar size={14} strokeWidth={2} color="#94a3b8" />
        <span style={{ whiteSpace: "nowrap" }}>{fmt(value.start)} – {fmt(value.end)}</span>
        <ChevronDown size={14} strokeWidth={2} color="#94a3b8" />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 200,
          background: "#fff", border: "1px solid #e8eaf0", borderRadius: 14,
          boxShadow: "0 16px 48px rgba(15,23,42,.14)", width: 300, padding: 14,
          display: "flex", flexDirection: "column", gap: 4,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: ".07em", textTransform: "uppercase", padding: "2px 6px 8px" }}>Quick filters</div>
          {PRESETS.filter((p) => p.key !== "custom").map((p) => {
            const active = value.presetKey === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => pickPreset(p.key)}
                style={{
                  textAlign: "left", padding: "8px 10px", borderRadius: 8, border: "none",
                  background: active ? "var(--tenant-brand-light)" : "transparent", color: active ? "var(--tenant-brand)" : "#334155",
                  fontWeight: active ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {p.label}
              </button>
            );
          })}

          <div style={{ borderTop: "1px solid #f0f1f6", marginTop: 8, paddingTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: ".07em", textTransform: "uppercase", padding: "2px 6px 10px" }}>Custom range</div>
            <div style={{ display: "flex", gap: 8, padding: "0 6px" }}>
              <input
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{ flex: 1, padding: "8px 10px", border: "1px solid #e2e6ef", borderRadius: 8, fontSize: 12.5, fontFamily: "inherit", color: "#0f172a" }}
              />
              <input
                type="date"
                value={customTo}
                min={customFrom}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{ flex: 1, padding: "8px 10px", border: "1px solid #e2e6ef", borderRadius: 8, fontSize: 12.5, fontFamily: "inherit", color: "#0f172a" }}
              />
            </div>
            <button
              type="button"
              onClick={applyCustom}
              style={{
                width: "100%", marginTop: 10, padding: "9px", borderRadius: 8, border: "none",
                background: "var(--tenant-brand)", color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Apply Range
            </button>
          </div>

          {presetLabel === "Custom Range" && (
            <div style={{ fontSize: 11, color: "var(--tenant-brand)", fontWeight: 600, padding: "10px 6px 0" }}>Custom range active</div>
          )}
        </div>
      )}
    </div>
  );
}
