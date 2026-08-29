import React, { useEffect, useState } from "react";
import {
  Menu, Plus, Users, FileText, Bell, User,
  Package, CheckCircle2, Hourglass, PieChart as PieChartIcon,
  IndianRupee, Wallet, AlertTriangle, CalendarCheck, ArrowRight, Inbox, TrendingUp,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import DateRangePicker, { computeRangeForPreset } from "../../components/DateRangePicker";
import { useAuth } from "../../context/AuthContext";
import useTenantTheme from "../../hooks/useTenantTheme";

const PURPLE = { color: "var(--tenant-brand)", bg: "var(--tenant-brand-light)" };
const GREEN = { color: "#16a34a", bg: "#dcfce7" };
const ORANGE = { color: "#f59e0b", bg: "#fef3c7" };
const BLUE = { color: "#2563eb", bg: "#dbeafe" };
const RED = { color: "#dc2626", bg: "#fee2e2" };

const STORAGE_KEY = "crm_dashboard_date_range";

function loadStoredRange() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const start = new Date(parsed.start);
      const end = new Date(parsed.end);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        return { start, end, presetKey: parsed.presetKey || "custom" };
      }
    }
  } catch { /* fall through to default */ }
  return { ...computeRangeForPreset("thisMonth"), presetKey: "thisMonth" };
}

function Skeleton({ height = 16, width = "100%", radius = 6, style = {} }) {
  return <div style={{ height, width, borderRadius: radius, background: "linear-gradient(90deg,#eef0f4 25%,#f6f7fa 37%,#eef0f4 63%)", backgroundSize: "400% 100%", animation: "shimmer 1.4s ease infinite", ...style }} />;
}

function StatCard({ Icon, accent, label, value, caption, pillText, pillAccent, loading }) {
  const { T } = useTenantTheme();
  return (
    <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16, padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: accent.bg, display: "grid", placeItems: "center" }}>
          <Icon size={19} color={accent.color} strokeWidth={2} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, color: T.textSecondary, fontWeight: 500 }}>{label}</div>
          {loading ? <Skeleton height={22} width={60} style={{ marginTop: 4 }} /> : (
            <div style={{ fontSize: 22, fontWeight: 700, color: T.textPrimary, fontFamily: "'Inter', sans-serif", marginTop: 2 }}>{value}</div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: `1px solid ${T.borderLight}` }}>
        <span style={{ fontSize: 12, color: T.textMuted }}>{caption}</span>
        {loading ? <Skeleton height={18} width={50} radius={99} /> : (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, color: pillAccent.color, background: pillAccent.bg }}>{pillText}</span>
        )}
      </div>
    </div>
  );
}

function MiniTile({ Icon, accent, value, label, loading }) {
  const { T } = useTenantTheme();
  return (
    <div style={{ background: accent.bg, borderRadius: 14, padding: "18px 16px", textAlign: "center" }}>
      <Icon size={22} color={accent.color} strokeWidth={2} style={{ margin: "0 auto 12px", display: "block" }} />
      {loading ? <Skeleton height={22} width="60%" style={{ margin: "0 auto" }} /> : (
        <div style={{ fontSize: 22, fontWeight: 700, color: T.textPrimary, fontFamily: "'Inter', sans-serif" }}>{value}</div>
      )}
      <div style={{ fontSize: 12.5, color: T.textSecondary, marginTop: 5 }}>{label}</div>
    </div>
  );
}

function SectionCard({ Icon, accent, title, subtitle, children, footer }) {
  const { T } = useTenantTheme();
  return (
    <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, boxShadow: "0 1px 3px rgba(0,0,0,.04)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
        {Icon && (
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: accent.bg, display: "grid", placeItems: "center" }}>
            <Icon size={16} color={accent.color} strokeWidth={2} />
          </div>
        )}
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ flex: 1 }}>{children}</div>
      {footer && (
        <a href="/clients" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.borderLight}`, fontSize: 12.5, fontWeight: 600, color: T.brand, textDecoration: "none" }}>
          {footer} <ArrowRight size={14} strokeWidth={2} />
        </a>
      )}
    </div>
  );
}

function EmptyState({ message }) {
  const { T } = useTenantTheme();
  return (
    <div style={{ textAlign: "center", padding: "36px 20px", color: T.textMuted, fontSize: 13, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <Inbox size={28} strokeWidth={1.6} color={T.textMuted} />
      {message}
    </div>
  );
}

export default function ClientsSection({ clients = [], proposals = [], dashboardStats, fetchDashboardStats }) {
  const { T } = useTenantTheme();
  const stats = dashboardStats || {};
  const { user } = useAuth();
  const userName = user?.name || "Admin";

  const [range, setRange] = useState(loadStoredRange);
  const [loadingStats, setLoadingStats] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);
  const [filterClientId, setFilterClientId] = useState("");
  const [filterProposalId, setFilterProposalId] = useState("");

  useEffect(() => {
    setLoadingStats(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ start: range.start, end: range.end, presetKey: range.presetKey }));
    Promise.resolve(fetchDashboardStats?.({ start: range.start.toISOString(), end: range.end.toISOString() })).then(() => {
      setLoadingStats(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.end]);

  const hasData = stats.hasData;
  const totalProposals = stats.totalProposals || 0;
  // "Total Clients" / "Converted Clients" are headline counts of the current state
  // of the whole client base — they should match the real /clients page regardless
  // of the selected date range, not just clients *created* within that window
  // (which is what the date-scoped dashboard-stats endpoint returns). Proposals/
  // Reminders/Payments below are intentionally still scoped to the selected range.
  const totalClientsCount = clients.length;
  const convertedClientsCount = clients.filter((c) => c.status === "converted").length;
  const convertedClientsPercent = totalClientsCount
    ? Math.round((convertedClientsCount / totalClientsCount) * 100)
    : 0;

  const fmtINR = (v) => `₹${(v || 0).toLocaleString("en-IN")}`;
  const fmtRange = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const monthlyTrend = stats.monthlyTrend || [];
  const dailyTrend = stats.dailyTrend || [];

  const clientProposalOptions = filterClientId
    ? proposals.filter((p) => String(p.clientId?._id || p.clientId) === filterClientId)
    : [];

  const deliverableView = (() => {
    let items = null;
    if (filterProposalId) {
      const proposal = proposals.find((p) => p._id === filterProposalId);
      items = proposal?.deliverables || [];
    } else if (filterClientId) {
      items = clientProposalOptions.flatMap((p) => p.deliverables || []);
    }
    if (items === null) {
      return {
        total: stats.totalDeliverables || 0,
        completed: stats.completedDeliverables || 0,
        pending: stats.pendingDeliverables || 0,
        percent: stats.overallCompletionPercent || 0,
      };
    }
    const total = items.length;
    const completed = items.filter((d) => d.status === "Completed").length;
    const totalDue = items.reduce((sum, d) => sum + (d.due || d.quantity || 0), 0);
    const totalDelivered = items.reduce((sum, d) => sum + (d.delivered || 0), 0);
    return {
      total,
      completed,
      pending: total - completed,
      percent: totalDue > 0 ? Math.round((totalDelivered / totalDue) * 100) : 0,
    };
  })();

  return (
    <div className="fade-up">
      <style>{`@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }`}</style>

      {/* ── Welcome header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          
          <div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: T.textPrimary }}>Welcome back, {userName}! 👋</h2>
            <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>Here's what's happening with your business today.</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <DateRangePicker value={range} onChange={setRange} />
          <a href="/clients" style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", background: "#f18b37", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            <Plus size={15} strokeWidth={2.5} /> Clients Overview
          </a>
        </div>
      </div>

      {!loadingStats && hasData === false && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.brandLight, border: `1px solid ${T.brandMid}`, borderRadius: 12, padding: "12px 16px", marginBottom: 18, fontSize: 13, color: "#92400e", fontWeight: 600 }}>
          <Inbox size={16} strokeWidth={2} /> No data available for the selected period — try a different date range.
        </div>
      )}

      {/* ── Top KPI row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 18 }}>
        <StatCard loading={loadingStats} Icon={Users} accent={PURPLE} label="Total Clients" value={totalClientsCount} caption="Converted clients" pillText={`${convertedClientsCount} Converted`} pillAccent={GREEN} />
        <StatCard loading={loadingStats} Icon={FileText} accent={GREEN} label="Proposals" value={totalProposals} caption="Total proposals" pillText={`${totalProposals} Total`} pillAccent={BLUE} />
        <StatCard loading={loadingStats} Icon={Bell} accent={ORANGE} label="Reminders" value={stats.totalReminders || 0} caption="Pending reminders" pillText={`${stats.pendingReminders || 0} Pending`} pillAccent={ORANGE} />
        <StatCard loading={loadingStats} Icon={User} accent={PURPLE} label="Converted Clients" value={convertedClientsCount} caption="Leads converted" pillText={`${convertedClientsPercent}%`} pillAccent={GREEN} />
      </div>

      {/* ── Deliverables / Payments ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 18, marginBottom: 18 }}>
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary }}>Scope of Work / Deliverables</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select
                value={filterClientId}
                onChange={(e) => { setFilterClientId(e.target.value); setFilterProposalId(""); }}
                style={{ padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${T.inputBorder}`, fontSize: 12.5, background: "#fff", color: T.textPrimary, fontFamily: "inherit", cursor: "pointer" }}
              >
                <option value="">All Clients</option>
                {clients.map((c) => <option key={c._id} value={c._id}>{c.clientName}</option>)}
              </select>
              <select
                value={filterProposalId}
                onChange={(e) => setFilterProposalId(e.target.value)}
                disabled={!filterClientId}
                style={{ padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${T.inputBorder}`, fontSize: 12.5, background: filterClientId ? "#fff" : "#f8f9fc", color: filterClientId ? T.textPrimary : T.textMuted, fontFamily: "inherit", cursor: filterClientId ? "pointer" : "not-allowed" }}
              >
                <option value="">All Proposals</option>
                {clientProposalOptions.map((p) => <option key={p._id} value={p._id}>{p.projectName}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <MiniTile loading={loadingStats} Icon={Package} accent={PURPLE} value={deliverableView.total} label="Total work" />
            <MiniTile loading={loadingStats} Icon={CheckCircle2} accent={GREEN} value={deliverableView.completed} label="Completed" />
            <MiniTile loading={loadingStats} Icon={Hourglass} accent={ORANGE} value={deliverableView.pending} label="Pending" />
            <MiniTile loading={loadingStats} Icon={PieChartIcon} accent={BLUE} value={`${deliverableView.percent}%`} label="Completion" />
          </div>
        </div>

        <SectionCard title="Payments Overview" >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <MiniTile loading={loadingStats} Icon={IndianRupee} accent={GREEN} value={fmtINR(stats.totalRevenue)} label="Revenue" />
            <MiniTile loading={loadingStats} Icon={Wallet} accent={RED} value={fmtINR(stats.outstandingPayments)} label="Outstanding" />
            <MiniTile loading={loadingStats} Icon={AlertTriangle} accent={RED} value={stats.overduePayments || 0} label="Overdue" />
{/*             <MiniTile loading={loadingStats} Icon={CalendarCheck} accent={ORANGE} value={fmtINR(stats.collectedThisMonth)} label="Collected (payments dated in range)" />
 */}          </div>
        </SectionCard>
      </div>

      {/* ── Revenue charts ── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(360px, 2fr) minmax(300px, 1fr)", gap: 18 }}>
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, boxShadow: "0 1px 3px rgba(0,0,0,.04)", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary }}>Outstanding Overview</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>Collected vs outstanding — last 8 months · click a bar for that month</div>
            </div>
            <div style={{ textAlign: "right" }}>
              {loadingStats ? <Skeleton height={26} width={120} /> : selectedMonth ? (
                <>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary, marginBottom: 4 }}>
                    {selectedMonth.label} {selectedMonth.year}
                    <button onClick={() => setSelectedMonth(null)} style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer", color: T.brand, fontSize: 11, fontWeight: 700, padding: 0 }}>Clear</button>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.brand, fontFamily: "'Inter', sans-serif" }}>{fmtINR(selectedMonth.collected)}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Collected</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary, fontFamily: "'Inter', sans-serif" }}>{fmtINR(selectedMonth.outstanding)}</div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>Outstanding</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.brand, fontFamily: "'Inter', sans-serif" }}>{fmtINR(stats.trendTotalCollected)}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Collected (8 mo)</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary, fontFamily: "'Inter', sans-serif" }}>{fmtINR(stats.trendTotalOutstanding)}</div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>Outstanding (8 mo)</div>
                </>
              )}
            </div>
          </div>

          {loadingStats ? <Skeleton height={220} radius={12} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyTrend} barGap={4}>
                <CartesianGrid vertical={false} stroke={T.borderLight} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: T.textMuted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: T.textMuted }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => (v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`)} />
                <Tooltip formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} contentStyle={{ borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 12 }} />
                <Bar dataKey="collected" name="Collected" fill={T.brand} radius={[5, 5, 0, 0]} barSize={14} cursor="pointer" onClick={(_, index) => setSelectedMonth(monthlyTrend[index])} />
                <Bar dataKey="outstanding" name="Outstanding" fill="#fde68a" radius={[5, 5, 0, 0]} barSize={14} cursor="pointer" onClick={(_, index) => setSelectedMonth(monthlyTrend[index])} />
              </BarChart>
            </ResponsiveContainer>
          )}

          <div style={{ display: "flex", gap: 18, marginTop: 6, fontSize: 12, color: T.textSecondary }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: T.brand, display: "inline-block" }} /> Collected</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#fde68a", display: "inline-block" }} /> Outstanding (new proposals)</span>
          </div>

       {/*    <a href="/clients" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.borderLight}`, fontSize: 12.5, fontWeight: 600, color: T.brand, textDecoration: "none" }}>
            View Full Report <ArrowRight size={14} strokeWidth={2} />
          </a> */}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <SectionCard Icon={CalendarCheck} accent={ORANGE} title="Collections" subtitle="Payments dated in selected range">
            {loadingStats ? (
              <Skeleton height={70} radius={12} />
            ) : (
              <>
                <div style={{ fontSize: 32, fontWeight: 700, color: T.textPrimary, fontFamily: "'Inter', sans-serif" }}>{fmtINR(stats.collectedThisMonth)}</div>
                <div style={{ fontSize: 12, color: T.textMuted, marginTop: 8 }}>{fmtRange(range.start)} – {fmtRange(range.end)}</div>
              </>
            )}
          </SectionCard>

          <SectionCard Icon={TrendingUp} accent={GREEN} title="Daily Collections" subtitle="Last 7 days · click a bar for that day">
            {loadingStats ? (
              <Skeleton height={110} radius={12} />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={110}>
                  <BarChart data={dailyTrend} barGap={2}>
                    <Tooltip formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} contentStyle={{ borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 12 }} />
                    <XAxis dataKey="label" tick={{ fontSize: 9.5, fill: T.textMuted }} axisLine={false} tickLine={false} />
                    <Bar dataKey="collected" name="Collected" radius={[4, 4, 0, 0]} barSize={16} cursor="pointer" onClick={(_, index) => setSelectedDayIndex(index)}>
                      {dailyTrend.map((entry, i) => {
                        const isActive = i === (selectedDayIndex ?? dailyTrend.length - 1);
                        return <Cell key={i} fill={isActive ? T.brand : "#fde68a"} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ marginTop: 10, paddingTop: 12, borderTop: `1px solid ${T.borderLight}` }}>
                  {(() => {
                    const activeIndex = selectedDayIndex ?? dailyTrend.length - 1;
                    const activeDay = dailyTrend[activeIndex];
                    const isToday = activeIndex === dailyTrend.length - 1;
                    return (
                      <>
                        <div style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary, fontFamily: "'Inter', sans-serif" }}>{fmtINR(activeDay?.collected)}</div>
                        <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>
                          {isToday ? "Collected today" : `Collected on ${activeDay?.label}`}
                          {!isToday && (
                            <button onClick={() => setSelectedDayIndex(null)} style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer", color: T.brand, fontSize: 11, fontWeight: 700, padding: 0 }}>Back to today</button>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
