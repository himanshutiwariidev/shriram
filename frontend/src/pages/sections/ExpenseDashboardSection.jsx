import React, { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, Clock, CheckCircle2,
  AlertCircle, IndianRupee, Receipt, Wallet,
} from "lucide-react";
import useTenantTheme from "../../hooks/useTenantTheme";
import API from "../../services/api";

const fmt = (n) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)}Cr`
  : n >= 1e5 ? `₹${(n / 1e5).toFixed(2)}L`
  : n >= 1e3 ? `₹${(n / 1e3).toFixed(1)}K`
  : `₹${Number(n || 0).toLocaleString("en-IN")}`;

const STATUS_COLOR = {
  draft:     "#94a3b8",
  submitted: "#f59e0b",
  pending:   "#f97316",
  approved:  "#22c55e",
  rejected:  "#ef4444",
  paid:      "#10b981",
};

function StatCard({ icon: Icon, label, value, sub, color, onClick }) {
  const { T } = useTenantTheme();
  return (
    <div
      className="card card-in"
      onClick={onClick}
      style={{
        background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 16,
        padding: "22px 20px", display: "flex", flexDirection: "column", gap: 10,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}18`, display: "grid", placeItems: "center" }}>
          <Icon size={20} color={color} strokeWidth={2} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.textPrimary, fontFamily: "'Syne', sans-serif" }}>{value}</div>
        <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11.5, color: T.textSecondary, marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function ExpenseDashboardSection({ setTab }) {
  const { T } = useTenantTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/expenses/dashboard")
      .then(({ data: d }) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="fade-up" style={{ padding: 40, textAlign: "center", color: T.textMuted }}>
      Loading finance overview…
    </div>
  );

  const t = data?.totals || {};

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: T.textPrimary }}>
          Finance Overview
        </h2>
        <p style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>
          Expense summary across all categories and periods
        </p>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
        <StatCard icon={IndianRupee} label="This Month" value={fmt(t.totalMonth)} color="#0ea5e9" onClick={() => setTab("expenses")} />
        <StatCard icon={TrendingUp}  label="This Year"  value={fmt(t.totalYear)}  color="#6366f1" />
        <StatCard icon={Clock}       label="Pending Approval" value={fmt(t.pendingAmt)} sub={`${t.pendingCount || 0} expenses`} color="#f97316" onClick={() => setTab("expenses")} />
        <StatCard icon={CheckCircle2} label="Paid"      value={fmt(t.paidAmt)}    color="#10b981" />
        <StatCard icon={Wallet}      label="Payroll"    value={fmt(t.payrollAmt)} color="#8b5cf6" />
        <StatCard icon={Receipt}     label="All Time"   value={fmt(t.totalAll)}   sub={`${t.totalCount || 0} entries`} color="#ef4444" />
      </div>

      {/* Trend chart */}
      {data?.trendData?.length > 0 && (
        <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 16, padding: "20px 24px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, marginBottom: 16 }}>Monthly Expense Trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.trendData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Amount"]} />
              <Area type="monotone" dataKey="amount" stroke="#0ea5e9" strokeWidth={2} fill="url(#expGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Category pie */}
        {data?.categoryBreakdown?.length > 0 && (
          <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 16, padding: "20px 24px" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, marginBottom: 16 }}>By Category (YTD)</div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={data.categoryBreakdown} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {data.categoryBreakdown.map((c, i) => (
                    <Cell key={i} fill={c.color || `hsl(${i * 40}, 65%, 55%)`} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Status distribution */}
        {data?.statusDist?.length > 0 && (
          <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 16, padding: "20px 24px" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, marginBottom: 16 }}>By Status</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.statusDist.map((s) => ({ name: s._id, amount: s.amount, count: s.count }))}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />
                <Bar dataKey="amount" radius={[5, 5, 0, 0]}>
                  {data.statusDist.map((s, i) => (
                    <Cell key={i} fill={STATUS_COLOR[s._id] || "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recent expenses */}
      {data?.recent?.length > 0 && (
        <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 16, padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary }}>Recent Expenses</div>
            <button onClick={() => setTab("expenses")} style={{ fontSize: 12, color: T.brand, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>View all →</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {data.recent.map((exp, i) => (
              <div
                key={exp._id}
                className="data-row"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < data.recent.length - 1 ? `1px solid ${T.borderLight}` : "none" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: `${exp.categoryId?.color || "#94a3b8"}18`, display: "grid", placeItems: "center", fontSize: 13, color: exp.categoryId?.color || "#94a3b8" }}>₹</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: T.textPrimary }}>{exp.title}</div>
                    <div style={{ fontSize: 11.5, color: T.textMuted }}>{exp.categoryId?.name || "Uncategorized"} · {new Date(exp.expenseDate).toLocaleDateString("en-IN")}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: T.textPrimary }}>₹{Number(exp.totalAmount).toLocaleString("en-IN")}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: `${STATUS_COLOR[exp.status] || "#94a3b8"}18`, color: STATUS_COLOR[exp.status] || "#94a3b8", textTransform: "capitalize" }}>{exp.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
