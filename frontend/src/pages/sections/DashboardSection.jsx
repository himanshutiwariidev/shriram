import React, { useEffect, useRef, useState } from "react";
import {
  Wallet, CreditCard, TrendingUp, BarChart3,
  CalendarDays, Settings, ListTodo, Briefcase, UserPlus,
  Calendar, Download, Star, Users,
  CheckCircle2, XCircle, Clock, Bell,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import useTenantTheme from "../../hooks/useTenantTheme";
import { useAuth } from "../../context/AuthContext";
import API from "../../services/api";

const RS = <span style={{ fontFamily: "'Noto Sans', sans-serif" }}>₹</span>;
const INR = (n) => {
  const v = Number(n || 0);
  return v < 0
    ? <>-{RS}{Math.abs(v).toLocaleString("en-IN")}</>
    : <>{RS}{v.toLocaleString("en-IN")}</>;
};
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const ROLE_BADGE = {
  admin:       { label: "Admin",  color: "#8b5cf6", bg: "#f5f3ff" },
  tenant_admin:{ label: "Admin",  color: "#8b5cf6", bg: "#f5f3ff" },
  hr:          { label: "HR",     color: "#3b82f6", bg: "#eff6ff" },
  sales:       { label: "Sales",  color: "#22c55e", bg: "#f0fdf4" },
  user:        { label: "User",   color: "#64748b", bg: "#f8fafc" },
  client:      { label: "Client", color: "#f97316", bg: "#fff7ed" },
};

// ── Full-width sparkline (icon left layout version) ─────────────────────────
function SparkLine({ data, color, id }) {
  const raw = data?.length ? data : [];
  // Pad to ≥8 points so recharts always draws a line, not a lone dot
  const pts = raw.length >= 2
    ? raw
    : [...Array.from({ length: Math.max(0, 8 - raw.length) }, () => ({ v: 0 })), ...raw];
  return (
    <ResponsiveContainer width="100%" height={44}>
      <AreaChart data={pts} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0}    />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2}
              fill={`url(#${id})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Full-width mini bar chart for Growth card ────────────────────────────────
function MiniBars({ data, color }) {
  const raw = data?.length ? data : [];
  const pts = raw.length >= 2
    ? raw
    : [...Array.from({ length: Math.max(0, 6 - raw.length) }, () => ({ v: 0 })), ...raw];
  return (
    <ResponsiveContainer width="100%" height={44}>
      <BarChart data={pts} margin={{ top: 2, right: 0, left: 0, bottom: 0 }} barSize={10}>
        <Bar dataKey="v" fill={color} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── KPI Card — icon LEFT (large), content right, sparkline bottom ────────────
function KpiCard({ title, value, trend, trendUp, lowerIsBetter, subtitle, Icon, iconColor, iconBg, valueColor, headerExtra, children }) {
  const { T } = useTenantTheme();
  const trendColor = lowerIsBetter
    ? (trendUp ? "#dc2626" : "#16a34a")
    : (trendUp ? "#16a34a" : "#dc2626");
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 16, padding: "13px 14px 10px",
      boxShadow: "0 1px 4px rgba(0,0,0,.05)",
    }}>
      {/* icon + text row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 50, height: 50, borderRadius: 12, background: iconBg,
          display: "grid", placeItems: "center", flexShrink: 0,
        }}>
          <Icon size={22} color={iconColor} strokeWidth={2} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500, fontFamily: "'Poppins', sans-serif" }}>{title}</div>
            {headerExtra}
          </div>
          <div style={{
            fontSize: 23, fontWeight: 500, color: valueColor || "#0f172a",
            fontFamily: "'Poppins', sans-serif", lineHeight: 1.15, marginTop: 2,
          }}>
            {value}
          </div>
          {trend ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: trendColor, fontFamily: "'Poppins', sans-serif" }}>
                {trendUp ? "↑" : "↓"} {trend}
              </span>
              <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'Poppins', sans-serif" }}>{subtitle}</span>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3, fontFamily: "'Poppins', sans-serif" }}>{subtitle}</div>
          )}
        </div>
      </div>
      {/* full-width sparkline / bar chart at bottom */}
      {children}
    </div>
  );
}

// ── Chart tooltip ────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }) {
  const { T } = useTenantTheme();
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "8px 12px", boxShadow: "0 6px 20px rgba(0,0,0,.1)" }}>
      {label && <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>{label}</div>}
      {payload.map((p) => (
        <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, marginTop: 2 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, display: "inline-block" }} />
          <span style={{ color: "#64748b" }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: "#0f172a" }}>{INR(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function DashboardSection({
  users, tasks, totalTaskCount,
  done, inProg, pend,
  dashboardStats, fetchDashboardStats,
  attDashboard, setAttDashboardDate,
  setTab,
}) {
  const { T } = useTenantTheme();
  const { user: authUser } = useAuth();

  const [expStats, setExpStats]     = useState(null);
  const [growthMode, setGrowthMode] = useState("monthly"); // "monthly" | "yearly"
  const [meetings, setMeetings]     = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const dateInputRef = useRef(null);

  const fetchExpenses = (start, end) => {
    const params = start && end ? { params: { start, end } } : {};
    API.get("/expenses/dashboard", params).then(({ data }) => setExpStats(data)).catch(() => {});
  };

  useEffect(() => {
    let dead = false;
    API.get("/expenses/dashboard").then(({ data }) => { if (!dead) setExpStats(data); }).catch(() => {});
    API.get("/meetings/mine").then(({ data }) => { if (!dead) setMeetings(data.meetings || []); }).catch(() => { if (!dead) setMeetings([]); });
    return () => { dead = true; };
  }, []);

  const handleDateChange = (newDateStr) => {
    if (!newDateStr) return;
    setSelectedDate(newDateStr);
    if (setAttDashboardDate) setAttDashboardDate(newDateStr);
    const d = new Date(newDateStr);
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
    if (fetchDashboardStats) fetchDashboardStats({ start, end });
    fetchExpenses(start, end);
  };

  // ── Selected date helpers ────────────────────────────────────────────────
  const selDate = new Date(selectedDate + "T00:00:00");
  const selKey  = selDate.toDateString();

  // ── Financial KPIs ─────────────────────────────────────────────────────
  const totalCollections = dashboardStats?.totalRevenue    || 0;
  const totalExpenses    = expStats?.totals?.totalMonth    || 0;   // period-filtered, not all-time
  const totalProfit      = totalCollections - totalExpenses;
  const pendingApprovals = expStats?.totals?.pendingCount  || 0;

  // ── Month-over-month trend percentages ─────────────────────────────
  const selMonthLabel = selDate.toLocaleDateString("en-US", { month: "short" });
  const selMonthYear  = selDate.getFullYear();

  // Collections: find selected month and prior month in the 8-month trailing trend
  const collMonths    = dashboardStats?.monthlyTrend || [];
  const selCollIdx    = collMonths.findIndex((t) => t.label === selMonthLabel && Number(t.year) === selMonthYear);
  const currMonthColl = selCollIdx >= 0 ? collMonths[selCollIdx].collected : (collMonths[collMonths.length - 1]?.collected || 0);
  const prevMonthColl = selCollIdx > 0  ? collMonths[selCollIdx - 1].collected : 0;
  const collTrendAbs  = prevMonthColl > 0
    ? Math.abs(((currMonthColl - prevMonthColl) / prevMonthColl) * 100).toFixed(1)
    : currMonthColl > 0 ? "100.0" : null;
  const collTrendUp   = currMonthColl >= prevMonthColl;

  // Expenses: find selected month and prior month in the 12-month expense trend
  const expMonths    = expStats?.trendData || [];
  const selMonthStr  = `${selMonthLabel} ${selMonthYear}`;
  const selExpIdx    = expMonths.findIndex((t) => t.month === selMonthStr);
  const currMonthExp  = selExpIdx >= 0 ? expMonths[selExpIdx].amount  : totalExpenses;
  const prevMonthExp  = selExpIdx > 0  ? expMonths[selExpIdx - 1].amount : 0;
  const expTrendAbs   = prevMonthExp > 0
    ? Math.abs(((currMonthExp - prevMonthExp) / prevMonthExp) * 100).toFixed(1)
    : currMonthExp > 0 ? "100.0" : null;
  const expTrendUp    = currMonthExp > prevMonthExp; // true = expenses went UP (bad for lowerIsBetter card)

  // Profit trend (allow negative so loss months are visible)
  const currMonthProfit = currMonthColl - currMonthExp;
  const prevMonthProfit = prevMonthColl - prevMonthExp;
  const profitTrendAbs  = prevMonthProfit > 0
    ? Math.abs(((currMonthProfit - prevMonthProfit) / prevMonthProfit) * 100).toFixed(1)
    : currMonthProfit > 0 ? "100.0" : null;
  const profitTrendUp   = currMonthProfit >= prevMonthProfit;

  // ── Monthly chart data (relative to selected month/year) ────────────────
  const currentYear  = selDate.getFullYear();
  const currentMonth = selDate.getMonth();
  const chartMonths  = MONTHS.slice(0, currentMonth + 1);
  const monthlyData  = chartMonths.map((month) => {
    const e = (expStats?.trendData || []).find((t) => {
      const [m, y] = t.month.split(" ");
      return m === month && Number(y) === currentYear;
    });
    const c = (dashboardStats?.monthlyTrend || []).find(
      (t) => t.label === month && Number(t.year) === currentYear
    );
    return { month, expenses: e?.amount || 0, collections: c?.collected || 0 };
  });
  const profitData = monthlyData.map((m) => ({ month: m.month, profit: m.collections - m.expenses }));

  // ── Sparkline data ──────────────────────────────────────────────────────
  const spark    = (expStats?.trendData || []).map((t) => ({ v: t.amount }));
  const sp       = spark.length > 0 ? spark : Array.from({ length: 8 }, () => ({ v: 0 }));
  const collSpark = (dashboardStats?.monthlyTrend || []).map((t) => ({ v: t.collected }));
  const csp       = collSpark.length > 0 ? collSpark : Array.from({ length: 8 }, () => ({ v: 0 }));

  // ── Growth Overview — profit-based, monthly or yearly mode ────────────────
  const smlyRaw   = dashboardStats?.sameMonthLastYearProfitChangePercent;
  const yearlyRaw = dashboardStats?.yearlyProfitChangePercent;
  const activeRaw = growthMode === "monthly" ? smlyRaw : yearlyRaw;
  const growthPct = activeRaw !== null && activeRaw !== undefined ? String(Math.abs(activeRaw)) : null;
  const growthUp  = activeRaw !== null && activeRaw !== undefined && activeRaw >= 0;
  const prevYearLabel = selDate.toLocaleDateString("en-US", { month: "short" }) + " " + (selMonthYear - 1);
  const growthSubtitle = growthPct === null
    ? "No prior year data"
    : growthMode === "monthly"
      ? `vs ${prevYearLabel}`
      : `vs full year ${selMonthYear - 1}`;
  const yearlyBars = (dashboardStats?.yearlyBreakup || []).map((y) => ({ v: y.collected }));

  // ── Meetings — only show meetings on the selected date ─────────────────
  const schedItems = (meetings || [])
    .filter((m) => new Date(m.startTime).toDateString() === selKey)
    .slice(0, 4);

  // ── Attendance ──────────────────────────────────────────────────────────
  const attPresent = attDashboard?.presentToday   ?? 0;
  const attAbsent  = attDashboard?.absentToday    ?? 0;
  const attOnLeave = attDashboard?.onLeave        ?? 0;
  const attPending = attDashboard?.pendingRequests ?? 0;
  const attRate    = attDashboard?.attendanceRate  ?? 0;
  const attTotal   = attDashboard?.totalEmployees  ?? 0;
  const donutData  = attTotal > 0
    ? [
        { name: "Present",  value: attPresent  || 0.001, fill: "#22c55e" },
        { name: "Absent",   value: attAbsent   || 0.001, fill: "#ef4444" },
        { name: "On Leave", value: attOnLeave  || 0.001, fill: "#f97316" },
      ]
    : [{ name: "–", value: 1, fill: "#e2e8f0" }];

  // ── Recent users — exclude admins, newest first ─────────────────────────
  const IMG_BASE = (import.meta.env.VITE_API_BASE_URL || "https://crm.cybertricksmedia.in/api").replace(/\/api$/, "");
  const recentUsers = [...users]
    .filter((u) => u.role !== "admin" && u.role !== "tenant_admin")
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 6);

  const yFmt      = (v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}K` : `₹${v}`;
  const dateStr   = selDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const firstName = authUser?.name?.split(" ")[0] || "Admin";

  const cardS   = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: "0 1px 3px rgba(0,0,0,.04)" };
  const titleS  = { fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 14, color: T.textPrimary };
  const pillS   = { display: "flex", alignItems: "center", gap: 5, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, padding: "4px 10px", fontSize: 11.5, color: T.textSecondary, fontWeight: 500 };

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── 1. Welcome ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 20, color: T.textPrimary, lineHeight: 1.2 }}>
            Welcome back, {firstName}! 👋
          </h1>
          <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>Here's an overview of your organization's performance.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            onClick={() => dateInputRef.current?.showPicker?.()}
            style={{ display: "flex", alignItems: "center", gap: 7, ...cardS, padding: "7px 12px", cursor: "pointer", userSelect: "none", position: "relative" }}
          >
            <CalendarDays size={13} color={T.textMuted} strokeWidth={2} />
            <span style={{ fontSize: 12.5, color: T.textSecondary, fontWeight: 500 }}>{dateStr}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && handleDateChange(e.target.value)}
              style={{ position: "absolute", inset: 0, opacity: 0, pointerEvents: "none", width: "100%", height: "100%", border: "none" }}
            />
          </div>
         
        </div>
      </div>

      {/* ── 2. KPI Cards — icon LEFT, sparkline at bottom ──────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <KpiCard title="Total Collections" value={INR(totalCollections)}
                 trend={collTrendAbs ? `${collTrendAbs}%` : null} trendUp={collTrendUp}
                 subtitle={collTrendAbs ? "vs last month" : "No prior month data"}
                 Icon={Wallet} iconColor="#fff" iconBg="#8b5cf6">
          <SparkLine data={csp.slice(-10)} color="#8b5cf6" id="sk1" />
        </KpiCard>

        <KpiCard title="Total Expenses" value={INR(totalExpenses)}
                 trend={expTrendAbs ? `${expTrendAbs}%` : null} trendUp={expTrendUp} lowerIsBetter
                 subtitle={expTrendAbs ? "vs last month" : "No prior month data"}
                 Icon={CreditCard} iconColor="#fff" iconBg="#22c55e">
          <SparkLine data={sp.slice(-10)} color="#22c55e" id="sk2" />
        </KpiCard>

        <KpiCard title="Total Profit" value={INR(totalProfit)}
                 valueColor={totalProfit < 0 ? "#dc2626" : undefined}
                 trend={profitTrendAbs ? `${profitTrendAbs}%` : null} trendUp={profitTrendUp}
                 subtitle={profitTrendAbs ? "vs last month" : "No prior month data"}
                 Icon={TrendingUp} iconColor="#fff" iconBg="#f97316">
          <SparkLine data={profitData.slice(-10).map((m) => ({ v: m.profit }))} color="#f97316" id="sk3" />
        </KpiCard>

        <KpiCard title="Growth Overview"
                 value={growthPct !== null ? `${growthUp ? "+" : "-"}${growthPct}%` : "N/A"}
                 valueColor={growthPct !== null ? (growthUp ? "#16a34a" : "#dc2626") : "#94a3b8"}
                 subtitle={growthSubtitle}
                 Icon={BarChart3} iconColor="#fff" iconBg="#3b82f6"
                 headerExtra={
                   <select
                     value={growthMode}
                     onChange={(e) => setGrowthMode(e.target.value)}
                     style={{
                       fontSize: 11, fontWeight: 600, padding: "3px 6px",
                       border: "1px solid #e2e8f0", borderRadius: 6,
                       background: "#f8fafc", color: "#475569", cursor: "pointer",
                       outline: "none", fontFamily: "inherit",
                     }}
                   >
                     <option value="monthly">Monthly</option>
                     <option value="yearly">Yearly</option>
                   </select>
                 }>
          {growthMode === "yearly" ? (
            <div style={{ display: "flex", gap: 8, height: 44 }}>
              <div style={{ flex: 1, background: "#f8fafc", borderRadius: 8, padding: "4px 10px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>{selMonthYear - 1} Profit</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", fontFamily: "'Poppins', sans-serif" }}>
                  {INR(dashboardStats?.prevYearProfit ?? 0)}
                </div>
              </div>
              <div style={{ flex: 1, background: "#eff6ff", borderRadius: 8, padding: "4px 10px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>{selMonthYear} Profit</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6", fontFamily: "'Poppins', sans-serif" }}>
                  {INR(dashboardStats?.thisYearProfit ?? 0)}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, height: 44 }}>
              <div style={{ flex: 1, background: "#f8fafc", borderRadius: 8, padding: "4px 10px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>{prevYearLabel} Profit</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", fontFamily: "'Poppins', sans-serif" }}>
                  {INR(dashboardStats?.prevYearMonthProfit ?? 0)}
                </div>
              </div>
              <div style={{ flex: 1, background: "#eff6ff", borderRadius: 8, padding: "4px 10px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>
                  {selDate.toLocaleDateString("en-US", { month: "short" })} {selMonthYear} Profit
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6", fontFamily: "'Poppins', sans-serif" }}>
                  {INR(dashboardStats?.thisMonthProfit ?? 0)}
                </div>
              </div>
            </div>
          )}
        </KpiCard>
      </div>

      {/* ── 3. Charts — 3 columns ──────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr 0.9fr", gap: 14, alignItems: "stretch" }}>

        {/* Collections vs Expenses */}
        <div style={{ ...cardS, padding: "16px 18px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={titleS}>Collections vs Expenses</div>
           {/*  <div style={pillS}>
              This Year
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </div> */}
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyData} barSize={13} barGap={3} margin={{ top: 4, right: 0, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: T.textMuted, fontSize: 11 }} />
              <YAxis tickFormatter={yFmt} axisLine={false} tickLine={false} tick={{ fill: T.textMuted, fontSize: 10 }} width={44} />
              <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(0,0,0,.025)" }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11.5, paddingBottom: 2 }} verticalAlign="top" />
              <Bar dataKey="collections" name="Collections" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses"    name="Expenses"    fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", borderTop: `1px solid ${T.borderLight}`, marginTop: 10, paddingTop: 10 }}>
            {[
              { label: "Total Collections", val: INR(totalCollections), Icon: Wallet,    c: "#8b5cf6" },
              { label: "Total Expenses",    val: INR(totalExpenses),    Icon: CreditCard, c: "#22c55e" },
              { label: "Net Profit",        val: INR(totalProfit),      Icon: TrendingUp, c: "#f97316" },
            ].map(({ label, val, Icon: I, c }, i) => (
              <div key={label} style={{ flex: 1, textAlign: "center", padding: "0 6px", borderRight: i < 2 ? `1px solid ${T.borderLight}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 3 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, background: `${c}18`, display: "grid", placeItems: "center" }}>
                    <I size={10} color={c} strokeWidth={2} />
                  </div>
                  <span style={{ fontSize: 10.5, color: T.textMuted }}>{label}</span>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary, fontFamily: "'Poppins', sans-serif" }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Profit Trend */}
        <div style={{ ...cardS, padding: "16px 18px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
            <div style={titleS}>Profit Trend</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                color:      growthPct === null ? "#64748b" : (growthUp ? "#16a34a" : "#dc2626"),
                background: growthPct === null ? "#f8fafc"  : (growthUp ? "#f0fdf4" : "#fef2f2"),
                border: `1px solid ${growthPct === null ? "#e2e8f0" : (growthUp ? "#bbf7d0" : "#fecaca")}`,
              }}>
                {growthPct === null
                  ? "No prior year data"
                  : `${growthUp ? "↑" : "↓"} ${Math.abs(Number(growthPct)).toFixed(1)}% ${growthSubtitle}`}
              </span>
           {/*    <div style={pillS}>
                This Year
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </div> */}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={profitData} margin={{ top: 4, right: 0, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: T.textMuted, fontSize: 11 }} />
              <YAxis tickFormatter={yFmt} axisLine={false} tickLine={false} tick={{ fill: T.textMuted, fontSize: 10 }} width={44} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="profit" name="Profit" stroke="#22c55e" strokeWidth={2.5}
                    fill="url(#profitGrad)" dot={false} activeDot={{ r: 3, fill: "#22c55e" }} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", borderTop: `1px solid ${T.borderLight}`, marginTop: 10, paddingTop: 10 }}>
            <div style={{ flex: 1, padding: "0 6px" }}>
              <div style={{ fontSize: 10.5, color: T.textMuted, marginBottom: 2 }}>This Month Profit</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, fontFamily: "'Poppins', sans-serif" }}>{INR(currMonthProfit)}</div>
            </div>
            <div style={{ flex: 1, padding: "0 6px", borderLeft: `1px solid ${T.borderLight}` }}>
              <div style={{ fontSize: 10.5, color: T.textMuted, marginBottom: 2 }}>vs Last Month</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: profitTrendUp ? "#16a34a" : "#dc2626", fontFamily: "'Poppins', sans-serif" }}>
                {profitTrendAbs ? `${profitTrendUp ? "↑" : "↓"} ${profitTrendAbs}%` : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Today's Schedule */}
        <div style={{ ...cardS, padding: "16px 16px 14px", display: "flex", flexDirection: "column" }}>
          <div style={{ ...titleS, marginBottom: 14, flexShrink: 0 }}>Today's Schedule</div>
          {schedItems.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: T.textMuted, fontSize: 12.5 }}>
              <Calendar size={26} strokeWidth={1.2} style={{ opacity: .28, display: "block", marginBottom: 8 }} />
              No meetings today
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0, paddingRight: 2 }}>
              {schedItems.map((mtg, i) => {
                const isReview = mtg.title?.toLowerCase().includes("review");
                const bc       = isReview ? "#f97316" : "#3b82f6";
                const bb       = isReview ? "#fff7ed" : "#eff6ff";
                const timeStr  = new Date(mtg.startTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={mtg._id || i} style={{ display: "flex", gap: 10, paddingBottom: i < schedItems.length - 1 ? 12 : 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: 9, height: 9, borderRadius: "50%", background: bc, flexShrink: 0, marginTop: 3 }} />
                      {i < schedItems.length - 1 && <div style={{ width: 1.5, flex: 1, minHeight: 18, background: T.borderLight, marginTop: 3 }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10.5, color: T.textMuted }}>{timeStr}</div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: T.textPrimary, marginTop: 1 }}>{mtg.title}</div>
                      <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1, marginBottom: 4 }}>{mtg.agenda || "Scheduled meeting"}</div>
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: bc, background: bb, padding: "2px 8px", borderRadius: 20 }}>
                        {isReview ? "Review" : "Meeting"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button onClick={() => setTab("meetings")} style={{ marginTop: 14, flexShrink: 0, display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "#3b82f6", fontWeight: 600, fontSize: 12.5, fontFamily: "inherit", padding: 0 }}>
            <Calendar size={13} strokeWidth={2} /> View Calendar
          </button>
        </div>
      </div>

      {/* ── 4. Bottom row — all cards equal height via align-items:stretch ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, alignItems: "stretch" }}>

        {/* Attendance Today */}
        <div className="flex flex-col" style={{ ...cardS, padding: "14px 16px" }}>
          {/* header */}
          <div className="flex items-center justify-between mb-3">
            <div style={titleS}>Attendance Today</div>
            <button onClick={() => setTab("attendance")}
              className="text-xs font-medium text-slate-400 bg-transparent border-0 cursor-pointer p-0"
              style={{ fontFamily: "'Poppins', sans-serif" }}>
              View All
            </button>
          </div>
          {/* donut + metrics — centered in card, gap-10 between chart and list */}
          <div className="flex flex-1 items-center justify-center gap-10">
            {/* Donut */}
            <div className="relative shrink-0" style={{ width: 100, height: 100 }}>
              <ResponsiveContainer width={100} height={100}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={32} outerRadius={46}
                       dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}>
                    {donutData.map((d, i) => <Cell key={i} fill={d.fill} strokeWidth={0} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-bold leading-none" style={{ color: T.textPrimary, fontFamily: "'Poppins', sans-serif" }}>{attRate.toFixed(0)}%</span>
                <span className="text-[9px] font-medium mt-0.5" style={{ color: T.textMuted }}>Present Rate</span>
              </div>
            </div>
            {/* Metrics — gap-4 between each row */}
            <div className="flex flex-col gap-4">
              {[
                { label: "Present",          value: attPresent, color: "#22c55e", Ic: CheckCircle2 },
                { label: "Absent",           value: attAbsent,  color: "#ef4444", Ic: XCircle      },
                { label: "On Leave",         value: attOnLeave, color: "#f97316", Ic: Clock        },
                { label: "Pending Requests", value: attPending, color: "#3b82f6", Ic: Bell         },
              ].map(({ label, value, color, Ic }) => (
                <div key={label} className="flex items-center gap-2">
                  <Ic size={15} color={color} strokeWidth={2} className="shrink-0" />
                  <span className="text-[13px] font-bold w-3.5" style={{ color: T.textPrimary }}>{value}</span>
                  <span className="text-[11.5px]" style={{ color: T.textSecondary, fontFamily: "'Poppins', sans-serif" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Users */}
        <div className="flex flex-col" style={{ ...cardS, padding: "14px 16px" }}>
          {/* header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={titleS}>Recent Users</div>
            <button onClick={() => setTab("users")}
              className="text-xs font-medium text-slate-400 bg-transparent border-0 cursor-pointer p-0"
              style={{ fontFamily: "'Poppins', sans-serif" }}>
              View All
            </button>
          </div>
          {/* user list — gap-3 between rows, scrollable when > 3 users */}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-0.5">
            {recentUsers.length === 0 ? (
              <div className="text-center py-5" style={{ color: T.textMuted, fontSize: 12.5 }}>
                <Users size={22} strokeWidth={1.2} className="opacity-30 mx-auto mb-1.5" />No users yet
              </div>
            ) : recentUsers.map((u) => {
              const initials = (u.name || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
              const rb = ROLE_BADGE[u.role] || ROLE_BADGE.user;
              const imgSrc = u.profileImage ? `${IMG_BASE}${u.profileImage}` : null;
              const joinDate = u.createdAt
                ? new Date(u.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                : "—";
              return (
                <div key={u._id} className="flex items-center gap-2.5 shrink-0">
                  {/* avatar */}
                  <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden grid place-items-center"
                       style={{ background: `${rb.color}20` }}>
                    {imgSrc
                      ? <img src={imgSrc} alt={u.name} className="w-full h-full object-cover rounded-full"
                             onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.parentNode.querySelector("span").style.display = "block"; }} />
                      : null}
                    <span className="text-[13px] font-bold" style={{ color: rb.color, fontFamily: "'Poppins', sans-serif", display: imgSrc ? "none" : "block" }}>{initials}</span>
                  </div>
                  {/* name + email */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold truncate max-w-[100px]"
                            style={{ color: T.textPrimary, fontFamily: "'Poppins', sans-serif" }}>{u.name}</span>
                      <span className="text-[10px] font-semibold shrink-0 px-1.5 py-0.5 rounded-full"
                            style={{ color: rb.color, background: rb.bg, fontFamily: "'Poppins', sans-serif" }}>{rb.label}</span>
                    </div>
                    <div className="text-[11px] truncate" style={{ color: T.textMuted, fontFamily: "'Poppins', sans-serif" }}>{u.email}</div>
                  </div>
                  {/* joined date */}
                  <div className="shrink-0 text-[11px] whitespace-nowrap" style={{ color: T.textMuted, fontFamily: "'Poppins', sans-serif" }}>
                    Joined {joinDate}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions — 2-col grid so text fits on one line */}
        <div style={{ ...cardS, padding: "14px 16px" }}>
          <div style={{ ...titleS, marginBottom: 10 }}>Quick Actions</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "New Task",     Icon: ListTodo,  color: "#8b5cf6", bg: "#f5f3ff", iconBg: "#ede9fe", tab: "createTask"     },
              { label: "New Project",  Icon: Briefcase, color: "#3b82f6", bg: "#eff6ff", iconBg: "#dbeafe", tab: "createProject"  },
              { label: "New User",     Icon: UserPlus,  color: "#22c55e", bg: "#f0fdf4", iconBg: "#dcfce7", tab: "createUser"     },
              { label: "New Meeting",  Icon: Calendar,  color: "#ef4444", bg: "#fef2f2", iconBg: "#fee2e2", tab: "meetings"       },
              { label: "View Reports", Icon: BarChart3, color: "#f97316", bg: "#fff7ed", iconBg: "#ffedd5", tab: "expenseReports" },
              { label: "Import Data",  Icon: Download,  color: "#14b8a6", bg: "#f0fdfa", iconBg: "#ccfbf1", tab: null             },
            ].map(({ label, Icon: Ic, color, bg, iconBg, tab }) => (
              <button
                key={label}
                onClick={() => tab && setTab(tab)}
                style={{
                  display: "flex", alignItems: "center", gap: 9,
                  padding: "10px 12px", border: "none", borderRadius: 10,
                  background: bg, cursor: tab ? "pointer" : "default",
                  fontFamily: "'Poppins', sans-serif", textAlign: "left", width: "100%",
                }}
              >
                <div style={{ width: 30, height: 30, borderRadius: 8, background: iconBg, display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <Ic size={14} color={color} strokeWidth={2} />
                </div>
                <span style={{ fontSize: 12, color, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 5. Banner ────────────────────────────────────────────────────── */}
      <div style={{ background: "#1e1b4b", borderRadius: 14, padding: "14px 22px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(139,92,246,.28)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Star size={20} color="#a5b4fc" strokeWidth={0} fill="#a5b4fc" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Great going! 🎉</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
            You have {inProg} task{inProg === 1 ? "" : "s"} in progress and {pendingApprovals} pending approval{pendingApprovals === 1 ? "" : "s"}.
          </div>
        </div>
        <button
          onClick={() => setTab("tasks")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", border: "1.5px solid rgba(255,255,255,.25)", borderRadius: 9, background: "transparent", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
        >
          View My Tasks →
        </button>
      </div>

    </div>
  );
}
