import React, { useEffect, useState, useCallback } from "react";
import API from "../../services/api";
import {
  Megaphone, Plus, Trash2, Edit2, X, AlertTriangle, Info, Zap, ChevronDown,
} from "lucide-react";

const PRIORITY_META = {
  info:    { label: "Info",    color: "#2563eb", bg: "#eff6ff", icon: Info },
  warning: { label: "Warning", color: "#d97706", bg: "#fffbeb", icon: AlertTriangle },
  urgent:  { label: "Urgent",  color: "#dc2626", bg: "#fef2f2", icon: Zap },
};

const EMPTY = {
  title: "", body: "", priority: "info", audienceType: "all",
  targetRoles: [], expiresAt: "",
};

export default function AnnouncementSection() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/announcements");
      setAnnouncements(data.announcements || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY); setEditing(null); setShowForm(true); };
  const openEdit = (a) => {
    setForm({
      title: a.title, body: a.body, priority: a.priority,
      audienceType: a.audienceType, targetRoles: a.targetRoles || [],
      expiresAt: a.expiresAt ? a.expiresAt.slice(0, 10) : "",
    });
    setEditing(a._id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        expiresAt: form.expiresAt || null,
      };
      if (editing) {
        const { data } = await API.put(`/announcements/${editing}`, payload);
        setAnnouncements((p) => p.map((a) => a._id === editing ? data.announcement : a));
      } else {
        const { data } = await API.post("/announcements", payload);
        setAnnouncements((p) => [data.announcement, ...p]);
      }
      setShowForm(false);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this announcement?")) return;
    try {
      await API.delete(`/announcements/${id}`);
      setAnnouncements((p) => p.filter((a) => a._id !== id));
    } catch { /* ignore */ }
  };

  const toggleActive = async (a) => {
    try {
      const { data } = await API.put(`/announcements/${a._id}`, { isActive: !a.isActive });
      setAnnouncements((p) => p.map((x) => x._id === a._id ? data.announcement : x));
    } catch { /* ignore */ }
  };

  const toggleRole = (role) => {
    setForm((f) => ({
      ...f,
      targetRoles: f.targetRoles.includes(role)
        ? f.targetRoles.filter((r) => r !== role)
        : [...f.targetRoles, role],
    }));
  };

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Megaphone size={20} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#1e293b" }}>Announcements</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Post company-wide notices with priority and audience targeting</div>
          </div>
        </div>
        <button
          onClick={openCreate}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
        >
          <Plus size={15} /> New Announcement
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading…</div>
      ) : announcements.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
          <Megaphone size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
          <div>No announcements yet. Create one to notify your team.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {announcements.map((a) => {
            const meta = PRIORITY_META[a.priority] || PRIORITY_META.info;
            const PIcon = meta.icon;
            const expired = a.expiresAt && new Date(a.expiresAt) < new Date();
            return (
              <div key={a._id} style={{
                background: "#fff", border: "1px solid #e8eaf0", borderRadius: 14,
                padding: "18px 20px", borderLeft: `4px solid ${meta.color}`,
                opacity: (!a.isActive || expired) ? 0.6 : 1,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ background: meta.bg, borderRadius: 8, padding: 8, flexShrink: 0 }}>
                    <PIcon size={16} color={meta.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{a.title}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: meta.color, background: meta.bg, border: `1px solid ${meta.color}33`, borderRadius: 6, padding: "2px 8px" }}>{meta.label}</span>
                      {!a.isActive && <span style={{ fontSize: 11, background: "#f1f5f9", color: "#64748b", borderRadius: 6, padding: "2px 8px" }}>Inactive</span>}
                      {expired && <span style={{ fontSize: 11, background: "#fef2f2", color: "#dc2626", borderRadius: 6, padding: "2px 8px" }}>Expired</span>}
                      <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>
                        For: {a.audienceType === "all" ? "Everyone" : a.audienceType === "roles" ? a.targetRoles.join(", ") : "Branches"}
                      </span>
                    </div>
                    <p style={{ margin: "0 0 8px 0", fontSize: 13, color: "#475569", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{a.body}</p>
                    <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#94a3b8" }}>
                      <span>By {a.createdBy?.name || "Admin"}</span>
                      <span>{new Date(a.createdAt).toLocaleDateString("en-IN")}</span>
                      {a.expiresAt && <span>Expires {new Date(a.expiresAt).toLocaleDateString("en-IN")}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => toggleActive(a)} title={a.isActive ? "Deactivate" : "Activate"}
                      style={{ background: a.isActive ? "#f0fdf4" : "#f8fafc", color: a.isActive ? "#16a34a" : "#64748b", border: `1px solid ${a.isActive ? "#bbf7d0" : "#e2e8f0"}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      {a.isActive ? "Active" : "Inactive"}
                    </button>
                    <button onClick={() => openEdit(a)} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#64748b" }}>
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleDelete(a._id)} style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: "#dc2626" }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 540, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 17, color: "#1e293b" }}>{editing ? "Edit Announcement" : "New Announcement"}</div>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={20} /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Title *</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} style={inputStyle} placeholder="e.g. Office Closure on Monday" />
              </div>

              <div>
                <label style={labelStyle}>Message *</label>
                <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} style={{ ...inputStyle, height: 100, resize: "vertical" }} placeholder="Write your announcement…" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Priority</label>
                  <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} style={inputStyle}>
                    <option value="info">ℹ️ Info</option>
                    <option value="warning">⚠️ Warning</option>
                    <option value="urgent">🚨 Urgent</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Audience</label>
                  <select value={form.audienceType} onChange={(e) => setForm((f) => ({ ...f, audienceType: e.target.value }))} style={inputStyle}>
                    <option value="all">Everyone</option>
                    <option value="roles">By Role</option>
                  </select>
                </div>
              </div>

              {form.audienceType === "roles" && (
                <div>
                  <label style={labelStyle}>Target Roles</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["admin", "sales", "employee", "hr", "manager"].map((role) => (
                      <button key={role} onClick={() => toggleRole(role)}
                        style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: "1px solid", cursor: "pointer", fontFamily: "inherit",
                          background: form.targetRoles.includes(role) ? "#2563eb" : "#f1f5f9",
                          color: form.targetRoles.includes(role) ? "#fff" : "#64748b",
                          borderColor: form.targetRoles.includes(role) ? "#2563eb" : "#e2e8f0",
                        }}>
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={labelStyle}>Expires On (optional)</label>
                <input type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} style={inputStyle} />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button onClick={() => setShowForm(false)} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13, opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Saving…" : editing ? "Update" : "Publish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 5 };
const inputStyle = {
  width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #e2e8f0",
  fontSize: 13, fontFamily: "inherit", color: "#1e293b", boxSizing: "border-box",
  outline: "none", background: "#f8fafc",
};
