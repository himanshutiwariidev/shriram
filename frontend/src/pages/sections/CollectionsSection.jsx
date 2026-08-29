import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Search, X, Wallet, TrendingUp, IndianRupee,
  Trash2, Edit2,
} from "lucide-react";
import useTenantTheme from "../../hooks/useTenantTheme";
import API from "../../services/api";

const METHODS = ["UPI", "Bank Transfer", "Cash", "Razorpay", "Cheque", "Other"];

const METHOD_COLOR = {
  UPI:             "#8b5cf6",
  "Bank Transfer": "#3b82f6",
  Cash:            "#22c55e",
  Razorpay:        "#0ea5e9",
  Cheque:          "#f59e0b",
  Other:           "#94a3b8",
};

const INR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const EMPTY_FORM = {
  title:       "",
  clientName:  "",
  amount:      "",
  paymentDate: new Date().toISOString().slice(0, 10),
  method:      "Bank Transfer",
  reference:   "",
  notes:       "",
};

function Modal({ title, onClose, children }) {
  const { T } = useTenantTheme();
  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 9000, overflowY: "auto", padding: "32px 16px 48px" }}>
      <div style={{ width: "100%", maxWidth: 500, margin: "0 auto", background: T.card, borderRadius: 18, boxShadow: "0 24px 48px rgba(0,0,0,.2)" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary, fontFamily: "'Syne', sans-serif" }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex", padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ padding: "20px 24px 26px" }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

function KpiCard({ label, value, sub, color, Icon }) {
  const { T } = useTenantTheme();
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
      <div style={{ width: 44, height: 44, borderRadius: 11, background: `${color}18`, display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Icon size={20} color={color} strokeWidth={2} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 21, fontWeight: 700, color: T.textPrimary, fontFamily: "'Syne', sans-serif", lineHeight: 1.2 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

// Must be at module scope to prevent focus loss on parent re-renders
function CollectionForm({ form, setForm, onSubmit, submitLabel, submitting, T }) {
  const inp = { width: "100%", padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: T.inputBg, color: T.textPrimary, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
  const lbl = (txt, req) => (
    <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, marginBottom: 5 }}>
      {txt}{req && <span style={{ color: "#ef4444" }}> *</span>}
    </div>
  );
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
      <div>
        {lbl("Title / Description", true)}
        <input required style={inp} value={form.title} onChange={set("title")} placeholder="e.g. Website payment — ABC Corp" />
      </div>
      <div>
        {lbl("Client Name")}
        <input style={inp} value={form.clientName} onChange={set("clientName")} placeholder="Optional — who paid?" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          {lbl("Amount (₹)", true)}
          <input required type="number" min="1" step="0.01" style={inp}
            value={form.amount} onChange={set("amount")} placeholder="0.00" />
        </div>
        <div>
          {lbl("Payment Date", true)}
          <input required type="date" style={inp}
            value={form.paymentDate} onChange={set("paymentDate")} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          {lbl("Method")}
          <select style={{ ...inp, appearance: "none" }} value={form.method} onChange={set("method")}>
            {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          {lbl("Reference / Transaction ID")}
          <input style={inp} value={form.reference} onChange={set("reference")} placeholder="UTR, TXN ID, etc." />
        </div>
      </div>
      <div>
        {lbl("Notes")}
        <textarea rows={2} style={{ ...inp, resize: "vertical" }}
          value={form.notes} onChange={set("notes")} placeholder="Any additional remarks" />
      </div>
      <button type="submit" disabled={submitting}
        style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", border: "none", borderRadius: 11, padding: "12px", fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? .7 : 1, marginTop: 2 }}>
        {submitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

export default function CollectionsSection() {
  const { T } = useTenantTheme();

  const [collections, setCollections] = useState([]);
  const [summary, setSummary]         = useState({ total: 0, thisMonth: 0, count: 0 });
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd]     = useState("");

  const [showAdd, setShowAdd]       = useState(false);
  const [editItem, setEditItem]     = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]           = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStart) params.start = filterStart;
      if (filterEnd)   params.end   = filterEnd;
      const { data } = await API.get("/collections", { params });
      setCollections(data.collections || []);
      setSummary({ total: data.total || 0, thisMonth: data.thisMonth || 0, count: data.count || 0 });
    } catch { showToast("Failed to load collections", false); }
    finally { setLoading(false); }
  }, [filterStart, filterEnd]);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.post("/collections", form);
      showToast("Collection recorded");
      setShowAdd(false);
      setForm(EMPTY_FORM);
      fetchCollections();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to record collection", false);
    } finally { setSubmitting(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.put(`/collections/${editItem._id}`, form);
      showToast("Collection updated");
      setEditItem(null);
      fetchCollections();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to update", false);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    try {
      await API.delete(`/collections/${deleteItem._id}`);
      showToast("Collection deleted");
      setDeleteItem(null);
      fetchCollections();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to delete", false);
    }
  };

  const openEdit = (c) => {
    setForm({
      title:       c.title,
      clientName:  c.clientName || "",
      amount:      String(c.amount),
      paymentDate: c.paymentDate ? new Date(c.paymentDate).toISOString().slice(0, 10) : "",
      method:      c.method || "Other",
      reference:   c.reference || "",
      notes:       c.notes || "",
    });
    setEditItem(c);
  };

  const filtered = collections.filter((c) => {
    const q = search.toLowerCase();
    if (q && !c.title?.toLowerCase().includes(q) && !c.clientName?.toLowerCase().includes(q) && !c.reference?.toLowerCase().includes(q)) return false;
    if (filterMethod && c.method !== filterMethod) return false;
    return true;
  });

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: toast.ok ? "#22c55e" : "#ef4444", color: "#fff", padding: "12px 20px", borderRadius: 12, fontSize: 13.5, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,.15)" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: T.textPrimary }}>Collections</h2>
          <p style={{ fontSize: 13, color: T.textMuted, marginTop: 3 }}>Record and track all incoming payments</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setForm(EMPTY_FORM); }}
          style={{ display: "flex", alignItems: "center", gap: 7, background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", border: "none", borderRadius: 11, padding: "10px 18px", fontSize: 13.5, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer" }}
        >
          <Plus size={15} strokeWidth={2.5} /> Add Collection
        </button>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <KpiCard label="Total Collected" value={INR(summary.total)}     sub="All time"        color="#10b981" Icon={Wallet}      />
        <KpiCard label="This Month"      value={INR(summary.thisMonth)} sub="Current month"   color="#3b82f6" Icon={TrendingUp}  />
        <KpiCard label="Total Entries"   value={summary.count}          sub="Payment records" color="#8b5cf6" Icon={IndianRupee} />
      </div>

      {/* Filters */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: 180 }}>
          <Search size={13} color={T.textMuted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, client, reference…"
            style={{ width: "100%", paddingLeft: 30, paddingRight: 10, paddingTop: 8, paddingBottom: 8, borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: T.inputBg, color: T.textPrimary, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
        </div>
        <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: T.inputBg, color: T.textPrimary, fontSize: 13, fontFamily: "inherit", outline: "none", minWidth: 130 }}>
          <option value="">All methods</option>
          {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: T.inputBg, color: T.textPrimary, fontSize: 13, fontFamily: "inherit", outline: "none" }} />
        <span style={{ fontSize: 12, color: T.textMuted }}>to</span>
        <input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: T.inputBg, color: T.textPrimary, fontSize: 13, fontFamily: "inherit", outline: "none" }} />
        {(filterStart || filterEnd || filterMethod || search) && (
          <button onClick={() => { setSearch(""); setFilterMethod(""); setFilterStart(""); setFilterEnd(""); }}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 12px", borderRadius: 9, border: `1.5px solid ${T.border}`, background: "none", cursor: "pointer", color: T.textMuted, fontSize: 12.5, fontFamily: "inherit" }}>
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                {["Title / Description", "Client", "Amount", "Method", "Date", "Reference", "Source", ""].map((h, i) => (
                  <th key={i} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11.5, fontWeight: 600, color: T.textMuted, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 48, textAlign: "center", color: T.textMuted }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "56px 0", textAlign: "center" }}>
                    <Wallet size={36} strokeWidth={1.2} color={T.textMuted} style={{ opacity: .3, display: "block", margin: "0 auto 12px" }} />
                    <div style={{ color: T.textSecondary, fontSize: 14, fontFamily: "'Syne', sans-serif", fontWeight: 600 }}>No collections yet</div>
                    <div style={{ color: T.textMuted, fontSize: 12.5, marginTop: 5 }}>Click "Add Collection" to record your first payment</div>
                  </td>
                </tr>
              ) : filtered.map((c) => {
                const mc = METHOD_COLOR[c.method] || "#94a3b8";
                return (
                  <tr key={c._id} style={{ borderBottom: `1px solid ${T.borderLight}`, transition: "background .12s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = T.bg}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, color: T.textPrimary, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                      {c.notes && <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.notes}</div>}
                    </td>
                    <td style={{ padding: "12px 16px", color: T.textSecondary }}>{c.clientName || <span style={{ color: T.textMuted }}>—</span>}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontWeight: 700, color: "#10b981", fontFamily: "'Syne', sans-serif", fontSize: 14 }}>{INR(c.amount)}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: `${mc}15`, color: mc }}>{c.method || "—"}</span>
                    </td>
                    <td style={{ padding: "12px 16px", color: T.textMuted, whiteSpace: "nowrap" }}>
                      {c.paymentDate ? new Date(c.paymentDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: T.textMuted, maxWidth: 140 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.reference || "—"}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                        background: c.source === "proposal" ? "#eff6ff" : "#f0fdf4",
                        color:      c.source === "proposal" ? "#3b82f6"  : "#16a34a" }}>
                        {c.source === "proposal" ? "Proposal" : "Manual"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {c.source !== "proposal" && (
                          <button onClick={() => openEdit(c)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex", padding: 5, borderRadius: 6, transition: "color .15s" }}
                            onMouseEnter={(e) => e.currentTarget.style.color = "#3b82f6"}
                            onMouseLeave={(e) => e.currentTarget.style.color = T.textMuted}>
                            <Edit2 size={14} />
                          </button>
                        )}
                        {c.source !== "proposal" && (
                          <button onClick={() => setDeleteItem(c)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex", padding: 5, borderRadius: 6, transition: "color .15s" }}
                            onMouseEnter={(e) => e.currentTarget.style.color = "#ef4444"}
                            onMouseLeave={(e) => e.currentTarget.style.color = T.textMuted}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: T.textMuted }}>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary, fontFamily: "'Syne', sans-serif" }}>
              Total: {INR(filtered.reduce((s, c) => s + (c.amount || 0), 0))}
            </span>
          </div>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <Modal title="Add Collection" onClose={() => setShowAdd(false)}>
          <CollectionForm form={form} setForm={setForm} onSubmit={handleAdd} submitLabel="Record Collection" submitting={submitting} T={T} />
        </Modal>
      )}

      {/* Edit modal */}
      {editItem && (
        <Modal title="Edit Collection" onClose={() => setEditItem(null)}>
          <CollectionForm form={form} setForm={setForm} onSubmit={handleEdit} submitLabel="Save Changes" submitting={submitting} T={T} />
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteItem && (
        <Modal title="Delete Collection" onClose={() => setDeleteItem(null)}>
          <p style={{ fontSize: 13.5, color: T.textSecondary, marginBottom: 20 }}>
            Delete <strong style={{ color: T.textPrimary }}>{deleteItem.title}</strong> ({INR(deleteItem.amount)})? This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setDeleteItem(null)}
              style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: "none", cursor: "pointer", color: T.textSecondary, fontFamily: "inherit", fontSize: 13.5 }}>Cancel</button>
            <button onClick={handleDelete}
              style={{ flex: 1, padding: "11px", borderRadius: 10, background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600 }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
