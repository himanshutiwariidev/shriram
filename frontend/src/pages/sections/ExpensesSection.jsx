import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Search, X, ChevronLeft, ChevronRight, Trash2, Edit2,
  CheckCircle2, Clock, AlertCircle, IndianRupee, ChevronDown,
} from "lucide-react";
import useTenantTheme from "../../hooks/useTenantTheme";
import API from "../../services/api";

const STATUS_COLOR = {
  draft:     "#94a3b8",
  submitted: "#f59e0b",
  pending:   "#f97316",
  approved:  "#22c55e",
  rejected:  "#ef4444",
  paid:      "#10b981",
};

const STATUS_LABEL = { draft: "Draft", submitted: "Submitted", pending: "Pending", approved: "Approved", rejected: "Rejected", paid: "Paid" };

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "UPI", "Cheque", "Card", "Other"];
const FILTER_STATUSES = ["draft", "submitted", "pending", "approved", "rejected", "paid"];
// Approval transitions admin can trigger from the table
const APPROVAL_ACTIONS = [
  { from: ["submitted", "pending"], action: "approved",  label: "Approve", color: "#22c55e" },
  { from: ["submitted", "pending", "approved"], action: "rejected", label: "Reject",  color: "#ef4444" },
  { from: ["approved"],             action: "paid",      label: "Mark Paid", color: "#10b981" },
];

const EMPTY_FORM = {
  title: "", description: "", categoryId: "", vendorId: "", employeeId: "",
  departmentId: "", projectId: "", expenseType: "", amount: "", tax: "0",
  currency: "INR", paymentMethod: "Cash",
  expenseDate: new Date().toISOString().slice(0, 10),
  dueDate: "", notes: "",
};

function Badge({ status }) {
  return (
    <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 9px", borderRadius: 20, background: `${STATUS_COLOR[status] || "#94a3b8"}18`, color: STATUS_COLOR[status] || "#94a3b8", textTransform: "capitalize" }}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function Modal({ title, onClose, children, wide }) {
  const { T } = useTenantTheme();
  return createPortal(
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 9000, overflowY: "auto", padding: "32px 16px 48px" }}>
      <div style={{ width: "100%", maxWidth: wide ? 780 : 520, margin: "0 auto", background: T.card, borderRadius: 18, boxShadow: "0 24px 48px rgba(0,0,0,.2)" }}>
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

// Separate component defined OUTSIDE so React never remounts it on parent re-render
function ExpenseForm({ form, setForm, categories, vendors, onSubmit, submitLabel, T }) {
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const inpStyle = { width: "100%", padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: T.inputBg, color: T.textPrimary, fontSize: 13, fontFamily: "inherit", outline: "none" };
  const label = (txt) => <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, marginBottom: 5 }}>{txt}</div>;

  const parsedAmount = Number(form.amount) || 0;
  const parsedTax   = Number(form.tax) || 0;
  const total = (parsedAmount + parsedTax).toFixed(2);

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ gridColumn: "1/-1" }}>
          {label("Title *")}
          <input className="inp" style={inpStyle} value={form.title} onChange={set("title")} placeholder="e.g. Office Supplies" required />
        </div>
        <div>
          {label("Category")}
          <select className="inp" style={{ ...inpStyle, appearance: "none" }} value={form.categoryId} onChange={set("categoryId")}>
            <option value="">No category</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          {label("Vendor")}
          <select className="inp" style={{ ...inpStyle, appearance: "none" }} value={form.vendorId} onChange={set("vendorId")}>
            <option value="">No vendor</option>
            {vendors.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
          </select>
        </div>
        <div>
          {label("Amount (₹) *")}
          <input className="inp" style={inpStyle} type="number" min="0" step="0.01" value={form.amount} onChange={set("amount")} required placeholder="0.00" />
        </div>
        <div>
          {label("Tax / GST (₹)")}
          <input className="inp" style={inpStyle} type="number" min="0" step="0.01" value={form.tax} onChange={set("tax")} placeholder="0.00" />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <div style={{ fontSize: 13, color: T.textSecondary, background: T.brandLight, borderRadius: 9, padding: "9px 14px" }}>
            Total: <strong style={{ color: T.textPrimary }}>₹{Number(total).toLocaleString("en-IN")}</strong>
          </div>
        </div>
        <div>
          {label("Expense Date *")}
          <input className="inp" style={inpStyle} type="date" value={form.expenseDate} onChange={set("expenseDate")} required />
        </div>
        <div>
          {label("Due Date")}
          <input className="inp" style={inpStyle} type="date" value={form.dueDate} onChange={set("dueDate")} />
        </div>
        <div>
          {label("Payment Method")}
          <select className="inp" style={{ ...inpStyle, appearance: "none" }} value={form.paymentMethod} onChange={set("paymentMethod")}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          {label("Expense Type")}
          <input className="inp" style={inpStyle} value={form.expenseType} onChange={set("expenseType")} placeholder="e.g. Recurring, One-time" />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          {label("Description")}
          <textarea className="inp" style={{ ...inpStyle, minHeight: 70, resize: "vertical" }} value={form.description} onChange={set("description")} placeholder="Optional details" />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          {label("Notes")}
          <textarea className="inp" style={{ ...inpStyle, minHeight: 60, resize: "vertical" }} value={form.notes} onChange={set("notes")} placeholder="Internal notes" />
        </div>
      </div>
      <button type="submit" className="pri-btn"
        style={{ background: "linear-gradient(135deg, #0ea5e9, #0284c7)", color: "#fff", borderRadius: 11, padding: "12px", fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", border: "none", cursor: "pointer", marginTop: 4 }}>
        {submitLabel}
      </button>
    </form>
  );
}

export default function ExpensesSection() {
  const { T } = useTenantTheme();
  const [expenses, setExpenses]     = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading]       = useState(true);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors]       = useState([]);

  const [filters, setFilters] = useState({ status: "", categoryId: "", search: "", startDate: "", endDate: "" });
  const [page, setPage] = useState(1);

  const [showAdd, setShowAdd]         = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [deleteExpense, setDeleteExpense] = useState(null);
  const [approveExpense, setApproveExpense] = useState(null); // { expense, action }
  const [form, setForm]   = useState(EMPTY_FORM);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3200); };

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...filters };
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const { data } = await API.get("/expenses", { params });
      setExpenses(data.expenses || []);
      setPagination(data.pagination || { total: 0, page: 1, totalPages: 1 });
    } catch { /* keep partial */ }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);
  useEffect(() => {
    API.get("/expense-categories").then(({ data }) => setCategories(data.categories || [])).catch(() => {});
    API.get("/vendors").then(({ data }) => setVendors(data.vendors || [])).catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await API.post("/expenses", { ...form, status: "submitted" });
      showToast("Expense submitted");
      setShowAdd(false);
      setForm(EMPTY_FORM);
      fetchExpenses();
    } catch (err) { showToast(err?.response?.data?.message || "Failed to create expense", false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/expenses/${editExpense._id}`, form);
      showToast("Expense updated");
      setEditExpense(null);
      fetchExpenses();
    } catch (err) { showToast(err?.response?.data?.message || "Failed to update expense", false); }
  };

  const handleDelete = async () => {
    try {
      await API.delete(`/expenses/${deleteExpense._id}`);
      showToast("Expense deleted");
      setDeleteExpense(null);
      fetchExpenses();
    } catch (err) { showToast(err?.response?.data?.message || "Failed to delete expense", false); }
  };

  const handleApproval = async () => {
    if (!approveExpense) return;
    try {
      await API.patch(`/expenses/${approveExpense.expense._id}/status`, { status: approveExpense.action });
      showToast(`Expense ${STATUS_LABEL[approveExpense.action]}`);
      setApproveExpense(null);
      fetchExpenses();
    } catch (err) { showToast(err?.response?.data?.message || "Failed to update status", false); }
  };

  const openEdit = (exp) => {
    setEditExpense(exp);
    setForm({
      title: exp.title || "", description: exp.description || "",
      categoryId: exp.categoryId?._id || exp.categoryId || "",
      vendorId: exp.vendorId?._id || exp.vendorId || "",
      employeeId: exp.employeeId?._id || exp.employeeId || "",
      departmentId: exp.departmentId?._id || exp.departmentId || "",
      projectId: exp.projectId || "", expenseType: exp.expenseType || "",
      amount: exp.amount || "", tax: exp.tax || "0",
      currency: exp.currency || "INR", paymentMethod: exp.paymentMethod || "Cash",
      expenseDate: exp.expenseDate ? exp.expenseDate.slice(0, 10) : "",
      dueDate: exp.dueDate ? exp.dueDate.slice(0, 10) : "",
      notes: exp.notes || "",
    });
  };

  const setFilter = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPage(1); };
  const inpStyle = { padding: "8px 12px", borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: T.inputBg, color: T.textPrimary, fontSize: 12.5, fontFamily: "inherit", outline: "none" };

  // Available approval actions for a given expense status
  const getActions = (status) => APPROVAL_ACTIONS.filter((a) => a.from.includes(status));

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: toast.ok ? T.green : T.red, color: "#fff", padding: "12px 20px", borderRadius: 12, fontSize: 13.5, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,.15)" }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: T.textPrimary }}>Expenses</h2>
          <p style={{ fontSize: 13, color: T.textMuted, marginTop: 3 }}>{pagination.total} total expenses</p>
        </div>
        <button onClick={() => { setShowAdd(true); setForm(EMPTY_FORM); }} className="pri-btn"
          style={{ display: "flex", alignItems: "center", gap: 7, background: "linear-gradient(135deg, #0ea5e9, #0284c7)", color: "#fff", borderRadius: 11, padding: "10px 18px", fontSize: 13.5, fontWeight: 700, fontFamily: "'Syne', sans-serif", border: "none", cursor: "pointer" }}>
          <Plus size={15} strokeWidth={2.5} /> Add Expense
        </button>
      </div>

      {/* Filters */}
      <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: "14px 18px", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.textMuted }} />
          <input className="inp" style={{ ...inpStyle, width: "100%", paddingLeft: 32 }} placeholder="Search expenses…" value={filters.search} onChange={setFilter("search")} />
        </div>
        <select className="inp" style={{ ...inpStyle, appearance: "none" }} value={filters.status} onChange={setFilter("status")}>
          <option value="">All statuses</option>
          {FILTER_STATUSES.map((s) => <option key={s} value={s} style={{ textTransform: "capitalize" }}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select className="inp" style={{ ...inpStyle, appearance: "none" }} value={filters.categoryId} onChange={setFilter("categoryId")}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <input className="inp" style={inpStyle} type="date" value={filters.startDate} onChange={setFilter("startDate")} title="From date" />
        <input className="inp" style={inpStyle} type="date" value={filters.endDate} onChange={setFilter("endDate")} title="To date" />
        {Object.values(filters).some(Boolean) && (
          <button onClick={() => { setFilters({ status: "", categoryId: "", search: "", startDate: "", endDate: "" }); setPage(1); }}
            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 12 }}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: T.textMuted }}>Loading…</div>
        ) : expenses.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: T.textMuted }}>
            <IndianRupee size={36} strokeWidth={1.2} style={{ opacity: .4, marginBottom: 10 }} />
            <div>No expenses found</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: T.bg }}>
                  {["ID", "Title", "Category", "Date", "Amount", "Method", "Status", "Approval", ""].map((h) => (
                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => {
                  const actions = getActions(exp.status);
                  return (
                    <tr key={exp._id} className="data-row" style={{ borderTop: `1px solid ${T.borderLight}` }}>
                      <td style={{ padding: "12px 16px", fontSize: 11.5, color: T.textMuted, fontFamily: "monospace" }}>{exp.expenseId || "—"}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: T.textPrimary }}>{exp.title}</div>
                        {exp.employeeId?.name && <div style={{ fontSize: 11, color: T.textMuted }}>{exp.employeeId.name}</div>}
                        {exp.source === "payroll" && <span style={{ fontSize: 10, color: "#8b5cf6", fontWeight: 600 }}>PAYROLL</span>}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {exp.categoryId ? (
                          <span style={{ fontSize: 12, padding: "2px 9px", borderRadius: 20, background: `${exp.categoryId.color || "#94a3b8"}18`, color: exp.categoryId.color || "#94a3b8", fontWeight: 600 }}>
                            {exp.categoryId.name}
                          </span>
                        ) : <span style={{ color: T.textMuted, fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 12.5, color: T.textSecondary, whiteSpace: "nowrap" }}>
                        {new Date(exp.expenseDate).toLocaleDateString("en-IN")}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13.5, fontWeight: 600, color: T.textPrimary, whiteSpace: "nowrap" }}>
                        ₹{Number(exp.totalAmount).toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: T.textSecondary }}>{exp.paymentMethod}</td>
                      <td style={{ padding: "12px 16px" }}><Badge status={exp.status} /></td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {actions.map((a) => (
                            <button key={a.action}
                              onClick={() => setApproveExpense({ expense: exp, action: a.action })}
                              style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, border: `1px solid ${a.color}`, background: `${a.color}12`, color: a.color, cursor: "pointer", fontFamily: "inherit" }}>
                              {a.label}
                            </button>
                          ))}
                          {actions.length === 0 && <span style={{ fontSize: 11, color: T.textMuted }}>—</span>}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {exp.source !== "payroll" && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => openEdit(exp)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex", padding: 4 }}><Edit2 size={14} /></button>
                            <button onClick={() => setDeleteExpense(exp)} style={{ background: "none", border: "none", cursor: "pointer", color: T.red, display: "flex", padding: 4 }}><Trash2 size={14} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "14px 0", borderTop: `1px solid ${T.borderLight}` }}>
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ background: "none", border: "none", cursor: "pointer", color: page <= 1 ? T.textMuted : T.brand, display: "flex" }}><ChevronLeft size={18} /></button>
            <span style={{ fontSize: 13, color: T.textSecondary }}>Page {page} of {pagination.totalPages}</span>
            <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} style={{ background: "none", border: "none", cursor: "pointer", color: page >= pagination.totalPages ? T.textMuted : T.brand, display: "flex" }}><ChevronRight size={18} /></button>
          </div>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <Modal title="Add Expense" onClose={() => setShowAdd(false)} wide>
          <ExpenseForm form={form} setForm={setForm} categories={categories} vendors={vendors} onSubmit={handleCreate} submitLabel="Submit Expense" T={T} />
        </Modal>
      )}

      {/* Edit modal */}
      {editExpense && (
        <Modal title="Edit Expense" onClose={() => setEditExpense(null)} wide>
          <ExpenseForm form={form} setForm={setForm} categories={categories} vendors={vendors} onSubmit={handleUpdate} submitLabel="Save Changes" T={T} />
        </Modal>
      )}

      {/* Approval confirm */}
      {approveExpense && (
        <Modal title="Update Status" onClose={() => setApproveExpense(null)}>
          <p style={{ fontSize: 13.5, color: T.textSecondary, marginBottom: 20 }}>
            Mark <strong style={{ color: T.textPrimary }}>{approveExpense.expense.title}</strong> as{" "}
            <strong style={{ color: STATUS_COLOR[approveExpense.action] }}>{STATUS_LABEL[approveExpense.action]}</strong>?
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setApproveExpense(null)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: "none", cursor: "pointer", color: T.textSecondary, fontFamily: "inherit", fontSize: 13.5 }}>Cancel</button>
            <button onClick={handleApproval} className="pri-btn"
              style={{ flex: 1, padding: "11px", borderRadius: 10, background: STATUS_COLOR[approveExpense.action], color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600 }}>
              Confirm
            </button>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteExpense && (
        <Modal title="Delete Expense" onClose={() => setDeleteExpense(null)}>
          <p style={{ fontSize: 13.5, color: T.textSecondary, marginBottom: 20 }}>
            Delete <strong style={{ color: T.textPrimary }}>{deleteExpense.title}</strong>? This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setDeleteExpense(null)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: "none", cursor: "pointer", color: T.textSecondary, fontFamily: "inherit", fontSize: 13.5 }}>Cancel</button>
            <button onClick={handleDelete} className="pri-btn" style={{ flex: 1, padding: "11px", borderRadius: 10, background: T.red, color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600 }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
