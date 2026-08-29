import React from "react";
import {
  Activity, AlarmClock, AlertCircle, Calendar, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Download, FileText, Hourglass, LogIn, Palmtree, Timer, TrendingDown, TrendingUp,
  UserCheck, Users, UserX, XCircle,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ATT_STATUS_META, AttStatCard, ChartCard, CustomTooltip, FieldIcon, KpiCard,
  baseFilter, fmtDateTime, fmtMin, fmtShortDate,
} from "./shared";
import useTenantTheme from "../../hooks/useTenantTheme";

export default function AttendanceSection({
  attFilters,
  setAttFilter,
  setAttFilters,
  attUsers,
  handleExport,
  attError,
  attLoading,
  attRows,
  computeRunning,
  attPagination,
  attPage,
  setAttPage,
  selectedDayTotal,
  attSummary,
  attActiveNow,
  leaves = [],
  leaveActionId,
  handleLeaveDecision,
  attDashboard,
  attDashboardLoading,
  attDashboardError,
  attDashboardDate,
  setAttDashboardDate,
}) {
  const { T } = useTenantTheme();
  const LEAVE_STATUS_META = {
    pending:  { label: "Pending",  color: T.yellow, bg: T.yellowBg, border: T.yellowBorder, Icon: Hourglass    },
    approved: { label: "Approved", color: T.green,  bg: T.greenBg,  border: T.greenBorder,  Icon: CheckCircle2 },
    rejected: { label: "Rejected", color: T.red,    bg: T.redBg,    border: T.redBorder,    Icon: XCircle      },
  };
  const STATUS_BREAKDOWN_COLORS = { Present: T.green, Absent: T.red, "On Leave": T.brand, "Half Day": "#7c3aed" };
  const pendingLeaves = leaves.filter(l => l.status === "pending").length;
  const d = attDashboard || {};
  const workingHours = d.workingHours || {};
  const checkIn = d.checkIn || {};
  const leaveAnalytics = d.leaveAnalytics || {};
  const trend = d.attendanceTrend || 0;
  const ratePieData = [
    { name: "Present", value: d.attendanceRate || 0 },
    { name: "Remaining", value: Math.max(0, 100 - (d.attendanceRate || 0)) },
  ];
  const statusBreakdownData = (d.statusBreakdown || []).filter(s => s.count > 0);

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>Attendance Dashboard</h2>
          <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>Overview of your organization's attendance.</p>
        </div>
        <div style={{ position: "relative" }}>
          <FieldIcon icon={Calendar} small />
          <input type="date" value={attDashboardDate} onChange={e => setAttDashboardDate(e.target.value)} className="att-inp" style={baseFilter} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 18 }}>
        <KpiCard Icon={Users} label="Total Employees" value={d.totalEmployees ?? "—"} color={T.brand} bgColor={T.brandLight} sub="All active employees" />
        <KpiCard Icon={UserCheck} label="Present Today" value={d.presentToday ?? "—"} color={T.green} bgColor={T.greenBg} sub={d.totalEmployees ? `${((d.presentToday / d.totalEmployees) * 100).toFixed(2)}% of total` : ""} />
        <KpiCard Icon={UserX} label="Absent Today" value={d.absentToday ?? "—"} color={T.red} bgColor={T.redBg} sub={d.totalEmployees ? `${((d.absentToday / d.totalEmployees) * 100).toFixed(2)}% of total` : ""} />
        <KpiCard Icon={Palmtree} label="On Leave" value={d.onLeave ?? "—"} color="#d97706" bgColor="#fff7ed" sub={d.totalEmployees ? `${((d.onLeave / d.totalEmployees) * 100).toFixed(2)}% of total` : ""} />
{/*         <KpiCard Icon={AlarmClock} label="Late Arrivals" value={d.lateArrivals ?? "—"} color="#7c3aed" bgColor="#f5f3ff" sub={d.totalEmployees ? `${((d.lateArrivals / d.totalEmployees) * 100).toFixed(2)}% of total` : ""} />
 */}        <KpiCard Icon={FileText} label="Pending Requests" value={d.pendingRequests ?? "—"} color={T.yellow} bgColor={T.yellowBg} sub="Leave requests" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr ", gap: 16, marginBottom: 18 }}>
        <ChartCard title="Attendance Rate">
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ position: "relative", width: 130, height: 130, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ratePieData} cx="50%" cy="50%" innerRadius={48} outerRadius={62} startAngle={90} endAngle={-270} dataKey="value" stroke="none">
                    <Cell fill={T.green} />
                    <Cell fill={T.borderLight} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: T.textPrimary }}>{(d.attendanceRate ?? 0).toFixed(2)}%</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>Today's Attendance</div>
              <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3 }}>(Present + Half Day) / Total Employees</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 999, color: trend >= 0 ? T.green : T.red, background: trend >= 0 ? T.greenBg : T.redBg }}>
                {trend >= 0 ? <TrendingUp size={12} strokeWidth={2.4} /> : <TrendingDown size={12} strokeWidth={2.4} />}
                {Math.abs(trend).toFixed(2)}% vs Yesterday
              </div>
            </div>
          </div>
        </ChartCard>

       {/*  <ChartCard title="Average Working Hours">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: "#dbeafe", display: "grid", placeItems: "center" }}>
              <Timer size={17} color="#1d4ed8" strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 22, color: T.textPrimary, lineHeight: 1 }}>{fmtMin(workingHours.avgMinutes || 0)}</div>
              <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3 }}>Today's Average</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: T.bg, borderRadius: 12, padding: "12px 14px" }}>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted }}>Max Working Hours</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, marginTop: 4 }}>{fmtMin(workingHours.maxMinutes || 0)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted }}>Min Working Hours</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, marginTop: 4 }}>{fmtMin(workingHours.minMinutes || 0)}</div>
            </div>
          </div>
        </ChartCard> */}
        <ChartCard title="Leave Analytics" subtitle={leaveAnalytics.month ? `Month: ${leaveAnalytics.month}` : ""}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Pending Requests", value: leaveAnalytics.pendingRequests ?? 0 },
              { label: "Approved Leaves", value: leaveAnalytics.approvedLeaves ?? 0 },
              { label: "Rejected Leaves", value: leaveAnalytics.rejectedLeaves ?? 0 },
              { label: "Leaves Taken", value: leaveAnalytics.leavesTaken ?? 0 },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12.5, color: T.textSecondary }}>{item.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, fontFamily: "'Syne', sans-serif" }}>{item.value}</span>
              </div>
            ))}
            <div style={{ marginTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11.5, color: T.textMuted }}>
                <span>Approval Rate</span>
                <span style={{ fontWeight: 700, color: T.green }}>{leaveAnalytics.approvalRate ?? 0}%</span>
              </div>
              <div style={{ height: 6, background: T.borderLight, borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${leaveAnalytics.approvalRate ?? 0}%`, borderRadius: 99, background: `linear-gradient(90deg, ${T.brand}, #16a34a)` }} />
              </div>
            </div>
          </div>
        </ChartCard>
      
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
      

        
      </div>

      {attDashboardLoading && !attDashboard && (
        <div style={{ textAlign: "center", padding: "14px 0", color: T.textMuted, fontSize: 12.5 }}>Loading dashboard…</div>
      )}

      {attDashboardError && (
        <div style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 9, color: T.red, background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: 9, padding: "10px 14px", fontSize: 12.5 }}>
          <AlertCircle size={14} strokeWidth={2} />{attDashboardError}
        </div>
      )}


      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,.04)", overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.borderLight}`, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative" }}>
            <FieldIcon icon={Calendar} small />
            <input type="date" value={attFilters.date} onChange={e => setAttFilter("date", e.target.value)} className="att-inp" style={baseFilter} />
          </div>
          <div style={{ position: "relative" }}>
            <FieldIcon icon={Users} small />
            <select value={attFilters.userId} onChange={e => setAttFilter("userId", e.target.value)} className="att-inp" style={{ ...baseFilter, paddingRight: 28, appearance: "none", minWidth: 140 }}>
              <option value="">All Users</option>
              {attUsers.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </div>
          <div style={{ position: "relative" }}>
            <FieldIcon icon={Activity} small />
            <select value={attFilters.status} onChange={e => setAttFilter("status", e.target.value)} className="att-inp" style={{ ...baseFilter, paddingRight: 28, appearance: "none", minWidth: 130 }}>
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Offline">Offline</option>
            </select>
          </div>
          <div style={{ position: "relative" }}>
            <FieldIcon icon={Calendar} small />
            <input type="month" value={attFilters.month} onChange={e => setAttFilters(p => ({ ...p, month: e.target.value }))} className="att-inp" style={baseFilter} />
          </div>
          <button onClick={handleExport} className="att-exp-btn" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, background: `linear-gradient(135deg, ${T.teal}, #0d9488)`, color: "#fff", borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif", boxShadow: "0 2px 8px rgba(15,118,110,.25)" }}>
            <Download size={14} strokeWidth={2.2} /> Export Excel
          </button>
        </div>

        {attError && (
          <div style={{ margin: "14px 22px 0", display: "flex", alignItems: "center", gap: 9, color: T.red, background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: 9, padding: "10px 14px", fontSize: 12.5 }}>
            <AlertCircle size={14} strokeWidth={2} />{attError}
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: T.bg }}>
                {["User", "Date", "Login Time", "Logout Time", "Working Time", "Status"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "11px 16px", borderBottom: `1px solid ${T.border}`, fontSize: 10.5, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: T.textMuted, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attLoading && <tr><td colSpan={6} style={{ textAlign: "center", padding: "40px 0", color: T.textMuted, fontSize: 13 }}>Loading records…</td></tr>}
              {!attLoading && attRows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "60px 0" }}>
                    <Clock size={38} strokeWidth={1} color={T.textMuted} style={{ display: "block", margin: "0 auto 12px" }} />
                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, color: T.textSecondary }}>No attendance records found</p>
                    <p style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>Try adjusting your filters</p>
                  </td>
                </tr>
              )}
              {attRows.map((row, i) => {
                const sm = ATT_STATUS_META[row.status] || ATT_STATUS_META.Offline;
                const min = computeRunning(row);
                const isActive = row.status === "Active";
                return (
                  <tr key={row._id} className="att-row" style={{ background: i % 2 === 0 ? "#fff" : T.bg, borderBottom: `1px solid ${T.borderLight}` }}>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #0891b2, #06b6d4)", display: "grid", placeItems: "center", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 11, color: "#fff" }}>
                          {(row.userId?.name || "?").trim().split(/\s+/).map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <span style={{ fontWeight: 600, color: T.textPrimary }}>{row.userId?.name || "Unknown"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px", color: T.textSecondary }}>{row.displayDate || row.date}</td>
                    <td style={{ padding: "13px 16px", color: T.textSecondary, whiteSpace: "nowrap" }}>{fmtDateTime(row.loginTime)}</td>
                    <td style={{ padding: "13px 16px", color: T.textSecondary, whiteSpace: "nowrap" }}>
                      {isActive ? <span style={{ fontSize: 11, fontWeight: 600, color: "#0369a1", background: "#e0f2fe", padding: "3px 8px", borderRadius: 6 }}>Session Active</span> : fmtDateTime(row.logoutTime)}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: isActive ? T.green : T.textPrimary }}>{fmtMin(min)}</span>
                      {isActive && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: T.green, marginLeft: 6, verticalAlign: "middle", boxShadow: `0 0 0 2px ${T.greenBg}` }} />}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "5px 11px", borderRadius: 8, color: sm.color, background: sm.bg, border: `1px solid ${sm.border}`, letterSpacing: ".04em" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: sm.color, flexShrink: 0 }} />
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 22px", borderTop: `1px solid ${T.borderLight}` }}>
          <span style={{ fontSize: 12, color: T.textMuted }}>{attPagination.total || 0} record{attPagination.total !== 1 ? "s" : ""}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setAttPage(p => Math.max(1, p - 1))} disabled={attPage <= 1} className="att-page-btn" style={{ width: 34, height: 34, borderRadius: 8, border: `1.5px solid ${T.border}`, background: "#fff", color: T.textSecondary, display: "grid", placeItems: "center" }}>
              <ChevronLeft size={15} strokeWidth={2} />
            </button>
            <span style={{ fontSize: 12.5, color: T.textSecondary, fontWeight: 600, minWidth: 80, textAlign: "center" }}>Page {attPage} / {attPagination.totalPages || 1}</span>
            <button onClick={() => setAttPage(p => Math.min(attPagination.totalPages || 1, p + 1))} disabled={attPage >= (attPagination.totalPages || 1)} className="att-page-btn" style={{ width: 34, height: 34, borderRadius: 8, border: `1.5px solid ${T.border}`, background: "#fff", color: T.textSecondary, display: "grid", placeItems: "center" }}>
              <ChevronRight size={15} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,.04)", overflow: "hidden", marginTop: 24 }}>
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: T.textPrimary }}>Leave Requests</h3>
            <p style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>Review and approve or reject employee leave requests.</p>
          </div>
          {pendingLeaves > 0 && (
            <span style={{ fontSize: 11.5, fontWeight: 700, padding: "6px 12px", borderRadius: 999, color: T.yellow, background: T.yellowBg, border: `1px solid ${T.yellowBorder}` }}>
              {pendingLeaves} pending
            </span>
          )}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: T.bg }}>
                {["Employee", "From", "To", "Reason", "Status", "Actions"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "11px 16px", borderBottom: `1px solid ${T.border}`, fontSize: 10.5, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: T.textMuted, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaves.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "50px 0" }}>
                    <FileText size={32} strokeWidth={1} color={T.textMuted} style={{ display: "block", margin: "0 auto 10px" }} />
                    <p style={{ fontSize: 13, color: T.textMuted }}>No leave requests yet</p>
                  </td>
                </tr>
              )}
              {leaves.map((leave, i) => {
                const lm = LEAVE_STATUS_META[leave.status] || LEAVE_STATUS_META.pending;
                const isActing = leaveActionId === leave._id;
                return (
                  <tr key={leave._id} style={{ background: i % 2 === 0 ? "#fff" : T.bg, borderBottom: `1px solid ${T.borderLight}` }}>
                    <td style={{ padding: "13px 16px", fontWeight: 600, color: T.textPrimary }}>{leave.userId?.name || "Unknown"}</td>
                    <td style={{ padding: "13px 16px", color: T.textSecondary, whiteSpace: "nowrap" }}>{fmtShortDate(leave.fromDate)}</td>
                    <td style={{ padding: "13px 16px", color: T.textSecondary, whiteSpace: "nowrap" }}>{fmtShortDate(leave.toDate)}</td>
                    <td style={{ padding: "13px 16px", color: T.textSecondary, maxWidth: 240 }}>{leave.reason}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "5px 11px", borderRadius: 8, color: lm.color, background: lm.bg, border: `1px solid ${lm.border}` }}>
                        <lm.Icon size={11} strokeWidth={2} />{lm.label}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                      {leave.status === "pending" ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button disabled={isActing} onClick={() => handleLeaveDecision(leave._id, "approved")} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, padding: "6px 11px", borderRadius: 7, border: "none", color: "#fff", background: T.green, cursor: isActing ? "not-allowed" : "pointer", opacity: isActing ? .6 : 1 }}>
                            <CheckCircle2 size={12} strokeWidth={2.2} /> Approve
                          </button>
                          <button disabled={isActing} onClick={() => handleLeaveDecision(leave._id, "rejected")} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, padding: "6px 11px", borderRadius: 7, border: "none", color: "#fff", background: T.red, cursor: isActing ? "not-allowed" : "pointer", opacity: isActing ? .6 : 1 }}>
                            <XCircle size={12} strokeWidth={2.2} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: T.textMuted }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
