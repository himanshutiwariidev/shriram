import React, { useEffect, useState, useCallback } from "react";
import API from "../../services/api";
import { CalendarDays, Clock, Plus, Trash2, Edit2, X, Users, Sun, Moon, Sunset } from "lucide-react";

const SHIFT_ICONS = { Morning: Sun, Evening: Sunset, Night: Moon };
const TYPE_META = {
  public:  { label: "Public",  color: "#2563eb", bg: "#eff6ff" },
  company: { label: "Company", color: "#7c3aed", bg: "#f5f3ff" },
};

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const fmt = (h, m = 0) => `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;

const EMPTY_H = { name: "", date: "", type: "public", branchId: "" };
const EMPTY_S = { name: "", startHour: 9, startMinute: 0, endHour: 18, endMinute: 0 };

export default function HolidayShiftSection() {
  const [view, setView] = useState("holidays"); // "holidays" | "shifts"
  const [year, setYear] = useState(currentYear);
  const [holidays, setHolidays] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  // Holiday modal
  const [showHForm, setShowHForm] = useState(false);
  const [hForm, setHForm] = useState(EMPTY_H);
  const [editingH, setEditingH] = useState(null);
  const [savingH, setSavingH] = useState(false);

  // Shift modal
  const [showSForm, setShowSForm] = useState(false);
  const [sForm, setSForm] = useState(EMPTY_S);
  const [editingS, setEditingS] = useState(null);
  const [savingS, setSavingS] = useState(false);

  // Assign modal
  const [showAssign, setShowAssign] = useState(false);
  const [assignShiftId, setAssignShiftId] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);

  const loadHolidays = useCallback(async () => {
    setLoading(true);
    try { const { data } = await API.get(`/hr/holidays?year=${year}`); setHolidays(data.holidays || []); } catch {}
    finally { setLoading(false); }
  }, [year]);

  const loadShifts = useCallback(async () => {
    try { const { data } = await API.get("/hr/shifts"); setShifts(data.shifts || []); } catch {}
  }, []);

  const loadUsers = async () => {
    if (users.length) return;
    try { const { data } = await API.get("/users?limit=500"); setUsers(data.users || data || []); } catch {}
  };
  const loadBranches = async () => {
    if (branches.length) return;
    try { const { data } = await API.get("/branches"); setBranches(data.branches || data || []); } catch {}
  };

  useEffect(() => { loadHolidays(); loadShifts(); loadBranches(); }, [loadHolidays, loadShifts]);

  // Holiday CRUD
  const saveHoliday = async () => {
    if (!hForm.name || !hForm.date) return;
    setSavingH(true);
    try {
      if (editingH) {
        const { data } = await API.put(`/hr/holidays/${editingH}`, hForm);
        setHolidays((p) => p.map((h) => h._id === editingH ? data.holiday : h));
      } else {
        const { data } = await API.post("/hr/holidays", hForm);
        setHolidays((p) => [...p, data.holiday].sort((a, b) => new Date(a.date) - new Date(b.date)));
      }
      setShowHForm(false);
    } catch {}
    finally { setSavingH(false); }
  };
  const deleteHoliday = async (id) => {
    if (!confirm("Delete holiday?")) return;
    await API.delete(`/hr/holidays/${id}`).catch(() => {});
    setHolidays((p) => p.filter((h) => h._id !== id));
  };

  // Shift CRUD
  const saveShift = async () => {
    if (!sForm.name) return;
    setSavingS(true);
    try {
      if (editingS) {
        const { data } = await API.put(`/hr/shifts/${editingS}`, sForm);
        setShifts((p) => p.map((s) => s._id === editingS ? data.shift : s));
      } else {
        const { data } = await API.post("/hr/shifts", sForm);
        setShifts((p) => [...p, data.shift]);
      }
      setShowSForm(false);
    } catch {}
    finally { setSavingS(false); }
  };
  const deleteShift = async (id) => {
    if (!confirm("Delete shift? Users assigned to it will be unassigned.")) return;
    await API.delete(`/hr/shifts/${id}`).catch(() => {});
    setShifts((p) => p.filter((s) => s._id !== id));
  };

  // Assign shift
  const doAssign = async () => {
    if (!selectedUsers.length) return;
    await API.post("/hr/shifts/assign", { userIds: selectedUsers, shiftId: assignShiftId || null }).catch(() => {});
    setShowAssign(false);
    setSelectedUsers([]);
  };

  const toggleUser = (id) => setSelectedUsers((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const grouped = MONTHS.reduce((acc, m, i) => {
    const mHols = holidays.filter((h) => new Date(h.date).getMonth() === i);
    if (mHols.length) acc.push({ month: m, items: mHols });
    return acc;
  }, []);

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CalendarDays size={20} color="#16a34a" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#1e293b" }}>Holiday & Shift Management</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Define holidays per year and assign work shifts to employees</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {view === "holidays" && (
            <>
              <select value={year} onChange={(e) => setYear(+e.target.value)} style={selStyle}>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <button onClick={() => { setHForm(EMPTY_H); setEditingH(null); setShowHForm(true); loadBranches(); }} style={primaryBtn}>
                <Plus size={14} /> Add Holiday
              </button>
            </>
          )}
          {view === "shifts" && (
            <>
              <button onClick={() => { setShowAssign(true); loadUsers(); }} style={{ ...primaryBtn, background: "#7c3aed", borderColor: "#7c3aed" }}>
                <Users size={14} /> Assign Shift
              </button>
              <button onClick={() => { setSForm(EMPTY_S); setEditingS(null); setShowSForm(true); }} style={primaryBtn}>
                <Plus size={14} /> New Shift
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 10, padding: 3, marginBottom: 20, width: "fit-content" }}>
        {["holidays", "shifts"].map((v) => (
          <button key={v} onClick={() => setView(v)} style={{ padding: "8px 20px", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, background: view === v ? "#fff" : "transparent", color: view === v ? "#1e293b" : "#64748b", boxShadow: view === v ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>
            {v === "holidays" ? "Holidays" : "Shifts"}
          </button>
        ))}
      </div>

      {/* ── HOLIDAYS ── */}
      {view === "holidays" && (
        <div>
          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading…</div>
          ) : holidays.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
              <CalendarDays size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <div>No holidays defined for {year}. Add one to get started.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {grouped.map(({ month, items }) => (
                <div key={month}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{month}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {items.map((h) => {
                      const meta = TYPE_META[h.type] || TYPE_META.public;
                      return (
                        <div key={h._id} style={{ background: "#fff", border: "1px solid #e8eaf0", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{ background: meta.bg, borderRadius: 8, padding: "8px 12px", textAlign: "center", minWidth: 48, flexShrink: 0 }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: meta.color, lineHeight: 1 }}>{new Date(h.date).getDate()}</div>
                            <div style={{ fontSize: 9, fontWeight: 700, color: meta.color, textTransform: "uppercase" }}>{MONTHS[new Date(h.date).getMonth()]}</div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{h.name}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                              <span style={{ background: meta.bg, color: meta.color, borderRadius: 5, padding: "1px 7px", fontWeight: 600 }}>{meta.label}</span>
                              {h.branchId && <span style={{ marginLeft: 8 }}>· {h.branchId.name || "Branch"}</span>}
                            </div>
                          </div>
                          <button onClick={() => { setHForm({ name: h.name, date: h.date?.slice?.(0,10) || "", type: h.type, branchId: h.branchId?._id || "" }); setEditingH(h._id); setShowHForm(true); }} style={iconBtn}><Edit2 size={13} /></button>
                          <button onClick={() => deleteHoliday(h._id)} style={{ ...iconBtn, color: "#dc2626", background: "#fef2f2", borderColor: "#fecaca" }}><Trash2 size={13} /></button>
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

      {/* ── SHIFTS ── */}
      {view === "shifts" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {shifts.length === 0 && (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: "#94a3b8" }}>
              <Clock size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <div>No shifts defined. Create your first shift.</div>
            </div>
          )}
          {shifts.map((s) => {
            const SIcon = SHIFT_ICONS[s.name] || Clock;
            return (
              <div key={s._id} style={{ background: "#fff", border: "1px solid #e8eaf0", borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <SIcon size={18} color="#0891b2" />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{s.name}</div>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    <button onClick={() => { setSForm({ name: s.name, startHour: s.startHour, startMinute: s.startMinute, endHour: s.endHour, endMinute: s.endMinute }); setEditingS(s._id); setShowSForm(true); }} style={iconBtn}><Edit2 size={13} /></button>
                    <button onClick={() => deleteShift(s._id)} style={{ ...iconBtn, color: "#dc2626", background: "#fef2f2", borderColor: "#fecaca" }}><Trash2 size={13} /></button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1, background: "#f8fafc", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 3 }}>START</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>{fmt(s.startHour, s.startMinute)}</div>
                  </div>
                  <div style={{ flex: 1, background: "#f8fafc", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", marginBottom: 3 }}>END</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>{fmt(s.endHour, s.endMinute)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── HOLIDAY MODAL ── */}
      {showHForm && (
        <div style={overlay}>
          <div style={modal}>
            <ModalHeader title={editingH ? "Edit Holiday" : "Add Holiday"} onClose={() => setShowHForm(false)} />
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <Field label="Holiday Name *"><input value={hForm.name} onChange={(e) => setHForm((f) => ({ ...f, name: e.target.value }))} style={inp} placeholder="e.g. Diwali" /></Field>
              <Field label="Date *"><input type="date" value={hForm.date} onChange={(e) => setHForm((f) => ({ ...f, date: e.target.value }))} style={inp} /></Field>
              <Field label="Type">
                <select value={hForm.type} onChange={(e) => setHForm((f) => ({ ...f, type: e.target.value }))} style={inp}>
                  <option value="public">Public Holiday</option>
                  <option value="company">Company Holiday</option>
                </select>
              </Field>
              <Field label="Branch (leave blank for all branches)">
                <select value={hForm.branchId} onChange={(e) => setHForm((f) => ({ ...f, branchId: e.target.value }))} style={inp}>
                  <option value="">All Branches</option>
                  {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </Field>
              <ModalFooter onCancel={() => setShowHForm(false)} onSave={saveHoliday} saving={savingH} />
            </div>
          </div>
        </div>
      )}

      {/* ── SHIFT MODAL ── */}
      {showSForm && (
        <div style={overlay}>
          <div style={modal}>
            <ModalHeader title={editingS ? "Edit Shift" : "New Shift"} onClose={() => setShowSForm(false)} />
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <Field label="Shift Name *"><input value={sForm.name} onChange={(e) => setSForm((f) => ({ ...f, name: e.target.value }))} style={inp} placeholder="e.g. Morning, Evening, Night" /></Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Start Hour (0-23)"><input type="number" min={0} max={23} value={sForm.startHour} onChange={(e) => setSForm((f) => ({ ...f, startHour: +e.target.value }))} style={inp} /></Field>
                <Field label="Start Minute"><input type="number" min={0} max={59} value={sForm.startMinute} onChange={(e) => setSForm((f) => ({ ...f, startMinute: +e.target.value }))} style={inp} /></Field>
                <Field label="End Hour (0-23)"><input type="number" min={0} max={23} value={sForm.endHour} onChange={(e) => setSForm((f) => ({ ...f, endHour: +e.target.value }))} style={inp} /></Field>
                <Field label="End Minute"><input type="number" min={0} max={59} value={sForm.endMinute} onChange={(e) => setSForm((f) => ({ ...f, endMinute: +e.target.value }))} style={inp} /></Field>
              </div>
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#475569" }}>
                <strong>Late if check-in after:</strong> {fmt(sForm.startHour, sForm.startMinute)}
              </div>
              <ModalFooter onCancel={() => setShowSForm(false)} onSave={saveShift} saving={savingS} />
            </div>
          </div>
        </div>
      )}

      {/* ── ASSIGN MODAL ── */}
      {showAssign && (
        <div style={overlay}>
          <div style={{ ...modal, maxWidth: 500 }}>
            <ModalHeader title="Assign Shift to Employees" onClose={() => setShowAssign(false)} />
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Shift</label>
              <select value={assignShiftId} onChange={(e) => setAssignShiftId(e.target.value)} style={inp}>
                <option value="">Unassign (no shift)</option>
                {shifts.map((s) => <option key={s._id} value={s._id}>{s.name} ({fmt(s.startHour, s.startMinute)} – {fmt(s.endHour, s.endMinute)})</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Select Employees</label>
              <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 10, padding: 8 }}>
                {users.filter((u) => !["admin","client","superadmin"].includes(u.role)).map((u) => (
                  <label key={u._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 8px", borderRadius: 7, cursor: "pointer", background: selectedUsers.includes(u._id) ? "#eff6ff" : "transparent" }}>
                    <input type="checkbox" checked={selectedUsers.includes(u._id)} onChange={() => toggleUser(u._id)} />
                    <span style={{ fontSize: 13, color: "#1e293b", fontWeight: 500 }}>{u.name}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>{u.role}</span>
                  </label>
                ))}
              </div>
            </div>
            <ModalFooter onCancel={() => setShowAssign(false)} onSave={doAssign} saveLabel="Assign" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────────
const ModalHeader = ({ title, onClose }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
    <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>{title}</div>
    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={18} /></button>
  </div>
);
const ModalFooter = ({ onCancel, onSave, saving, saveLabel = "Save" }) => (
  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
    <button onClick={onCancel} style={cancelBtn}>Cancel</button>
    <button onClick={onSave} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : saveLabel}</button>
  </div>
);
const Field = ({ label, children }) => (
  <div><label style={lbl}>{label}</label>{children}</div>
);

const lbl = { display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 };
const inp = { width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", color: "#1e293b", boxSizing: "border-box", outline: "none", background: "#f8fafc" };
const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const modal = { background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" };
const primaryBtn = { display: "flex", alignItems: "center", gap: 6, background: "#2563eb", color: "#fff", border: "none", borderRadius: 9, padding: "9px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" };
const cancelBtn = { padding: "9px 18px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13 };
const iconBtn = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "5px 9px", cursor: "pointer", color: "#64748b" };
const selStyle = { padding: "8px 12px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", background: "#f8fafc", color: "#1e293b", outline: "none", cursor: "pointer" };
