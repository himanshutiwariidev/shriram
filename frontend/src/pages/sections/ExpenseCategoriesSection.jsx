import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Edit2, Trash2, X, Tag } from "lucide-react";
import useTenantTheme from "../../hooks/useTenantTheme";
import API from "../../services/api";

const PRESET_COLORS = ["#ef4444","#f97316","#f59e0b","#22c55e","#10b981","#14b8a6","#0ea5e9","#3b82f6","#6366f1","#8b5cf6","#ec4899","#94a3b8"];
const EMPTY_FORM = { name: "", color: "#0ea5e9", icon: "Receipt" };

function Modal({ title, onClose, children }) {
  const { T } = useTenantTheme();
  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 9000, overflowY: "auto", padding: "32px 16px 48px" }}>
      <div style={{ width: "100%", maxWidth: 460, margin: "0 auto", background: T.card, borderRadius: 18, boxShadow: "0 24px 48px rgba(0,0,0,.2)" }}>
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

export default function ExpenseCategoriesSection() {
  const { T } = useTenantTheme();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [deleteCat, setDeleteCat] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const fetchCategories = async () => {
    setLoading(true);
    try { const { data } = await API.get("/expense-categories"); setCategories(data.categories || []); }
    catch { /* keep */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try { await API.post("/expense-categories", form); showToast("Category created"); setShowAdd(false); setForm(EMPTY_FORM); fetchCategories(); }
    catch (err) { showToast(err?.response?.data?.message || "Failed", false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try { await API.put(`/expense-categories/${editCat._id}`, form); showToast("Category updated"); setEditCat(null); fetchCategories(); }
    catch (err) { showToast(err?.response?.data?.message || "Failed", false); }
  };

  const handleDelete = async () => {
    try { await API.delete(`/expense-categories/${deleteCat._id}`); showToast("Category deleted"); setDeleteCat(null); fetchCategories(); }
    catch (err) { showToast(err?.response?.data?.message || "Failed", false); }
  };

  const openEdit = (cat) => { setEditCat(cat); setForm({ name: cat.name, color: cat.color, icon: cat.icon }); };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const inpStyle = { width: "100%", padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: T.inputBg, color: T.textPrimary, fontSize: 13, fontFamily: "inherit", outline: "none" };

  const CategoryForm = ({ onSubmit, submitLabel }) => (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, marginBottom: 5 }}>Name *</div>
        <input className="inp" style={inpStyle} value={form.name} onChange={set("name")} placeholder="e.g. Office Supplies" required />
      </div>
      <div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, marginBottom: 8 }}>Color</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {PRESET_COLORS.map((c) => (
            <div key={c} onClick={() => setForm((f) => ({ ...f, color: c }))}
              style={{ width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer", border: form.color === c ? "3px solid #0f172a" : "3px solid transparent", transition: "border .15s" }} />
          ))}
        </div>
        <input type="color" value={form.color} onChange={set("color")} style={{ marginTop: 8, height: 32, borderRadius: 6, border: `1.5px solid ${T.inputBorder}`, padding: "2px 4px", background: T.inputBg, cursor: "pointer" }} />
      </div>
      <div>
        <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, marginBottom: 5 }}>Icon name (Lucide)</div>
        <input className="inp" style={inpStyle} value={form.icon} onChange={set("icon")} placeholder="e.g. Receipt, Wallet, Building2" />
      </div>
      <button type="submit" className="pri-btn" style={{ background: `linear-gradient(135deg, ${form.color}, ${form.color}cc)`, color: "#fff", borderRadius: 11, padding: "12px", fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", border: "none", cursor: "pointer" }}>
        {submitLabel}
      </button>
    </form>
  );

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: toast.ok ? T.green : T.red, color: "#fff", padding: "12px 20px", borderRadius: 12, fontSize: 13.5, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,.15)" }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: T.textPrimary }}>Expense Categories</h2>
          <p style={{ fontSize: 13, color: T.textMuted, marginTop: 3 }}>{categories.length} categories</p>
        </div>
        <button onClick={() => { setShowAdd(true); setForm(EMPTY_FORM); }} className="pri-btn"
          style={{ display: "flex", alignItems: "center", gap: 7, background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff", borderRadius: 11, padding: "10px 18px", fontSize: 13.5, fontWeight: 700, fontFamily: "'Syne', sans-serif", border: "none", cursor: "pointer" }}>
          <Plus size={15} strokeWidth={2.5} /> Add Category
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: T.textMuted }}>Loading…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {categories.map((cat) => (
            <div key={cat._id} className="card card-in" style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: "18px 18px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${cat.color}18`, display: "grid", placeItems: "center" }}>
                  <Tag size={20} color={cat.color} strokeWidth={2} />
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => openEdit(cat)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex", padding: 5, borderRadius: 7 }}><Edit2 size={13} /></button>
                  <button onClick={() => setDeleteCat(cat)} style={{ background: "none", border: "none", cursor: "pointer", color: T.red, display: "flex", padding: 5, borderRadius: 7 }}><Trash2 size={13} /></button>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary }}>{cat.name}</div>
                <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>Icon: {cat.icon}</div>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: `${cat.color}40` }}>
                <div style={{ height: "100%", borderRadius: 2, background: cat.color, width: "100%" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <Modal title="New Category" onClose={() => setShowAdd(false)}><CategoryForm onSubmit={handleCreate} submitLabel="Create Category" /></Modal>}
      {editCat && <Modal title="Edit Category" onClose={() => setEditCat(null)}><CategoryForm onSubmit={handleUpdate} submitLabel="Save Changes" /></Modal>}

      {deleteCat && (
        <Modal title="Delete Category" onClose={() => setDeleteCat(null)}>
          <p style={{ fontSize: 13.5, color: T.textSecondary, marginBottom: 20 }}>
            Delete category <strong style={{ color: T.textPrimary }}>{deleteCat.name}</strong>? Existing expenses will remain but lose this category association.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setDeleteCat(null)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: "none", cursor: "pointer", color: T.textSecondary, fontFamily: "inherit", fontSize: 13.5 }}>Cancel</button>
            <button onClick={handleDelete} className="pri-btn" style={{ flex: 1, padding: "11px", borderRadius: 10, background: T.red, color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600 }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
