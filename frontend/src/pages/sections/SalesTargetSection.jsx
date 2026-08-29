import React, { useState, useEffect } from "react";
import { Plus, Trash2, X, Trophy, Award, Target } from "lucide-react";
import API from "../../services/api";
import useTenantTheme from "../../hooks/useTenantTheme";

const fmtINR = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const STATUS_META = {
  exceeded:   { label: "Exceeded",  color: "#16a34a", bg: "#f0fdf4", bar: "#16a34a" },
  "on-track": { label: "On Track",  color: "#2563eb", bg: "#eff6ff", bar: "#2563eb" },
  behind:     { label: "Behind",    color: "#d97706", bg: "#fffbeb", bar: "#f59e0b" },
};

const AVATAR_COLORS = [
  ["#dbeafe","#1d4ed8"], ["#fce7f3","#be185d"], ["#dcfce7","#15803d"],
  ["#fef3c7","#b45309"], ["#ede9fe","#6d28d9"], ["#fee2e2","#b91c1c"],
];
const avatarColor = (name = "") => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

// isAdmin=true → full admin view (all salespersons, can set/delete targets)
// isAdmin=false + myUserId → read-only card showing only the current user's target
export default function SalesTargetSection({ myUserId = null }) {
  const { T } = useTenantTheme();
  const isAdmin = !myUserId;

  const now = new Date();
  const [period,  setPeriod]  = useState("monthly");
  const [year,    setYear]    = useState(now.getFullYear());
  const [month,   setMonth]   = useState(now.getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.ceil((now.getMonth() + 1) / 3));

  const [summary,      setSummary]      = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [salesPersons, setSalesPersons] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState({ userId: "", targetAmount: "", commissionRate: "5", notes: "" });
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  };

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await API.get("/sales-targets/summary", {
        params: { period, year, month, quarter },
      });
      let rows = data.summary || [];
      // Sales role: only show their own target
      if (myUserId) {
        rows = rows.filter(
          (r) => String(r.userId) === String(myUserId)
        );
      }
      setSummary(rows);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load targets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummary(); }, [period, year, month, quarter]);

  useEffect(() => {
    if (!isAdmin) return;
    API.get("/users/by-role/sales")
      .then(({ data }) => setSalesPersons(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [isAdmin]);

  const handleSave = async () => {
    if (!form.userId || !form.targetAmount) return;
    setSaving(true);
    try {
      await API.post("/sales-targets", {
        userId:         form.userId,
        period,
        year,
        month:   period === "monthly"    ? month   : undefined,
        quarter: period === "quarterly"  ? quarter : undefined,
        targetAmount:   Number(form.targetAmount),
        commissionRate: Number(form.commissionRate || 0),
        notes:          form.notes,
      });
      showToast("Target saved successfully");
      setShowModal(false);
      setForm({ userId: "", targetAmount: "", commissionRate: "5", notes: "" });
      fetchSummary();
    } catch (e) {
      showToast(e?.response?.data?.message || "Failed to save target", false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this target?")) return;
    try {
      await API.delete(`/sales-targets/${id}`);
      showToast("Target removed");
      fetchSummary();
    } catch {
      showToast("Failed to remove target", false);
    }
  };

  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - 1 + i);
  const periodLabel = period === "monthly"
    ? `${MONTHS[month - 1]} ${year}`
    : `Q${quarter} · ${year}`;

  // Aggregate totals for the admin header row
  const totalTarget   = summary.reduce((s, r) => s + r.targetAmount, 0);
  const totalAchieved = summary.reduce((s, r) => s + r.achieved, 0);
  const totalCommission = summary.reduce((s, r) => s + r.commissionEarned, 0);
  const overallPct    = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;

  return (
    <div style={{ padding: "2px 0" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          padding: "12px 20px", borderRadius: 10,
          background: toast.ok ? "#16a34a" : "#dc2626",
          color: "#fff", fontSize: 13, fontWeight: 600,
          boxShadow: "0 4px 24px rgba(0,0,0,.18)",
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.textPrimary }}>
            {isAdmin ? "Sales Targets & Commission" : "My Sales Target"}
          </div>
          <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>
            {isAdmin
              ? `Track targets and commission earned · ${periodLabel}`
              : `Your target and commission for ${periodLabel}`}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {/* Period toggle */}
          <div style={{ display: "flex", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, overflow: "hidden" }}>
            {["monthly", "quarterly"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: "7px 13px", border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                  background: period === p ? T.brand : "transparent",
                  color: period === p ? "#fff" : T.textSecondary,
                  transition: "all .12s",
                }}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {/* Month or Quarter picker */}
          {period === "monthly" ? (
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={selectS(T)}>
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          ) : (
            <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))} style={selectS(T)}>
              {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}
            </select>
          )}

          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={selectS(T)}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          {isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 15px", background: T.brand, color: "#fff",
                border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <Plus size={14} strokeWidth={2.5} /> Set Target
            </button>
          )}
        </div>
      </div>

      {/* ── Summary strip (admin only) ────────────────────────────── */}
      {isAdmin && summary.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Total Target",    value: fmtINR(totalTarget),    color: T.brand },
            { label: "Total Achieved",  value: fmtINR(totalAchieved),  color: overallPct >= 100 ? "#16a34a" : overallPct >= 70 ? "#2563eb" : "#d97706" },
            { label: "Overall Progress",value: `${overallPct}%`,       color: overallPct >= 100 ? "#16a34a" : overallPct >= 70 ? "#2563eb" : "#d97706" },
            { label: "Total Commission",value: fmtINR(totalCommission),color: "#16a34a" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 5 }}>{s.label}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Cards ──────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "52px 0", color: T.textMuted, fontSize: 13 }}>Loading…</div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "52px 0", color: "#dc2626", fontSize: 13 }}>{error}</div>
      ) : summary.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: T.textMuted }}>
          <Trophy size={38} strokeWidth={1} style={{ display: "block", margin: "0 auto 12px", opacity: .22 }} />
          <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>
            {isAdmin ? "No targets set for this period" : "No target set for you this period"}
          </div>
          {isAdmin && <div style={{ fontSize: 12, color: T.textMuted }}>Click "Set Target" to assign a target to a salesperson.</div>}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {summary.map((row) => {
            const meta     = STATUS_META[row.status] || STATUS_META.behind;
            const barPct   = Math.min(row.progressPct, 100);
            const [avBg, avFg] = avatarColor(row.userName);

            return (
              <div
                key={row._id}
                style={{
                  background: "#fff", border: `1px solid ${T.border}`,
                  borderRadius: 14, padding: "18px 18px 16px",
                  boxShadow: "0 1px 4px rgba(0,0,0,.04)", position: "relative",
                }}
              >
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(row._id)}
                    title="Remove target"
                    style={{
                      position: "absolute", top: 12, right: 12,
                      background: "none", border: "none", cursor: "pointer",
                      color: T.textMuted, padding: 4, lineHeight: 0, borderRadius: 4,
                    }}
                  >
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                )}

                {/* Person header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingRight: isAdmin ? 24 : 0 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: avBg, display: "grid", placeItems: "center",
                    fontSize: 13, fontWeight: 700, color: avFg,
                  }}>
                    {initials(row.userName)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.userName}
                    </div>
                    <span style={{
                      display: "inline-block", marginTop: 3,
                      fontSize: 10.5, fontWeight: 600, padding: "2px 9px", borderRadius: 99,
                      color: meta.color, background: meta.bg,
                    }}>
                      {meta.label}
                    </span>
                  </div>
                </div>

                {/* Amount tiles */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  <div style={{ background: T.inputBg, borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 9.5, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 4 }}>Target</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, fontVariantNumeric: "tabular-nums" }}>{fmtINR(row.targetAmount)}</div>
                  </div>
                  <div style={{ background: meta.bg, borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 9.5, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 4 }}>Achieved</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: meta.bar, fontVariantNumeric: "tabular-nums" }}>{fmtINR(row.achieved)}</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: T.textMuted }}>Progress toward target</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: meta.bar }}>{row.progressPct}%</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${barPct}%`, borderRadius: 99,
                      background: `linear-gradient(90deg,${meta.bar}99,${meta.bar})`,
                      transition: "width .65s cubic-bezier(.4,0,.2,1)",
                    }} />
                  </div>
                  {row.progressPct > 100 && (
                    <div style={{ fontSize: 10.5, color: "#16a34a", marginTop: 4, fontWeight: 600 }}>
                      +{fmtINR(row.achieved - row.targetAmount)} above target
                    </div>
                  )}
                </div>

                {/* Commission */}
                {row.commissionRate > 0 && (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: "#f8fafc", border: "1px solid #f1f5f9",
                    borderRadius: 8, padding: "8px 12px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Award size={13} strokeWidth={2} color={T.textMuted} />
                      <span style={{ fontSize: 11.5, color: T.textSecondary }}>{row.commissionRate}% commission</span>
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: "#16a34a", fontVariantNumeric: "tabular-nums" }}>
                      {fmtINR(row.commissionEarned)}
                    </span>
                  </div>
                )}

                {row.notes && (
                  <div style={{ marginTop: 10, fontSize: 11, color: T.textMuted, fontStyle: "italic", lineHeight: 1.5 }}>
                    {row.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Set Target Modal ────────────────────────────────────────── */}
      {showModal && isAdmin && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{ background: "#fff", borderRadius: 16, padding: "28px 26px 24px", width: "100%", maxWidth: 420, boxShadow: "0 12px 48px rgba(0,0,0,.2)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#eff6ff", display: "grid", placeItems: "center" }}>
                  <Target size={15} strokeWidth={2} color="#2563eb" />
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Set Sales Target</span>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4, lineHeight: 0 }}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelS}>Salesperson</label>
                <select value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))} style={modalInputS}>
                  <option value="">Select salesperson…</option>
                  {salesPersons.map((sp) => (
                    <option key={sp._id} value={sp._id}>{sp.name}</option>
                  ))}
                </select>
                {salesPersons.length === 0 && (
                  <div style={{ fontSize: 11, color: "#d97706", marginTop: 5 }}>No users with 'sales' role found.</div>
                )}
              </div>
              <div>
                <label style={labelS}>Target Amount (₹)</label>
                <input
                  type="number" min="0" placeholder="e.g. 500000"
                  value={form.targetAmount}
                  onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))}
                  style={modalInputS}
                />
              </div>
              <div>
                <label style={labelS}>Commission Rate (%)</label>
                <input
                  type="number" min="0" max="100" step="0.5" placeholder="e.g. 5"
                  value={form.commissionRate}
                  onChange={(e) => setForm((f) => ({ ...f, commissionRate: e.target.value }))}
                  style={modalInputS}
                />
              </div>
              <div>
                <label style={labelS}>Notes (optional)</label>
                <input
                  type="text" placeholder="Any notes for this target…"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  style={modalInputS}
                />
              </div>

              <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 11.5, color: "#64748b" }}>
                Period: <strong>{periodLabel}</strong> · If a target already exists for this person and period it will be updated.
              </div>

              <button
                disabled={saving || !form.userId || !form.targetAmount}
                onClick={handleSave}
                style={{
                  padding: "11px 0", background: T.brand, color: "#fff",
                  border: "none", borderRadius: 10, fontSize: 13.5, fontWeight: 700,
                  cursor: saving || !form.userId || !form.targetAmount ? "not-allowed" : "pointer",
                  opacity: saving || !form.userId || !form.targetAmount ? .65 : 1,
                  fontFamily: "inherit", transition: "opacity .15s",
                }}
              >
                {saving ? "Saving…" : "Save Target"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Shared micro styles ──────────────────────────────────────── */
const labelS = {
  display: "block", fontSize: 11, fontWeight: 700, color: "#475569",
  marginBottom: 5, textTransform: "uppercase", letterSpacing: ".07em",
};

const modalInputS = {
  width: "100%", padding: "9px 12px",
  border: "1px solid #e2e8f0", borderRadius: 8,
  fontSize: 13, color: "#0f172a", fontFamily: "inherit",
  background: "#f8fafc", outline: "none", boxSizing: "border-box",
};

const selectS = (T) => ({
  padding: "7px 10px", border: `1px solid ${T.inputBorder}`,
  borderRadius: 8, fontSize: 12, background: T.inputBg,
  color: T.textPrimary, fontFamily: "inherit", cursor: "pointer",
});
