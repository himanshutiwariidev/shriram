import React, { useEffect, useState, useCallback } from "react";
import API from "../../services/api";
import { Star, Plus, X, ChevronDown, Award, Clock, CheckCircle, AlertCircle, Users } from "lucide-react";

const STATUS_META = {
  pending:       { label: "Pending",       color: "#94a3b8", bg: "#f8fafc" },
  self_assessed: { label: "Self Assessed", color: "#d97706", bg: "#fffbeb" },
  reviewed:      { label: "Reviewed",      color: "#2563eb", bg: "#eff6ff" },
  finalized:     { label: "Finalized",     color: "#16a34a", bg: "#f0fdf4" },
};

const CYCLE_STATUS = {
  draft:  { label: "Draft",  color: "#94a3b8", bg: "#f8fafc" },
  open:   { label: "Open",   color: "#16a34a", bg: "#f0fdf4" },
  closed: { label: "Closed", color: "#475569", bg: "#f1f5f9" },
};

function Stars({ value, onChange, readonly }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1,2,3,4,5].map((n) => (
        <button key={n} type="button" onClick={() => !readonly && onChange && onChange(n)}
          style={{ background: "none", border: "none", cursor: readonly ? "default" : "pointer", padding: 0, color: n <= value ? "#f59e0b" : "#e2e8f0" }}>
          <Star size={18} fill={n <= value ? "#f59e0b" : "none"} />
        </button>
      ))}
    </div>
  );
}

const EMPTY_CYCLE = { title: "", period: "annual", year: new Date().getFullYear(), quarter: "", startDate: "", endDate: "", goals: [""] };

export default function PerformanceSection() {
  const [view, setView] = useState("cycles");
  const [cycles, setCycles] = useState([]);
  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState(null);

  // Create cycle modal
  const [showCreate, setShowCreate] = useState(false);
  const [cForm, setCForm] = useState(EMPTY_CYCLE);
  const [creating, setCreating] = useState(false);

  // Review modal
  const [reviewTarget, setReviewTarget] = useState(null);
  const [rForm, setRForm] = useState({ managerRating: 0, managerComment: "", finalRating: 0, salaryRevisionFlag: false, salaryRevisionPercent: 0 });
  const [reviewing, setReviewing] = useState(false);

  const loadCycles = useCallback(async () => {
    setLoading(true);
    try { const { data } = await API.get("/performance/cycles"); setCycles(data.cycles || []); } catch {}
    finally { setLoading(false); }
  }, []);

  const loadAppraisals = useCallback(async (cycleId) => {
    try {
      const q = cycleId ? `?cycleId=${cycleId}` : "";
      const { data } = await API.get(`/performance/appraisals${q}`);
      setAppraisals(data.appraisals || []);
    } catch {}
  }, []);

  useEffect(() => { loadCycles(); }, [loadCycles]);
  useEffect(() => { if (view === "appraisals") loadAppraisals(selectedCycle); }, [view, selectedCycle, loadAppraisals]);

  const createCycle = async () => {
    if (!cForm.title || !cForm.startDate || !cForm.endDate) return;
    setCreating(true);
    try {
      const payload = { ...cForm, goals: cForm.goals.filter((g) => g.trim()) };
      const { data } = await API.post("/performance/cycles", payload);
      setCycles((p) => [data.cycle, ...p]);
      setShowCreate(false);
      setCForm(EMPTY_CYCLE);
    } catch {}
    finally { setCreating(false); }
  };

  const updateCycleStatus = async (id, action) => {
    try {
      const { data } = await API.put(`/performance/cycles/${id}/${action}`);
      setCycles((p) => p.map((c) => c._id === id ? data.cycle : c));
    } catch {}
  };

  const deleteCycle = async (id) => {
    if (!confirm("Delete this cycle and all associated appraisals?")) return;
    await API.delete(`/performance/cycles/${id}`).catch(() => {});
    setCycles((p) => p.filter((c) => c._id !== id));
  };

  const openReview = (a) => {
    setReviewTarget(a);
    setRForm({ managerRating: a.managerRating || 0, managerComment: a.managerComment || "", finalRating: a.finalRating || 0, salaryRevisionFlag: a.salaryRevisionFlag || false, salaryRevisionPercent: a.salaryRevisionPercent || 0 });
  };

  const submitReview = async () => {
    setReviewing(true);
    try {
      const { data } = await API.put(`/performance/appraisals/${reviewTarget._id}/review`, rForm);
      setAppraisals((p) => p.map((a) => a._id === reviewTarget._id ? data.appraisal : a));
      setReviewTarget(null);
    } catch {}
    finally { setReviewing(false); }
  };

  const addGoal = () => setCForm((f) => ({ ...f, goals: [...f.goals, ""] }));
  const updateGoal = (i, v) => setCForm((f) => ({ ...f, goals: f.goals.map((g, idx) => idx === i ? v : g) }));
  const removeGoal = (i) => setCForm((f) => ({ ...f, goals: f.goals.filter((_, idx) => idx !== i) }));

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fdf4ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Award size={20} color="#7c3aed" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#1e293b" }}>Performance Reviews</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Manage review cycles, self-assessments, and manager evaluations</div>
          </div>
        </div>
        {view === "cycles" && (
          <button onClick={() => setShowCreate(true)} style={primaryBtn}><Plus size={14} /> New Review Cycle</button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 10, padding: 3, marginBottom: 20, width: "fit-content" }}>
        {[{ id: "cycles", label: "Cycles" }, { id: "appraisals", label: "Appraisals" }].map(({ id, label }) => (
          <button key={id} onClick={() => setView(id)} style={{ padding: "8px 20px", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, background: view === id ? "#fff" : "transparent", color: view === id ? "#1e293b" : "#64748b", boxShadow: view === id ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── CYCLES ── */}
      {view === "cycles" && (
        <div>
          {loading && <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading…</div>}
          {!loading && cycles.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
              <Award size={40} color="#e2e8f0" style={{ marginBottom: 12 }} />
              <div>No review cycles yet. Create one to get started.</div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {cycles.map((c) => {
              const sm = CYCLE_STATUS[c.status] || CYCLE_STATUS.draft;
              return (
                <div key={c._id} style={{ background: "#fff", border: "1px solid #e8eaf0", borderRadius: 14, padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{c.title}</div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: sm.color, background: sm.bg, borderRadius: 6, padding: "2px 9px" }}>{sm.label}</span>
                        <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 4 }}>{c.period} · {c.year}{c.quarter ? ` Q${c.quarter}` : ""}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>
                        {new Date(c.startDate).toLocaleDateString("en-IN")} – {new Date(c.endDate).toLocaleDateString("en-IN")}
                        {c.goals?.length > 0 && <span style={{ marginLeft: 10 }}>· {c.goals.length} goal{c.goals.length > 1 ? "s" : ""}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      {c.status === "draft" && <button onClick={() => updateCycleStatus(c._id, "open")} style={accentBtn("#16a34a")}>Open</button>}
                      {c.status === "open" && (
                        <>
                          <button onClick={() => { setSelectedCycle(c._id); setView("appraisals"); }} style={accentBtn("#2563eb")}><Users size={13} /> View</button>
                          <button onClick={() => updateCycleStatus(c._id, "close")} style={accentBtn("#475569")}>Close</button>
                        </>
                      )}
                      {c.status === "closed" && (
                        <button onClick={() => { setSelectedCycle(c._id); setView("appraisals"); }} style={accentBtn("#475569")}><Users size={13} /> View</button>
                      )}
                      <button onClick={() => deleteCycle(c._id)} style={{ border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", borderRadius: 8, padding: "6px 11px", cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: "inherit" }}>Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── APPRAISALS ── */}
      {view === "appraisals" && (
        <div>
          {/* Cycle filter */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
            <select value={selectedCycle || ""} onChange={(e) => { setSelectedCycle(e.target.value || null); loadAppraisals(e.target.value || null); }} style={selStyle}>
              <option value="">All Cycles</option>
              {cycles.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {appraisals.map((a) => {
              const sm = STATUS_META[a.status] || STATUS_META.pending;
              return (
                <div key={a._id} style={{ background: "#fff", border: "1px solid #e8eaf0", borderRadius: 14, padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#2563eb", fontSize: 14, flexShrink: 0 }}>
                      {(a.employeeId?.name || "?")[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{a.employeeId?.name || "Employee"}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{a.employeeId?.designation || ""}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: sm.color, background: sm.bg, borderRadius: 6, padding: "2px 9px" }}>{sm.label}</span>
                      {a.selfRating > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#64748b" }}>
                          Self: <Stars value={a.selfRating} readonly />
                        </div>
                      )}
                      {a.finalRating > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#16a34a", fontWeight: 700 }}>
                          Final: {a.finalRating}/5 ⭐
                        </div>
                      )}
                      {a.salaryRevisionFlag && <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "2px 8px" }}>Revision {a.salaryRevisionPercent}%</span>}
                      {a.status === "self_assessed" && (
                        <button onClick={() => openReview(a)} style={primaryBtn}>Review</button>
                      )}
                    </div>
                  </div>
                  {a.selfComment && (
                    <div style={{ marginTop: 10, padding: "9px 12px", background: "#f8fafc", borderRadius: 9, fontSize: 12, color: "#475569", borderLeft: "3px solid #e2e8f0" }}>
                      <span style={{ fontWeight: 600, color: "#94a3b8" }}>Self: </span>{a.selfComment}
                    </div>
                  )}
                  {a.managerComment && (
                    <div style={{ marginTop: 6, padding: "9px 12px", background: "#f0fdf4", borderRadius: 9, fontSize: 12, color: "#475569", borderLeft: "3px solid #bbf7d0" }}>
                      <span style={{ fontWeight: 600, color: "#16a34a" }}>Manager: </span>{a.managerComment}
                    </div>
                  )}
                </div>
              );
            })}
            {appraisals.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>No appraisals found.</div>}
          </div>
        </div>
      )}

      {/* ── CREATE CYCLE MODAL ── */}
      {showCreate && (
        <div style={overlayStyle}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>New Review Cycle</div>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <F label="Cycle Title *"><input value={cForm.title} onChange={(e) => setCForm((f) => ({ ...f, title: e.target.value }))} style={inp} placeholder="e.g. Q1 2025 Performance Review" /></F>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <F label="Period">
                  <select value={cForm.period} onChange={(e) => setCForm((f) => ({ ...f, period: e.target.value }))} style={inp}>
                    <option value="annual">Annual</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </F>
                <F label="Year"><input type="number" value={cForm.year} onChange={(e) => setCForm((f) => ({ ...f, year: +e.target.value }))} style={inp} /></F>
                {cForm.period === "quarterly" && (
                  <F label="Quarter"><select value={cForm.quarter} onChange={(e) => setCForm((f) => ({ ...f, quarter: e.target.value }))} style={inp}>
                    {[1,2,3,4].map((q) => <option key={q} value={q}>Q{q}</option>)}
                  </select></F>
                )}
                <F label="Start Date *"><input type="date" value={cForm.startDate} onChange={(e) => setCForm((f) => ({ ...f, startDate: e.target.value }))} style={inp} /></F>
                <F label="End Date *"><input type="date" value={cForm.endDate} onChange={(e) => setCForm((f) => ({ ...f, endDate: e.target.value }))} style={inp} /></F>
              </div>
              <div>
                <label style={lbl}>Review Goals / Prompts</label>
                {cForm.goals.map((g, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                    <input value={g} onChange={(e) => updateGoal(i, e.target.value)} style={{ ...inp, flex: 1 }} placeholder={`Goal ${i + 1}`} />
                    <button onClick={() => removeGoal(i)} style={{ background: "#fef2f2", border: "none", borderRadius: 8, padding: "0 10px", cursor: "pointer", color: "#dc2626" }}><X size={13} /></button>
                  </div>
                ))}
                <button onClick={addGoal} style={{ fontSize: 12, fontWeight: 600, color: "#2563eb", background: "none", border: "1px dashed #93c5fd", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit" }}>+ Add Goal</button>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
                <button onClick={() => setShowCreate(false)} style={cancelBtn}>Cancel</button>
                <button onClick={createCycle} disabled={creating} style={{ ...primaryBtn, opacity: creating ? 0.7 : 1 }}>{creating ? "Creating…" : "Create Cycle"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REVIEW MODAL ── */}
      {reviewTarget && (
        <div style={overlayStyle}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>Review: {reviewTarget.employeeId?.name}</div>
              <button onClick={() => setReviewTarget(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={18} /></button>
            </div>
            {reviewTarget.selfComment && (
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#475569", marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Employee Self-Assessment</div>
                <Stars value={reviewTarget.selfRating} readonly />
                <div style={{ marginTop: 6 }}>{reviewTarget.selfComment}</div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <div>
                <label style={lbl}>Manager Rating</label>
                <Stars value={rForm.managerRating} onChange={(v) => setRForm((f) => ({ ...f, managerRating: v, finalRating: v }))} />
              </div>
              <F label="Manager Comment"><textarea value={rForm.managerComment} onChange={(e) => setRForm((f) => ({ ...f, managerComment: e.target.value }))} style={{ ...inp, height: 80, resize: "vertical" }} /></F>
              <F label="Final Rating (1-5)">
                <Stars value={rForm.finalRating} onChange={(v) => setRForm((f) => ({ ...f, finalRating: v }))} />
              </F>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="checkbox" id="sr" checked={rForm.salaryRevisionFlag} onChange={(e) => setRForm((f) => ({ ...f, salaryRevisionFlag: e.target.checked }))} />
                <label htmlFor="sr" style={{ fontSize: 13, color: "#1e293b", cursor: "pointer" }}>Flag for Salary Revision</label>
              </div>
              {rForm.salaryRevisionFlag && (
                <F label="Revision %"><input type="number" min={0} max={100} value={rForm.salaryRevisionPercent} onChange={(e) => setRForm((f) => ({ ...f, salaryRevisionPercent: +e.target.value }))} style={inp} /></F>
              )}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
                <button onClick={() => setReviewTarget(null)} style={cancelBtn}>Cancel</button>
                <button onClick={submitReview} disabled={reviewing} style={{ ...primaryBtn, opacity: reviewing ? 0.7 : 1 }}>{reviewing ? "Submitting…" : "Submit Review"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const F = ({ label, children }) => <div><label style={lbl}>{label}</label>{children}</div>;
const lbl = { display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 };
const inp = { width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", color: "#1e293b", boxSizing: "border-box", outline: "none", background: "#f8fafc" };
const overlayStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const primaryBtn = { display: "flex", alignItems: "center", gap: 6, background: "#2563eb", color: "#fff", border: "none", borderRadius: 9, padding: "9px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" };
const cancelBtn = { padding: "9px 18px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13 };
const accentBtn = (color) => ({ display: "flex", alignItems: "center", gap: 5, border: "none", background: color + "12", color, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: "inherit" });
const selStyle = { padding: "8px 12px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", background: "#f8fafc", color: "#1e293b", outline: "none" };
