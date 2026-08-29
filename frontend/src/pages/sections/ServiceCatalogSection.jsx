import React, { useCallback, useEffect, useState } from "react";
import {
  Plus, ChevronRight, ChevronDown, Pencil, Trash2, Check, X,
  Save, ArrowLeft, Settings, GripVertical, CheckCircle2, AlertCircle,
} from "lucide-react";
import API from "../../services/api";
import { T } from "./shared";
import { SERVICE_ICONS, resolveServiceIcon } from "../../config/serviceIcons";

const slug = (label) =>
  label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

// ── immutable tree helpers ─────────────────────────────────────────────────

const setAt = (node, path, updater) => {
  if (!path.length) return updater(node);
  const children = [...(node.children || [])];
  children[path[0]] = setAt(children[path[0]], path.slice(1), updater);
  return { ...node, children };
};

const removeAt = (node, path) => {
  if (path.length === 1) {
    const children = [...(node.children || [])];
    children.splice(path[0], 1);
    return { ...node, children };
  }
  const children = [...(node.children || [])];
  children[path[0]] = removeAt(children[path[0]], path.slice(1));
  return { ...node, children };
};

// ── constants ──────────────────────────────────────────────────────────────

const FIELD_TYPES = [
  { value: "text", label: "Short Text" },
  { value: "number", label: "Number" },
  { value: "textarea", label: "Long Text" },
  { value: "toggle", label: "Toggle (yes/no)" },
  { value: "date", label: "Date" },
  { value: "tags", label: "Tags" },
  { value: "select", label: "Dropdown (single)" },
  { value: "multiselect", label: "Multi-select" },
  { value: "radio", label: "Radio buttons" },
];

const ICON_NAMES = Object.keys(SERVICE_ICONS);

// ── small shared styles ────────────────────────────────────────────────────

const inp = {
  border: `1.5px solid ${T.inputBorder}`,
  borderRadius: 8,
  padding: "7px 10px",
  fontSize: 12.5,
  fontFamily: "inherit",
  background: "#fff",
  color: T.textPrimary,
  outline: "none",
};

const btn = (bg, color = "#fff") => ({
  background: bg,
  color,
  border: "none",
  borderRadius: 8,
  padding: "7px 14px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
});

const ghost = {
  background: "none",
  border: `1px solid ${T.inputBorder}`,
  borderRadius: 8,
  padding: "7px 12px",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
  color: T.textSecondary,
};

// ── IconPicker ─────────────────────────────────────────────────────────────

function IconPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = ICON_NAMES.filter((n) => !query || n.toLowerCase().includes(query.toLowerCase()));
  const Icon = resolveServiceIcon(value);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: 6, ...inp, cursor: "pointer" }}
      >
        <Icon size={14} color={T.brand} />
        <span style={{ color: T.textSecondary, fontSize: 12 }}>{value || "Select icon"}</span>
        <ChevronDown size={12} color={T.textMuted} />
      </button>
      {open && (
        <div style={{
          position: "absolute", zIndex: 200, top: "calc(100% + 4px)", left: 0,
          background: "#fff", border: `1.5px solid ${T.border}`, borderRadius: 12,
          padding: 10, width: 280, boxShadow: "0 8px 32px rgba(0,0,0,.12)",
        }}>
          <input
            autoFocus
            placeholder="Search icons…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ ...inp, width: "100%", marginBottom: 8, boxSizing: "border-box" }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, maxHeight: 180, overflowY: "auto" }}>
            {filtered.map((name) => {
              const Ic = SERVICE_ICONS[name];
              const active = name === value;
              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => { onChange(name); setOpen(false); setQuery(""); }}
                  style={{
                    display: "grid", placeItems: "center", padding: 8, borderRadius: 7, cursor: "pointer",
                    border: `1.5px solid ${active ? T.brand : "transparent"}`,
                    background: active ? T.brandLight : "#f8f9fc",
                  }}
                >
                  <Ic size={14} color={active ? T.brand : T.textMuted} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── TreeNode (recursive) ───────────────────────────────────────────────────

function TreeNode({ node, path, depth, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(node.label);
  const [addingChild, setAddingChild] = useState(false);
  const [childForm, setChildForm] = useState({ label: "", type: "group" });
  const [addingField, setAddingField] = useState(false);
  const [fieldForm, setFieldForm] = useState({ label: "", type: "text", options: "" });

  const isLeaf = node.type === "optionLeaf";
  const isGroup = node.type === "group";
  const fields = node.fields || [];
  const children = node.children || [];
  const hasContent = fields.length > 0 || children.length > 0;

  const depthColor = depth === 0 ? T.brandLight : depth === 1 ? "#f0f4ff" : "#f8f9fc";
  const depthBorder = depth === 0 ? T.brand : depth === 1 ? "#c7d2fe" : T.inputBorder;

  const commitRename = () => {
    const label = renameVal.trim();
    if (label) onUpdate((n) => ({ ...n, label }));
    setRenaming(false);
  };

  const commitAddChild = () => {
    const label = childForm.label.trim();
    if (!label) return;
    const key = slug(label);
    const child = { key, label, type: childForm.type, children: [], fields: [] };
    onUpdate((n) => ({ ...n, children: [...(n.children || []), child] }));
    setChildForm({ label: "", type: "group" });
    setAddingChild(false);
    setExpanded(true);
  };

  const commitAddField = () => {
    const label = fieldForm.label.trim();
    if (!label) return;
    const field = { key: slug(label), label, type: fieldForm.type };
    if (["select", "multiselect", "radio"].includes(fieldForm.type)) {
      field.options = fieldForm.options.split(",").map((o) => o.trim()).filter(Boolean);
    }
    onUpdate((n) => ({ ...n, fields: [...(n.fields || []), field] }));
    setFieldForm({ label: "", type: "text", options: "" });
    setAddingField(false);
  };

  const deleteField = (fi) => {
    onUpdate((n) => {
      const flds = [...(n.fields || [])];
      flds.splice(fi, 1);
      return { ...n, fields: flds };
    });
  };

  return (
    <div style={{ marginLeft: depth > 0 ? 20 : 0, marginBottom: 4 }}>
      {/* ── node row ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "7px 10px",
        borderRadius: 9, background: depthColor, border: `1.5px solid ${depthBorder}`,
      }}>
        {isGroup ? (
          <button type="button" onClick={() => setExpanded((v) => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 2, flexShrink: 0 }}>
            {expanded ? <ChevronDown size={13} color={T.textMuted} /> : <ChevronRight size={13} color={T.textMuted} />}
          </button>
        ) : <div style={{ width: 17 }} />}

        {renaming ? (
          <input
            autoFocus value={renameVal}
            onChange={(e) => setRenameVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(false); }}
            style={{ ...inp, flex: 1, padding: "4px 8px" }}
          />
        ) : (
          <span style={{ flex: 1, fontSize: 13, fontWeight: depth === 0 ? 700 : 600, color: T.textPrimary, cursor: "default" }}>
            {node.label}
            {fields.length > 0 && (
              <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 400, marginLeft: 6 }}>
                {fields.length} field{fields.length !== 1 ? "s" : ""}
              </span>
            )}
          </span>
        )}

        {/* type badge */}
        <span style={{
          fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 5, flexShrink: 0,
          color: isLeaf ? "#7c3aed" : T.brand,
          background: isLeaf ? "#f3f0ff" : "#fff",
          textTransform: "uppercase", letterSpacing: ".06em",
          border: `1px solid ${isLeaf ? "#c4b5fd" : T.brandMid}`,
        }}>
          {isLeaf ? "leaf" : "group"}
        </span>

        {/* actions */}
        {renaming ? (
          <>
            <button type="button" onClick={commitRename} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 3 }}><Check size={12} color={T.green} /></button>
            <button type="button" onClick={() => { setRenaming(false); setRenameVal(node.label); }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 3 }}><X size={12} color={T.red} /></button>
          </>
        ) : (
          <>
            <button type="button" title="Rename" onClick={() => { setRenameVal(node.label); setRenaming(true); }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 3 }}><Pencil size={11} color={T.textMuted} /></button>
            {isGroup && (
              <button type="button" title="Add sub-service" onClick={() => setAddingChild(true)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 3 }}>
                <Plus size={12} color={T.brand} />
              </button>
            )}
            <button type="button" title="Add field" onClick={() => setAddingField(true)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 3 }}>
              <Settings size={11} color={T.textMuted} />
            </button>
            {depth > 0 && (
              <button type="button" title="Delete node" onClick={() => { if (window.confirm(`Delete "${node.label}" and all its children?`)) onDelete(); }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 3 }}>
                <Trash2 size={11} color={T.red} />
              </button>
            )}
          </>
        )}
      </div>

      {/* ── fields list ── */}
      {(fields.length > 0 || addingField) && (
        <div style={{ marginLeft: 24, marginTop: 3, marginBottom: 3 }}>
          {fields.map((field, fi) => (
            <div key={fi} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "5px 10px",
              background: "#fff", border: `1px solid ${T.inputBorder}`, borderRadius: 7, marginBottom: 2,
            }}>
              <span style={{
                fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 4, flexShrink: 0,
                color: T.brand, background: T.brandLight, textTransform: "uppercase", letterSpacing: ".05em",
              }}>{field.type}</span>
              <span style={{ fontSize: 12, color: T.textPrimary, flex: 1 }}>{field.label}</span>
              {field.options?.length > 0 && (
                <span style={{ fontSize: 10.5, color: T.textMuted, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {field.options.slice(0, 4).join(", ")}{field.options.length > 4 ? "…" : ""}
                </span>
              )}
              <button type="button" onClick={() => deleteField(fi)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 2 }}>
                <Trash2 size={10} color={T.red} />
              </button>
            </div>
          ))}
          {addingField && (
            <div style={{ background: "#fff", border: `1.5px solid ${T.brand}`, borderRadius: 9, padding: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.brand, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 7 }}>Add Field</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input
                  autoFocus placeholder="Field label (e.g. Quantity, Platform)"
                  value={fieldForm.label}
                  onChange={(e) => setFieldForm((f) => ({ ...f, label: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") commitAddField(); }}
                  style={{ ...inp, flex: 1 }}
                />
                <select value={fieldForm.type} onChange={(e) => setFieldForm((f) => ({ ...f, type: e.target.value }))} style={inp}>
                  {FIELD_TYPES.map((ft) => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                </select>
              </div>
              {["select", "multiselect", "radio"].includes(fieldForm.type) && (
                <input
                  placeholder="Options (comma-separated): Low, Medium, High"
                  value={fieldForm.options}
                  onChange={(e) => setFieldForm((f) => ({ ...f, options: e.target.value }))}
                  style={{ ...inp, width: "100%", boxSizing: "border-box", marginBottom: 6 }}
                />
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={commitAddField} style={btn(T.green)}>Add Field</button>
                <button type="button" onClick={() => { setAddingField(false); setFieldForm({ label: "", type: "text", options: "" }); }} style={ghost}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── add child inline form ── */}
      {addingChild && (
        <div style={{ marginLeft: 24, marginTop: 3, marginBottom: 6 }}>
          <div style={{ background: "#fff", border: `1.5px solid ${T.brand}`, borderRadius: 9, padding: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.brand, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 7 }}>Add Sub-service</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <input
                autoFocus placeholder="Name (e.g. Facebook, AI Reels)"
                value={childForm.label}
                onChange={(e) => setChildForm((f) => ({ ...f, label: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") commitAddChild(); }}
                style={{ ...inp, flex: 1 }}
              />
              <select value={childForm.type} onChange={(e) => setChildForm((f) => ({ ...f, type: e.target.value }))} style={inp}>
                <option value="group">Group (has sub-items)</option>
                <option value="optionLeaf">Option Leaf (end item)</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={commitAddChild} style={btn(T.brand)}>Add</button>
              <button type="button" onClick={() => { setAddingChild(false); setChildForm({ label: "", type: "group" }); }} style={ghost}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── children ── */}
      {isGroup && expanded && children.map((child, i) => (
        <TreeNode
          key={`${child.key || child.label}_${i}`}
          node={child}
          path={[...path, i]}
          depth={depth + 1}
          onUpdate={(updater) => onUpdate((parent) => {
            const chs = [...(parent.children || [])];
            chs[i] = updater(chs[i]);
            return { ...parent, children: chs };
          })}
          onDelete={() => onUpdate((parent) => {
            const chs = [...(parent.children || [])];
            chs.splice(i, 1);
            return { ...parent, children: chs };
          })}
        />
      ))}
    </div>
  );
}

// ── Add Service Form ───────────────────────────────────────────────────────

function AddServiceForm({ onSave, onCancel, existingCount }) {
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("Briefcase");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const lbl = label.trim();
    if (!lbl) return;
    setBusy(true);
    setErr("");
    const key = slug(lbl);
    try {
      await API.post("/superadmin/services", {
        key, label: lbl, icon, sortOrder: existingCount,
        config: { key, label: lbl, icon, type: "group", children: [], fields: [] },
      });
      onSave();
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to create service");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ background: "#fff", border: `1.5px solid ${T.brand}`, borderRadius: 13, padding: 20, marginBottom: 16, boxShadow: "0 4px 20px rgba(247,147,30,.08)" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, fontFamily: "'Syne', sans-serif", marginBottom: 14 }}>New Service</div>
      {err && (
        <div style={{ background: T.redBg, border: `1px solid ${T.redBorder}`, color: T.red, borderRadius: 8, padding: "7px 12px", fontSize: 12, marginBottom: 10 }}>{err}</div>
      )}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          autoFocus required
          placeholder="Service name (e.g. Print Media, SEO)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={{ ...inp, flex: 1, minWidth: 200 }}
        />
        <IconPicker value={icon} onChange={setIcon} />
        <div style={{ display: "flex", gap: 6 }}>
          <button type="submit" disabled={busy} style={btn(T.brand)}>{busy ? "Creating…" : "Create Service"}</button>
          <button type="button" onClick={onCancel} style={ghost}>Cancel</button>
        </div>
      </div>
      <div style={{ fontSize: 11, color: T.textMuted, marginTop: 8 }}>
        Key will be auto-generated: <strong style={{ color: T.brand }}>{slug(label) || "my_service"}</strong> — this is the internal identifier, cannot be changed later.
      </div>
    </form>
  );
}

// ── Service list row ───────────────────────────────────────────────────────

function ServiceRow({ svc, active, onManage, onDelete }) {
  const Icon = resolveServiceIcon(svc.icon);
  const childCount = (svc.config?.children || []).length;

  return (
    <div
      className="catalog-row"
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
        borderRadius: 11, border: `1.5px solid ${active ? T.brand : T.border}`,
        background: active ? T.brandLight : "#fff", marginBottom: 8,
        transition: "border-color .15s, background .15s", cursor: "default",
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: active ? "#fff" : T.inputBg, display: "grid", placeItems: "center", flexShrink: 0, border: `1.5px solid ${active ? T.brandMid : T.inputBorder}` }}>
        <Icon size={16} color={active ? T.brand : T.textMuted} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary }}>{svc.label}</div>
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>
          key: <code style={{ fontSize: 10.5 }}>{svc.key}</code>
          {" · "}{childCount} top-level sub-service{childCount !== 1 ? "s" : ""}
          {" · "}{svc.icon}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" onClick={() => onManage(svc)} style={btn(active ? T.brand : "#f1f5f9", active ? "#fff" : T.textSecondary)}>
          {active ? "Editing" : "Edit Structure"}
        </button>
        <button type="button" onClick={() => onDelete(svc)} style={{ background: "none", border: `1px solid ${T.redBorder}`, borderRadius: 8, padding: "7px 10px", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <Trash2 size={13} color={T.red} />
        </button>
      </div>
    </div>
  );
}

// ── Service tree editor panel ──────────────────────────────────────────────

function ServiceEditor({ svc, onBack, onSaved }) {
  const [editedSvc, setEditedSvc] = useState(() => JSON.parse(JSON.stringify(svc)));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const updateConfig = useCallback((updater) => {
    setEditedSvc((prev) => {
      const newConfig = updater(prev.config);
      return { ...prev, label: newConfig.label, config: newConfig };
    });
    setDirty(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.put(`/superadmin/services/${editedSvc.key}`, {
        label: editedSvc.label,
        icon: editedSvc.icon,
        sortOrder: editedSvc.sortOrder,
        config: editedSvc.config,
      });
      showToast("Service saved successfully");
      setDirty(false);
      onSaved({ ...editedSvc });
    } catch {
      showToast("Failed to save", false);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (dirty && !window.confirm("You have unsaved changes. Discard and go back?")) return;
    onBack();
  };

  return (
    <div>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <button type="button" onClick={handleBack} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: "7px 12px", cursor: "pointer", color: T.textSecondary, fontSize: 12.5, fontFamily: "inherit" }}>
          <ArrowLeft size={13} strokeWidth={2} /> Back to List
        </button>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: T.textPrimary, margin: 0 }}>
            Editing: {editedSvc.label}
          </h3>
          <p style={{ fontSize: 11, color: T.textMuted, margin: "3px 0 0" }}>key: <code>{editedSvc.key}</code></p>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <IconPicker value={editedSvc.icon} onChange={(icon) => {
            setEditedSvc((prev) => ({ ...prev, icon, config: { ...prev.config, icon } }));
            setDirty(true);
          }} />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !dirty}
            style={{
              ...btn(dirty ? T.brand : "#cbd5e1"),
              display: "flex", alignItems: "center", gap: 6,
              opacity: saving ? .7 : 1,
            }}
          >
            <Save size={13} strokeWidth={2} />
            {saving ? "Saving…" : dirty ? "Save Changes" : "Saved"}
          </button>
        </div>
      </div>

      {/* help text */}
      <div style={{ background: T.brandLight, border: `1px solid ${T.brandMid}`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: T.textSecondary, marginBottom: 16, lineHeight: 1.6 }}>
        <strong style={{ color: T.brand }}>How this works:</strong> Groups can have children (sub-services). Option Leaves are end items — add fields to them to capture information in the proposal (Quantity, Price, Priority, etc.). Changes are saved to the global catalog and will appear in all tenant proposals.
      </div>

      {/* tree */}
      <div style={{ background: "#f8f9fc", border: `1.5px solid ${T.border}`, borderRadius: 13, padding: 16 }}>
        <TreeNode
          node={editedSvc.config}
          path={[]}
          depth={0}
          onUpdate={(updater) => updateConfig((cfg) => updater(cfg))}
          onDelete={() => {}}
        />
      </div>

      {toast && (
        <div style={{
          position: "fixed", bottom: 26, right: 26, zIndex: 9999, background: "#fff",
          border: `1.5px solid ${toast.ok ? T.greenBorder : T.redBorder}`, borderRadius: 13,
          padding: "13px 18px", fontWeight: 500, fontSize: 13, display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,.12)", maxWidth: 340,
        }}>
          {toast.ok
            ? <CheckCircle2 size={16} color={T.green} />
            : <AlertCircle size={16} color={T.red} />}
          <span style={{ color: T.textPrimary }}>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────

export default function ServiceCatalogSection() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/superadmin/services");
      setServices(data.services || []);
    } catch {
      showToast("Failed to load service catalog", false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCatalog(); }, []);

  const handleDelete = async (svc) => {
    if (!window.confirm(`Delete "${svc.label}"? Tenants that use this service in proposals will lose its configuration. This cannot be undone.`)) return;
    try {
      await API.delete(`/superadmin/services/${svc.key}`);
      showToast(`"${svc.label}" deleted`);
      if (selectedKey === svc.key) setSelectedKey(null);
      fetchCatalog();
    } catch {
      showToast("Failed to delete service", false);
    }
  };

  const selectedSvc = services.find((s) => s.key === selectedKey) || null;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, color: T.textMuted, fontSize: 13.5 }}>
        Loading service catalog…
      </div>
    );
  }

  return (
    <div className="fade-up">
      {/* ── if editing a service, show tree editor ── */}
      {selectedSvc ? (
        <ServiceEditor
          key={selectedSvc.key}
          svc={selectedSvc}
          onBack={() => setSelectedKey(null)}
          onSaved={(updated) => {
            setServices((prev) => prev.map((s) => s.key === updated.key ? updated : s));
          }}
        />
      ) : (
        <>
          {/* ── page header ── */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: T.textPrimary, margin: 0 }}>Service Catalog</h2>
              <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 5 }}>
                {services.length} service{services.length !== 1 ? "s" : ""} in the global catalog · Available to all tenants in proposal builder
              </p>
            </div>
            {!adding && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                style={{ ...btn(T.brand), display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", fontSize: 13 }}
              >
                <Plus size={15} strokeWidth={2.5} /> Add Custom Service
              </button>
            )}
          </div>

          {/* ── add service form ── */}
          {adding && (
            <AddServiceForm
              existingCount={services.length}
              onSave={() => { setAdding(false); fetchCatalog(); showToast("Service created — click 'Edit Structure' to add sub-services and fields"); }}
              onCancel={() => setAdding(false)}
            />
          )}

          {/* ── info banner ── */}
          <div style={{
            background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 10,
            padding: "10px 14px", fontSize: 12, color: T.textSecondary, marginBottom: 16, lineHeight: 1.65,
          }}>
            <strong style={{ color: T.textPrimary }}>Global Catalog:</strong> These services appear in the proposal builder for all tenants.
            Per-tenant visibility is controlled in each tenant's <em>Proposal Services</em> tab.
            Editing a service here updates it globally — existing proposals are not affected.
          </div>

          {/* ── service list ── */}
          {services.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: T.textMuted }}>
              <p style={{ fontSize: 14, marginBottom: 8 }}>No services in the catalog yet.</p>
              <p style={{ fontSize: 12 }}>Click "Add Custom Service" to create your first one.</p>
            </div>
          ) : (
            <div>
              {services
                .slice()
                .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label))
                .map((svc) => (
                  <ServiceRow
                    key={svc.key}
                    svc={svc}
                    active={selectedKey === svc.key}
                    onManage={(s) => setSelectedKey(s.key)}
                    onDelete={handleDelete}
                  />
                ))}
            </div>
          )}
        </>
      )}

      {toast && (
        <div style={{
          position: "fixed", bottom: 26, right: 26, zIndex: 9999, background: "#fff",
          border: `1.5px solid ${toast.ok ? T.greenBorder : T.redBorder}`, borderRadius: 13,
          padding: "13px 18px", fontWeight: 500, fontSize: 13, display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,.12)", maxWidth: 360,
        }}>
          {toast.ok
            ? <CheckCircle2 size={16} color={T.green} />
            : <AlertCircle size={16} color={T.red} />}
          <span style={{ color: T.textPrimary, flex: 1 }}>{toast.msg}</span>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 2 }}>
            <X size={13} color={T.textMuted} />
          </button>
        </div>
      )}
    </div>
  );
}
