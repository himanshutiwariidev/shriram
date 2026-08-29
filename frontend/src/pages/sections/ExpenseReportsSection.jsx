import React, { useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Download, Filter, FileText } from "lucide-react";
import useTenantTheme from "../../hooks/useTenantTheme";
import API from "../../services/api";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const BAR_COLORS = ["#0ea5e9","#6366f1","#22c55e","#f59e0b","#ef4444","#8b5cf6","#14b8a6","#ec4899"];

const GROUP_OPTIONS = [
  { value: "month",      label: "By Month" },
  { value: "category",   label: "By Category" },
  { value: "department", label: "By Department" },
  { value: "employee",   label: "By Employee" },
  { value: "status",     label: "By Status" },
];

const STATUS_OPTIONS = ["", "draft", "submitted", "pending", "approved", "rejected", "paid"];
const CURRENT_YEAR = new Date().getFullYear();

function fmt(n) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

function SummaryCard({ label, value, color, T }) {
  return (
    <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || T.textPrimary, fontFamily: "'Syne', sans-serif" }}>{value}</div>
      <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>{label}</div>
    </div>
  );
}

export default function ExpenseReportsSection() {
  const { T } = useTenantTheme();
  const [filters, setFilters] = useState({
    startDate: `${CURRENT_YEAR}-01-01`,
    endDate: `${CURRENT_YEAR}-12-31`,
    groupBy: "month",
    status: "",
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);

  const runReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const { data } = await API.get("/expenses/report", { params });
      setReportData(data);
      setRan(true);
    } catch { /* keep */ } finally { setLoading(false); }
  }, [filters]);

  const setF = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  const exportCsv = () => {
    if (!reportData?.expenses?.length) return;
    const rows = reportData.expenses.map((e) => [
      e.expenseId || "",
      e.title || "",
      e.categoryId?.name || "",
      e.employeeId?.name || "",
      e.departmentId?.name || "",
      e.expenseDate ? new Date(e.expenseDate).toLocaleDateString("en-IN") : "",
      e.amount || 0,
      e.tax || 0,
      e.totalAmount || 0,
      e.paymentMethod || "",
      e.status || "",
      e.source || "",
    ]);
    const header = ["ID","Title","Category","Employee","Department","Date","Amount","Tax","Total","Payment","Status","Source"];
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expense-report-${filters.startDate}-${filters.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartData = reportData?.grouped?.map((g, i) => {
    let name = g._id;
    if (filters.groupBy === "month" && g._id?.year) {
      name = `${MONTH_NAMES[(g._id.month || 1) - 1]} ${g._id.year}`;
    } else if (!name) {
      name = "Unknown";
    }
    return { name: String(name), amount: g.total, count: g.count, fill: BAR_COLORS[i % BAR_COLORS.length] };
  }) || [];

  const inpStyle = { padding: "8px 12px", borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: T.inputBg, color: T.textPrimary, fontSize: 12.5, fontFamily: "inherit", outline: "none" };

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: T.textPrimary }}>Expense Reports</h2>
        <p style={{ fontSize: 13, color: T.textMuted, marginTop: 3 }}>Filter, analyze, and export expense data</p>
      </div>

      {/* Filter bar */}
      <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: "16px 20px", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, marginBottom: 4 }}>FROM DATE</div>
          <input className="inp" style={inpStyle} type="date" value={filters.startDate} onChange={setF("startDate")} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, marginBottom: 4 }}>TO DATE</div>
          <input className="inp" style={inpStyle} type="date" value={filters.endDate} onChange={setF("endDate")} />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, marginBottom: 4 }}>GROUP BY</div>
          <select className="inp" style={{ ...inpStyle, appearance: "none" }} value={filters.groupBy} onChange={setF("groupBy")}>
            {GROUP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, marginBottom: 4 }}>STATUS</div>
          <select className="inp" style={{ ...inpStyle, appearance: "none" }} value={filters.status} onChange={setF("status")}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || "All statuses"}</option>)}
          </select>
        </div>
        <button
          onClick={runReport}
          className="pri-btn"
          style={{ display: "flex", alignItems: "center", gap: 7, background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff", borderRadius: 10, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, fontFamily: "'Syne', sans-serif", border: "none", cursor: "pointer" }}
        >
          <Filter size={14} /> Run Report
        </button>
        {ran && (
          <button
            onClick={exportCsv}
            style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "8px 16px", fontSize: 13, color: T.textSecondary, cursor: "pointer", fontFamily: "inherit" }}
          >
            <Download size={14} /> Export CSV
          </button>
        )}
      </div>

      {loading && <div style={{ padding: 40, textAlign: "center", color: T.textMuted }}>Running report…</div>}

      {!loading && !ran && (
        <div style={{ padding: 60, textAlign: "center", color: T.textMuted }}>
          <FileText size={40} strokeWidth={1.2} style={{ opacity: .3, marginBottom: 14 }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Set filters and run the report</div>
          <div style={{ fontSize: 13 }}>Results will appear here</div>
        </div>
      )}

      {!loading && ran && reportData && (
        <>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
            <SummaryCard label="Total Expenses" value={fmt(reportData.summary?.total)} color="#6366f1" T={T} />
            <SummaryCard label="Count" value={reportData.summary?.count || 0} T={T} />
            <SummaryCard label="Average" value={fmt(reportData.summary?.avg)} T={T} />
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 16, padding: "20px 24px" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, marginBottom: 16 }}>
                {GROUP_OPTIONS.find((o) => o.value === filters.groupBy)?.label || "Breakdown"}
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Amount"]} />
                  <Bar dataKey="amount" radius={[5, 5, 0, 0]}>
                    {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Table */}
          {reportData.expenses?.length > 0 && (
            <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary }}>Expense Entries</div>
                <div style={{ fontSize: 12, color: T.textMuted }}>{reportData.expenses.length} records</div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: T.bg }}>
                      {["Date","Title","Category","Employee","Amount","Status"].map((h) => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.expenses.slice(0, 200).map((exp) => (
                      <tr key={exp._id} className="data-row" style={{ borderTop: `1px solid ${T.borderLight}` }}>
                        <td style={{ padding: "11px 16px", fontSize: 12.5, color: T.textSecondary, whiteSpace: "nowrap" }}>{new Date(exp.expenseDate).toLocaleDateString("en-IN")}</td>
                        <td style={{ padding: "11px 16px", fontSize: 13, color: T.textPrimary }}>{exp.title}</td>
                        <td style={{ padding: "11px 16px", fontSize: 12, color: T.textMuted }}>{exp.categoryId?.name || "—"}</td>
                        <td style={{ padding: "11px 16px", fontSize: 12, color: T.textMuted }}>{exp.employeeId?.name || "—"}</td>
                        <td style={{ padding: "11px 16px", fontSize: 13.5, fontWeight: 600, color: T.textPrimary, whiteSpace: "nowrap" }}>₹{Number(exp.totalAmount).toLocaleString("en-IN")}</td>
                        <td style={{ padding: "11px 16px" }}>
                          <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 9px", borderRadius: 20, background: "#6366f118", color: "#6366f1", textTransform: "capitalize" }}>{exp.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {reportData.expenses?.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: T.textMuted }}>No expenses match the selected filters.</div>
          )}
        </>
      )}
    </div>
  );
}
