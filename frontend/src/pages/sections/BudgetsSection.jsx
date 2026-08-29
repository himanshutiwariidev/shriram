import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Edit2, Trash2, X, Wallet, AlertCircle } from "lucide-react";
import useTenantTheme from "../../hooks/useTenantTheme";
import API from "../../services/api";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 1 + i);

const EMPTY_FORM = {
  name: "", period: "monthly", year: String(CURRENT_YEAR),
  month: String(new Date().getMonth() + 1), amount: "", categoryId: "", departmentId: "", notes: "",
};

function Modal({ title, onClose, children }) {
  const { T } = useTenantTheme();
  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 9000, overflowY: "auto", padding: "32px 16px 48px" }}>
      <div style={{ width: "100%", maxWidth: 520, margin: "0 auto", background: T.card, borderRadius: 18, boxShadow: "0 24px 48px rgba(0,0,0,.2)" }}>
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

function UsageBar({ spent, amount, usagePercent, T }) {
  const over = usagePercent >= 100;
  const warn = usagePercent >= 80;
  const barColor = over ? T.red : warn ? "#f97316" : "#22c55e";
  return (
    <div>
      <div style={{ height: 7, borderRadius: 4, background: `${T.border}`, overflow: "hidden", marginBottom: 6 }}>
        <div style={{ height: "100%", width: `${Math.min(usagePercent, 100)}%`, background: barColor, borderRadius: 4, transition: "width .3s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
        <span style={{ color: barColor, fontWeight: 600 }}>₹{Number(spent).toLocaleString("en-IN")} used ({usagePercent}%)</span>
        <span style={{ color: T.textMuted }}>of ₹{Number(amount).toLocaleString("en-IN")}</span>
      </div>
      {over && <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: 11.5, color: T.red }}><AlertCircle size={12} /> Over budget by ₹{Number(spent - amount).toLocaleString("en-IN")}</div>}
    </div>
  );
}

// Defined OUTSIDE BudgetsSection — if defined inside, React treats it as a
// new component type on every render and unmounts/remounts it, losing focus.
function BudgetForm({ form, setForm, categories, onSubmit, submitLabel }) {
  const { T } = useTenantTheme();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const inpStyle = { width: "100%", padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: T.inputBg, color: T.textPrimary, fontSize: 13, fontFamily: "inherit", outline: "none" };
  const label = (txt) => <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, marginBottom: 5 }}>{txt}</div>;

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        {label("Budget Name *")}
        <input className="inp" style={inpStyle} value={form.name} onChange={set("name")} placeholder="e.g. Marketing Q1 2025" required />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          {label("Period *")}
          <select className="inp" style={{ ...inpStyle, appearance: "none" }} value={form.period} onChange={set("period")}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div>
          {label("Year *")}
          <select className="inp" style={{ ...inpStyle, appearance: "none" }} value={form.year} onChange={set("year")}>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {form.period === "monthly" && (
          <div style={{ gridColumn: "1/-1" }}>
            {label("Month *")}
            <select className="inp" style={{ ...inpStyle, appearance: "none" }} value={form.month} onChange={set("month")} required>
              <option value="">Select month</option>
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </div>
        )}
        <div style={{ gridColumn: "1/-1" }}>
          {label("Budget Amount (₹) *")}
          <input className="inp" style={inpStyle} type="number" min="1" step="0.01" value={form.amount} onChange={set("amount")} required placeholder="50000" />
        </div>
        <div>
          {label("Category (optional)")}
          <select className="inp" style={{ ...inpStyle, appearance: "none" }} value={form.categoryId} onChange={set("categoryId")}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          {label("Notes")}
          <input className="inp" style={inpStyle} value={form.notes} onChange={set("notes")} placeholder="Optional notes" />
        </div>
      </div>
      <button type="submit" className="pri-btn"
        style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff", borderRadius: 11, padding: "12px", fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", border: "none", cursor: "pointer", marginTop: 4 }}>
        {submitLabel}
      </button>
    </form>
  );
}

export default function BudgetsSection() {
  const { T } = useTenantTheme();
  const [budgets, setBudgets]       = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [editBudget, setEditBudget] = useState(null);
  const [deleteBudget, setDeleteBudget] = useState(null);
  const [form, setForm]   = useState(EMPTY_FORM);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [b, c] = await Promise.all([API.get("/budgets"), API.get("/expense-categories")]);
      setBudgets(b.data.budgets || []);
      setCategories(c.data.categories || []);
    } catch { /* keep */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await API.post("/budgets", form);
      showToast("Budget created");
      setShowAdd(false);
      setForm(EMPTY_FORM);
      fetchData();
    } catch (err) { showToast(err?.response?.data?.message || "Failed", false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/budgets/${editBudget._id}`, form);
      showToast("Budget updated");
      setEditBudget(null);
      fetchData();
    } catch (err) { showToast(err?.response?.data?.message || "Failed", false); }
  };

  const handleDelete = async () => {
    try {
      await API.delete(`/budgets/${deleteBudget._id}`);
      showToast("Budget deleted");
      setDeleteBudget(null);
      fetchData();
    } catch (err) { showToast(err?.response?.data?.message || "Failed", false); }
  };

  const openEdit = (b) => {
    setEditBudget(b);
    setForm({
      name: b.name, period: b.period, year: String(b.year),
      month: b.month ? String(b.month) : "",
      amount: String(b.amount),
      categoryId: b.categoryId?._id || "",
      departmentId: b.departmentId?._id || "",
      notes: b.notes || "",
    });
  };

  const periodLabel = (b) => {
    if (b.period === "monthly" && b.month) return `${MONTHS[b.month - 1]} ${b.year}`;
    return `${b.year} (Annual)`;
  };

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: toast.ok ? T.green : T.red, color: "#fff", padding: "12px 20px", borderRadius: 12, fontSize: 13.5, fontWeight: 600 }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: T.textPrimary }}>Budgets</h2>
          <p style={{ fontSize: 13, color: T.textMuted, marginTop: 3 }}>Track spend against budget targets</p>
        </div>
        <button onClick={() => { setShowAdd(true); setForm(EMPTY_FORM); }} className="pri-btn"
          style={{ display: "flex", alignItems: "center", gap: 7, background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff", borderRadius: 11, padding: "10px 18px", fontSize: 13.5, fontWeight: 700, fontFamily: "'Syne', sans-serif", border: "none", cursor: "pointer" }}>
          <Plus size={15} strokeWidth={2.5} /> Add Budget
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: T.textMuted }}>Loading…</div>
      ) : budgets.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: T.textMuted }}>
          <Wallet size={36} strokeWidth={1.2} style={{ opacity: .35, marginBottom: 10 }} /><div>No budgets yet</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {budgets.map((b) => (
            <div key={b._id} className="card card-in" style={{ background: T.card, border: `1.5px solid ${b.usagePercent >= 100 ? T.red : T.border}`, borderRadius: 16, padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: T.textPrimary }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>
                    {periodLabel(b)}{b.categoryId?.name && <span> · {b.categoryId.name}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => openEdit(b)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex", padding: 5 }}><Edit2 size={13} /></button>
                  <button onClick={() => setDeleteBudget(b)} style={{ background: "none", border: "none", cursor: "pointer", color: T.red, display: "flex", padding: 5 }}><Trash2 size={13} /></button>
                </div>
              </div>
              <UsageBar spent={b.spent} amount={b.amount} usagePercent={b.usagePercent} T={T} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: T.textMuted }}>
                <span>Remaining: <strong style={{ color: T.textPrimary }}>₹{Number(b.remaining).toLocaleString("en-IN")}</strong></span>
                <span style={{ textTransform: "capitalize" }}>{b.period}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="New Budget" onClose={() => setShowAdd(false)}>
          <BudgetForm form={form} setForm={setForm} categories={categories} onSubmit={handleCreate} submitLabel="Create Budget" />
        </Modal>
      )}
      {editBudget && (
        <Modal title="Edit Budget" onClose={() => setEditBudget(null)}>
          <BudgetForm form={form} setForm={setForm} categories={categories} onSubmit={handleUpdate} submitLabel="Save Changes" />
        </Modal>
      )}

      {deleteBudget && (
        <Modal title="Delete Budget" onClose={() => setDeleteBudget(null)}>
          <p style={{ fontSize: 13.5, color: T.textSecondary, marginBottom: 20 }}>Delete <strong style={{ color: T.textPrimary }}>{deleteBudget.name}</strong>? This cannot be undone.</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setDeleteBudget(null)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: "none", cursor: "pointer", color: T.textSecondary, fontFamily: "inherit", fontSize: 13.5 }}>Cancel</button>
            <button onClick={handleDelete} className="pri-btn" style={{ flex: 1, padding: "11px", borderRadius: 10, background: T.red, color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600 }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
