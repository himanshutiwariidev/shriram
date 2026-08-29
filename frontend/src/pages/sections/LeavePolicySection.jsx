import React, { useEffect, useState, useCallback } from "react";
import API from "../../services/api";
import { Shield, Edit2, Save, Users, ChevronDown, X } from "lucide-react";

const LEAVE_TYPES = [
  { id: "casual", label: "Casual Leave", color: "#2563eb", bg: "#eff6ff" },
  { id: "sick",   label: "Sick Leave",   color: "#d97706", bg: "#fffbeb" },
  { id: "earned", label: "Earned Leave", color: "#16a34a", bg: "#f0fdf4" },
];

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

function BalanceBar({ used, quota, carry, color }) {
  const total = quota + carry;
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const remaining = Math.max(0, total - used);
  return (
    <div style={{ width: "100%", marginTop: 4 }}>
      <div style={{ background: "#f1f5f9", borderRadius: 99, height: 6 }}>
        <div style={{ width: `${pct}%`, background: pct >= 90 ? "#dc2626" : color, borderRadius: 99, height: 6, transition: "width .3s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
        <span>{used} used</span><span style={{ color: remaining > 0 ? color : "#dc2626", fontWeight: 700 }}>{remaining} left</span>
      </div>
    </div>
  );
}

export default function LeavePolicySection() {
  const [view, setView] = useState("policy"); // "policy" | "balances"
  const [policies, setPolicies] = useState([]);
  const [balances, setBalances] = useState([]);
  const [year, setYear] = useState(currentYear);
  const [loading, setLoading] = useState(false);
  const [editType, setEditType] = useState(null);
  const [editForm, setEditForm] = useState({ annualQuota: 12, carryForward: false, maxCarryForward: 0 });
  const [saving, setSaving] = useState(false);
  const [adjustModal, setAdjustModal] = useState(null); // { userId, empName, leaveType, field, value }

  const loadPolicies = useCallback(async () => {
    try { const { data } = await API.get("/leave-policy/policies"); setPolicies(data.policies || []); } catch {}
  }, []);

  const loadBalances = useCallback(async () => {
    setLoading(true);
    try { const { data } = await API.get(`/leave-policy/balances?year=${year}`); setBalances(data.balances || []); } catch {}
    finally { setLoading(false); }
  }, [year]);

  useEffect(() => { loadPolicies(); }, [loadPolicies]);
  useEffect(() => { if (view === "balances") loadBalances(); }, [view, loadBalances]);

  const openEdit = (type) => {
    const existing = policies.find((p) => p.leaveType === type);
    setEditForm(existing ? { annualQuota: existing.annualQuota, carryForward: existing.carryForward, maxCarryForward: existing.maxCarryForward } : { annualQuota: 12, carryForward: false, maxCarryForward: 0 });
    setEditType(type);
  };

  const savePolicy = async () => {
    setSaving(true);
    try {
      const { data } = await API.post("/leave-policy/policies", { leaveType: editType, ...editForm });
      setPolicies((p) => {
        const exists = p.find((x) => x.leaveType === editType);
        if (exists) return p.map((x) => x.leaveType === editType ? data.policy : x);
        return [...p, data.policy];
      });
      setEditType(null);
    } catch {}
    finally { setSaving(false); }
  };

  const doAdjust = async () => {
    if (!adjustModal) return;
    const { userId, leaveType, field, value } = adjustModal;
    try {
      await API.post("/leave-policy/balances/adjust", { userId, year, leaveType, field, value: +value });
      await loadBalances();
      setAdjustModal(null);
    } catch {}
  };

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={20} color="#16a34a" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#1e293b" }}>Leave Balance & Quota</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Set annual leave quotas, carry-forward rules, and view employee balances</div>
          </div>
        </div>
        {view === "balances" && (
          <select value={year} onChange={(e) => setYear(+e.target.value)} style={selStyle}>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 10, padding: 3, marginBottom: 20, width: "fit-content" }}>
        {[{ id: "policy", label: "Leave Policies" }, { id: "balances", label: "Employee Balances" }].map(({ id, label }) => (
          <button key={id} onClick={() => setView(id)} style={{ padding: "8px 20px", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, background: view === id ? "#fff" : "transparent", color: view === id ? "#1e293b" : "#64748b", boxShadow: view === id ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── POLICY TAB ── */}
      {view === "policy" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {LEAVE_TYPES.map((lt) => {
            const policy = policies.find((p) => p.leaveType === lt.id);
            return (
              <div key={lt.id} style={{ background: "#fff", border: "1px solid #e8eaf0", borderRadius: 16, padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: lt.color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{lt.label}</div>
                    <div style={{ fontWeight: 800, fontSize: 28, color: "#1e293b" }}>{policy?.annualQuota ?? "—"}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>days / year</div>
                  </div>
                  <div style={{ background: lt.bg, borderRadius: 10, padding: 12 }}>
                    <Shield size={20} color={lt.color} />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "#64748b" }}>Carry Forward</span>
                    <span style={{ fontWeight: 700, color: policy?.carryForward ? "#16a34a" : "#94a3b8" }}>{policy?.carryForward ? `Yes (max ${policy.maxCarryForward}d)` : "No"}</span>
                  </div>
                </div>
                <button onClick={() => openEdit(lt.id)} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${lt.color}33`, background: lt.bg, color: lt.color, borderRadius: 9, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit", width: "100%", justifyContent: "center" }}>
                  <Edit2 size={13} /> {policy ? "Edit Policy" : "Set Policy"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── BALANCES TAB ── */}
      {view === "balances" && (
        <div>
          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading…</div>
          ) : balances.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>No employee data for {year}.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {balances.map(({ employee, balance }) => (
                <div key={employee._id} style={{ background: "#fff", border: "1px solid #e8eaf0", borderRadius: 14, padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#2563eb" }}>
                      {(employee.name || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{employee.name}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{employee.designation || employee.role}</div>
                    </div>
                    <button onClick={() => setAdjustModal({ userId: employee._id, empName: employee.name, leaveType: "casual", field: "quota", value: balance.casual.quota })} style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: "#2563eb", background: "#eff6ff", border: "none", borderRadius: 7, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}>
                      Adjust
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    {LEAVE_TYPES.map((lt) => {
                      const b = balance[lt.id] || { quota: 0, used: 0, carryForward: 0 };
                      return (
                        <div key={lt.id} style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: lt.color, marginBottom: 6 }}>{lt.label}</div>
                          <BalanceBar used={b.used} quota={b.quota} carry={b.carryForward} color={lt.color} />
                          {b.carryForward > 0 && <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>+{b.carryForward} carried</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── POLICY EDIT MODAL ── */}
      {editType && (
        <div style={overlay}>
          <div style={modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>Edit {LEAVE_TYPES.find((l) => l.id === editType)?.label}</div>
              <button onClick={() => setEditType(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <div><label style={lbl}>Annual Quota (days)</label><input type="number" min={0} value={editForm.annualQuota} onChange={(e) => setEditForm((f) => ({ ...f, annualQuota: +e.target.value }))} style={inp} /></div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input type="checkbox" id="cf" checked={editForm.carryForward} onChange={(e) => setEditForm((f) => ({ ...f, carryForward: e.target.checked }))} />
                <label htmlFor="cf" style={{ fontSize: 13, color: "#1e293b", cursor: "pointer" }}>Allow Carry Forward</label>
              </div>
              {editForm.carryForward && (
                <div><label style={lbl}>Max Carry Forward (days)</label><input type="number" min={0} value={editForm.maxCarryForward} onChange={(e) => setEditForm((f) => ({ ...f, maxCarryForward: +e.target.value }))} style={inp} /></div>
              )}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
                <button onClick={() => setEditType(null)} style={cancelBtn}>Cancel</button>
                <button onClick={savePolicy} disabled={saving} style={{ ...saveBtn, opacity: saving ? 0.7 : 1 }}><Save size={13} /> {saving ? "Saving…" : "Save Policy"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADJUST MODAL ── */}
      {adjustModal && (
        <div style={overlay}>
          <div style={modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>Adjust Leave — {adjustModal.empName}</div>
              <button onClick={() => setAdjustModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={lbl}>Leave Type</label>
                <select value={adjustModal.leaveType} onChange={(e) => setAdjustModal((a) => ({ ...a, leaveType: e.target.value }))} style={inp}>
                  {LEAVE_TYPES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Field</label>
                <select value={adjustModal.field} onChange={(e) => setAdjustModal((a) => ({ ...a, field: e.target.value }))} style={inp}>
                  <option value="quota">Quota</option>
                  <option value="used">Used</option>
                  <option value="carryForward">Carry Forward</option>
                </select>
              </div>
              <div><label style={lbl}>Value (days)</label><input type="number" min={0} value={adjustModal.value} onChange={(e) => setAdjustModal((a) => ({ ...a, value: e.target.value }))} style={inp} /></div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setAdjustModal(null)} style={cancelBtn}>Cancel</button>
                <button onClick={doAdjust} style={saveBtn}><Save size={13} /> Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const lbl = { display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 };
const inp = { width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", color: "#1e293b", boxSizing: "border-box", outline: "none", background: "#f8fafc" };
const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const modal = { background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" };
const cancelBtn = { padding: "9px 18px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13 };
const saveBtn = { display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 9, border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13 };
const selStyle = { padding: "8px 12px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", background: "#f8fafc", color: "#1e293b", outline: "none" };
