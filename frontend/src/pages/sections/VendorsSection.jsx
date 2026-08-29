import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Edit2, Trash2, X, Store, Mail, Phone } from "lucide-react";
import useTenantTheme from "../../hooks/useTenantTheme";
import API from "../../services/api";

const EMPTY_FORM = { name: "", email: "", phone: "", gstNumber: "", pan: "", address: "", paymentTerms: "", notes: "" };

function Modal({ title, onClose, children }) {
  const { T } = useTenantTheme();
  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 9000, overflowY: "auto", padding: "32px 16px 48px" }}>
      <div style={{ width: "100%", maxWidth: 540, margin: "0 auto", background: T.card, borderRadius: 18, boxShadow: "0 24px 48px rgba(0,0,0,.2)" }}>
        <div style={{ padding: "22px 24px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary, fontFamily: "'Syne', sans-serif" }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex", padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ padding: "20px 24px 28px" }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

export default function VendorsSection() {
  const { T } = useTenantTheme();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editVendor, setEditVendor] = useState(null);
  const [deleteVendor, setDeleteVendor] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const fetchVendors = async () => {
    setLoading(true);
    try { const { data } = await API.get("/vendors"); setVendors(data.vendors || []); }
    catch { /* keep */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchVendors(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try { await API.post("/vendors", form); showToast("Vendor created"); setShowAdd(false); setForm(EMPTY_FORM); fetchVendors(); }
    catch (err) { showToast(err?.response?.data?.message || "Failed", false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try { await API.put(`/vendors/${editVendor._id}`, form); showToast("Vendor updated"); setEditVendor(null); fetchVendors(); }
    catch (err) { showToast(err?.response?.data?.message || "Failed", false); }
  };

  const handleDelete = async () => {
    try { await API.delete(`/vendors/${deleteVendor._id}`); showToast("Vendor deleted"); setDeleteVendor(null); fetchVendors(); }
    catch (err) { showToast(err?.response?.data?.message || "Failed", false); }
  };

  const openEdit = (v) => { setEditVendor(v); setForm({ name: v.name || "", email: v.email || "", phone: v.phone || "", gstNumber: v.gstNumber || "", pan: v.pan || "", address: v.address || "", paymentTerms: v.paymentTerms || "", notes: v.notes || "" }); };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const inpStyle = { width: "100%", padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: T.inputBg, color: T.textPrimary, fontSize: 13, fontFamily: "inherit", outline: "none" };
  const label = (txt) => <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, marginBottom: 5 }}>{txt}</div>;

  const VendorForm = ({ onSubmit, submitLabel }) => (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ gridColumn: "1/-1" }}>
          {label("Vendor Name *")}
          <input className="inp" style={inpStyle} value={form.name} onChange={set("name")} placeholder="ABC Suppliers Pvt. Ltd." required />
        </div>
        <div>
          {label("Email")}
          <input className="inp" style={inpStyle} type="email" value={form.email} onChange={set("email")} placeholder="billing@vendor.com" />
        </div>
        <div>
          {label("Phone")}
          <input className="inp" style={inpStyle} value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" />
        </div>
        <div>
          {label("GST Number")}
          <input className="inp" style={inpStyle} value={form.gstNumber} onChange={set("gstNumber")} placeholder="29ABCDE1234F1Z5" />
        </div>
        <div>
          {label("PAN")}
          <input className="inp" style={{ ...inpStyle, textTransform: "uppercase" }} value={form.pan} onChange={set("pan")} placeholder="ABCDE1234F" maxLength={10} />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          {label("Address")}
          <input className="inp" style={inpStyle} value={form.address} onChange={set("address")} placeholder="Full business address" />
        </div>
        <div>
          {label("Payment Terms")}
          <input className="inp" style={inpStyle} value={form.paymentTerms} onChange={set("paymentTerms")} placeholder="e.g. Net 30" />
        </div>
        <div>
          {label("Notes")}
          <input className="inp" style={inpStyle} value={form.notes} onChange={set("notes")} placeholder="Internal notes" />
        </div>
      </div>
      <button type="submit" className="pri-btn" style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", color: "#fff", borderRadius: 11, padding: "12px", fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", border: "none", cursor: "pointer", marginTop: 4 }}>
        {submitLabel}
      </button>
    </form>
  );

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: toast.ok ? T.green : T.red, color: "#fff", padding: "12px 20px", borderRadius: 12, fontSize: 13.5, fontWeight: 600 }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: T.textPrimary }}>Vendors</h2>
          <p style={{ fontSize: 13, color: T.textMuted, marginTop: 3 }}>{vendors.length} vendors</p>
        </div>
        <button onClick={() => { setShowAdd(true); setForm(EMPTY_FORM); }} className="pri-btn"
          style={{ display: "flex", alignItems: "center", gap: 7, background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", color: "#fff", borderRadius: 11, padding: "10px 18px", fontSize: 13.5, fontWeight: 700, fontFamily: "'Syne', sans-serif", border: "none", cursor: "pointer" }}>
          <Plus size={15} strokeWidth={2.5} /> Add Vendor
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: T.textMuted }}>Loading…</div>
      ) : vendors.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: T.textMuted }}>
          <Store size={36} strokeWidth={1.2} style={{ opacity: .35, marginBottom: 10 }} /><div>No vendors yet</div>
        </div>
      ) : (
        <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
          {vendors.map((v, i) => (
            <div key={v._id} className="data-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: i < vendors.length - 1 ? `1px solid ${T.borderLight}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: "#8b5cf618", display: "grid", placeItems: "center" }}>
                  <Store size={18} color="#8b5cf6" strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary }}>{v.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 3 }}>
                    {v.email && <span style={{ fontSize: 12, color: T.textMuted, display: "flex", alignItems: "center", gap: 4 }}><Mail size={11} />{v.email}</span>}
                    {v.phone && <span style={{ fontSize: 12, color: T.textMuted, display: "flex", alignItems: "center", gap: 4 }}><Phone size={11} />{v.phone}</span>}
                    {v.gstNumber && <span style={{ fontSize: 11, color: T.textMuted }}>GST: {v.gstNumber}</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => openEdit(v)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex", padding: 6 }}><Edit2 size={14} /></button>
                <button onClick={() => setDeleteVendor(v)} style={{ background: "none", border: "none", cursor: "pointer", color: T.red, display: "flex", padding: 6 }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <Modal title="New Vendor" onClose={() => setShowAdd(false)}><VendorForm onSubmit={handleCreate} submitLabel="Create Vendor" /></Modal>}
      {editVendor && <Modal title="Edit Vendor" onClose={() => setEditVendor(null)}><VendorForm onSubmit={handleUpdate} submitLabel="Save Changes" /></Modal>}

      {deleteVendor && (
        <Modal title="Delete Vendor" onClose={() => setDeleteVendor(null)}>
          <p style={{ fontSize: 13.5, color: T.textSecondary, marginBottom: 20 }}>Delete <strong style={{ color: T.textPrimary }}>{deleteVendor.name}</strong>? This cannot be undone.</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setDeleteVendor(null)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: "none", cursor: "pointer", color: T.textSecondary, fontFamily: "inherit", fontSize: 13.5 }}>Cancel</button>
            <button onClick={handleDelete} className="pri-btn" style={{ flex: 1, padding: "11px", borderRadius: 10, background: T.red, color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600 }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
