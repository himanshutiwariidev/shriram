import React, { useEffect, useState, useCallback } from "react";
import { IndianRupee, TrendingUp, Clock, CheckCircle2, RefreshCw } from "lucide-react";
import API from "../../services/api";

const STATUS_COLOR = {
  paid:    { color: "#16a34a", bg: "#f0fdf4", label: "Paid"    },
  created: { color: "#d97706", bg: "#fefce8", label: "Pending" },
  failed:  { color: "#dc2626", bg: "#fef2f2", label: "Failed"  },
};

const PLAN_COLOR = {
  starter:      "#6366f1",
  professional: "#0891b2",
  business:     "#f59e0b",
  enterprise:   "#7c3aed",
};

const fmt = (n) =>
  Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function SubscriptionPaymentsSection() {
  const [payments,     setPayments]     = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [filter,       setFilter]       = useState("all"); // all | paid | pending

  const fetch = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await API.get("/superadmin/payments");
      setPayments(data.payments || []);
      setTotalRevenue(data.totalRevenue || 0);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const paidCount    = payments.filter((p) => p.status === "paid").length;
  const pendingCount = payments.filter((p) => p.status === "created").length;

  const visible = filter === "all"
    ? payments
    : filter === "paid"
      ? payments.filter((p) => p.status === "paid")
      : payments.filter((p) => p.status === "created");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        {[
          { Icon: IndianRupee, label: "Total Revenue",  value: `₹${fmt(totalRevenue)}`, color: "#16a34a", bg: "#f0fdf4" },
          { Icon: CheckCircle2, label: "Paid Orders",   value: paidCount,                color: "#0891b2", bg: "#f0f9ff" },
          { Icon: Clock,       label: "Pending Orders", value: pendingCount,             color: "#d97706", bg: "#fefce8" },
        ].map(({ Icon, label, value, color, bg }) => (
          <div key={label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "20px 22px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", fontFamily: "'Syne', sans-serif" }}>{value}</div>
              <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 1 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: "#111827" }}>
            Payment History
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {["all", "paid", "pending"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  border: `1.5px solid ${filter === f ? "#f7931e" : "#e5e7eb"}`,
                  borderRadius: 8, padding: "6px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                  background: filter === f ? "#fff7ed" : "#fff",
                  color: filter === f ? "#ea580c" : "#374151",
                  fontFamily: "inherit",
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <button
              onClick={fetch}
              title="Refresh"
              style={{ border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "6px 10px", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <RefreshCw size={14} color="#6b7280" />
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>Loading payments…</div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: "center", color: "#dc2626", fontSize: 14 }}>{error}</div>
        ) : visible.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No payments found</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Organization", "Plan", "Duration", "Amount", "Status", "Renewed By", "Paid At", "Expires"].map((h) => (
                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "#6b7280", letterSpacing: ".06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((p, i) => {
                  const sc  = STATUS_COLOR[p.status] || STATUS_COLOR.created;
                  const pc  = PLAN_COLOR[p.planName] || "#6b7280";
                  return (
                    <tr key={p._id} style={{ borderTop: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "13px 16px", fontWeight: 600, fontSize: 13.5, color: "#111827" }}>
                        {p.organizationName || "—"}
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: pc, background: `${pc}18`, padding: "3px 10px", borderRadius: 20, textTransform: "capitalize" }}>
                          {p.planName}
                        </span>
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151" }}>
                        {p.durationMonths} mo
                      </td>
                      <td style={{ padding: "13px 16px", fontWeight: 700, fontSize: 14, color: "#111827", fontVariantNumeric: "tabular-nums" }}>
                        ₹{fmt(p.amount)}
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: sc.color, background: sc.bg, padding: "3px 10px", borderRadius: 20 }}>
                          {sc.label}
                        </span>
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151" }}>
                        {p.renewedBy?.name || "—"}
                        {p.renewedBy?.email && (
                          <div style={{ fontSize: 11.5, color: "#9ca3af" }}>{p.renewedBy.email}</div>
                        )}
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151", whiteSpace: "nowrap" }}>
                        {p.paidAt ? fmtDate(p.paidAt) : "—"}
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 13, color: "#374151", whiteSpace: "nowrap" }}>
                        {p.newExpiresAt ? fmtDate(p.newExpiresAt) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
