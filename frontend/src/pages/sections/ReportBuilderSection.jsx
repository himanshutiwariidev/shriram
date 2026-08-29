import React, { useState, useEffect, useCallback } from "react";
import API from "../../services/api";
import {
  BarChart2, Play, Download, Save, Trash2, BookOpen, X, ChevronDown,
  TrendingUp, ClipboardList, Clock, Receipt, Plane, DollarSign,
} from "lucide-react";

const DOMAINS = [
  { id: "revenue",    label: "Revenue",    desc: "Payment receipts from proposals", icon: TrendingUp,    color: "#16a34a" },
  { id: "tasks",     label: "Tasks",      desc: "Task completion by user & due date", icon: ClipboardList, color: "#7c3aed" },
  { id: "attendance",label: "Attendance", desc: "Check-in/out records by employee", icon: Clock,         color: "#0891b2" },
  { id: "expenses",  label: "Expenses",   desc: "Expense breakdown by category",   icon: Receipt,       color: "#d97706" },
  { id: "leaves",    label: "Leaves",     desc: "Leave requests and approvals",    icon: Plane,         color: "#dc2626" },
];

function fmtINR(n) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
}

function exportCSV(columns, rows, filename) {
  const header = columns.join(",");
  const body = rows.map((r) => columns.map((c) => `"${(r[c] || "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename + ".csv"; a.click();
  URL.revokeObjectURL(url);
}

export default function ReportBuilderSection() {
  const [domain, setDomain] = useState(null);
  const [filters, setFilters] = useState({ startDate: "", endDate: "" });
  const [result, setResult] = useState(null); // { columns, rows }
  const [running, setRunning] = useState(false);
  const [savedReports, setSavedReports] = useState([]);
  const [saveName, setSaveName] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);

  const loadSaved = useCallback(async () => {
    try {
      const { data } = await API.get("/reports/saved");
      setSavedReports(data.reports || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadSaved(); }, [loadSaved]);

  const runReport = async () => {
    if (!domain) return;
    setRunning(true);
    setResult(null);
    try {
      const { data } = await API.post("/reports/run", { domain: domain.id, filters });
      setResult(data);
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to run report");
    }
    finally { setRunning(false); }
  };

  const handleSave = async () => {
    if (!saveName.trim() || !domain) return;
    try {
      await API.post("/reports/saved", { name: saveName, domain: domain.id, filters });
      await loadSaved();
      setShowSaveModal(false);
      setSaveName("");
    } catch { /* ignore */ }
  };

  const loadSavedReport = async (r) => {
    const d = DOMAINS.find((x) => x.id === r.domain);
    if (!d) return;
    setDomain(d);
    setFilters(r.filters || { startDate: "", endDate: "" });
    setResult(null);
  };

  const deleteSaved = async (id) => {
    try { await API.delete(`/reports/saved/${id}`); await loadSaved(); } catch { /* ignore */ }
  };

  const totalRow = result?.rows?.length;
  const revenueTotal = domain?.id === "revenue"
    ? result?.rows?.reduce((s, r) => s + parseFloat(r["Amount (₹)"] || 0), 0)
    : null;

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fdf4ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BarChart2 size={20} color="#7c3aed" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: "#1e293b" }}>Report Builder</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Generate, filter, save, and export reports across all data domains</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>
        {/* Left panel: domain + filters + saved */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Domain selector */}
          <div style={{ background: "#fff", border: "1px solid #e8eaf0", borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Data Domain</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {DOMAINS.map((d) => {
                const DIcon = d.icon;
                const active = domain?.id === d.id;
                return (
                  <button key={d.id} onClick={() => { setDomain(d); setResult(null); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                      border: `1px solid ${active ? d.color + "66" : "#e2e8f0"}`,
                      borderRadius: 10, background: active ? d.color + "0f" : "#f8fafc",
                      cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: d.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <DIcon size={14} color={d.color} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: active ? d.color : "#1e293b" }}>{d.label}</div>
                      <div style={{ fontSize: 10, color: "#94a3b8" }}>{d.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          {domain && (
            <div style={{ background: "#fff", border: "1px solid #e8eaf0", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Filters</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Start Date</label>
                  <input type="date" value={filters.startDate}
                    onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>End Date</label>
                  <input type="date" value={filters.endDate}
                    onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
                    style={inputStyle} />
                </div>
                {(domain.id === "leaves") && (
                  <div>
                    <label style={labelStyle}>Status</label>
                    <select value={filters.status || ""} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} style={inputStyle}>
                      <option value="">All</option>
                      <option value="approved">Approved</option>
                      <option value="pending">Pending</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                )}
              </div>
              <button onClick={runReport} disabled={running}
                style={{ marginTop: 14, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 0", borderRadius: 10, border: "none", background: domain.color, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", opacity: running ? 0.7 : 1 }}>
                <Play size={14} /> {running ? "Running…" : "Run Report"}
              </button>
            </div>
          )}

          {/* Saved reports */}
          <div style={{ background: "#fff", border: "1px solid #e8eaf0", borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <BookOpen size={11} /> Saved Reports
            </div>
            {savedReports.length === 0 && <div style={{ fontSize: 12, color: "#cbd5e1" }}>No saved reports yet.</div>}
            {savedReports.map((r) => {
              const d = DOMAINS.find((x) => x.id === r.domain);
              return (
                <div key={r._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <button onClick={() => loadSavedReport(r)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left", flex: 1, padding: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: "#1e293b" }}>{r.name}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>{d?.label || r.domain}</div>
                  </button>
                  <button onClick={() => deleteSaved(r._id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: 4 }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panel: results */}
        <div style={{ background: "#fff", border: "1px solid #e8eaf0", borderRadius: 14, overflow: "hidden", minHeight: 300 }}>
          {!result && !running && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 60, color: "#94a3b8" }}>
              <BarChart2 size={48} color="#e2e8f0" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 14 }}>Select a domain and click Run Report</div>
            </div>
          )}
          {running && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, color: "#94a3b8" }}>
              Running report…
            </div>
          )}
          {result && (
            <>
              {/* Results header */}
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b", flex: 1 }}>
                  {domain?.label} Report
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8", marginLeft: 10 }}>{totalRow} rows</span>
                  {revenueTotal !== null && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", marginLeft: 10 }}>Total: {fmtINR(revenueTotal)}</span>
                  )}
                </div>
                <button onClick={() => exportCSV(result.columns, result.rows, `${domain?.label}-report`)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "1px solid #e2e8f0", borderRadius: 9, background: "#f8fafc", color: "#475569", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  <Download size={13} /> Export CSV
                </button>
                <button onClick={() => setShowSaveModal(true)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "none", borderRadius: 9, background: "#2563eb", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                  <Save size={13} /> Save Report
                </button>
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                {result.rows.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No data for the selected filters.</div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        {result.columns.map((col) => (
                          <th key={col} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 11, letterSpacing: "0.04em", borderBottom: "1px solid #e8eaf0", whiteSpace: "nowrap" }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                          {result.columns.map((col) => (
                            <td key={col} style={{ padding: "9px 14px", color: "#1e293b", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                              {row[col] ?? "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Save modal */}
      {showSaveModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>Save Report</div>
              <button onClick={() => setShowSaveModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={18} /></button>
            </div>
            <label style={labelStyle}>Report Name</label>
            <input value={saveName} onChange={(e) => setSaveName(e.target.value)}
              placeholder="e.g. Monthly Revenue Q1" style={{ ...inputStyle, marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowSaveModal(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleSave} style={primaryBtnStyle}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 };
const inputStyle = { width: "100%", padding: "8px 11px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", color: "#1e293b", boxSizing: "border-box", outline: "none", background: "#f8fafc" };
const cancelBtnStyle = { padding: "9px 18px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13 };
const primaryBtnStyle = { padding: "9px 18px", borderRadius: 9, border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13 };
