import React from "react";
import { Briefcase, Building2, CheckCircle2, CreditCard, Layers, Lock, ShieldCheck, Sparkles, Users } from "lucide-react";
import useTenantTheme from "../../hooks/useTenantTheme";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");

export default function SubscriptionSection({ subscription, featureCatalog = [] }) {
  const { T } = useTenantTheme();
  const STATUS_META = {
    active: { label: "Active", color: T.green, bg: T.greenBg },
    trial: { label: "Trial", color: "#d97706", bg: "#fffbeb" },
    suspended: { label: "Suspended", color: T.red, bg: T.redBg },
    expired: { label: "Expired", color: T.textMuted, bg: T.borderLight },
  };
  if (!subscription) {
    return <p style={{ fontSize: 13, color: T.textMuted }}>Loading subscription…</p>;
  }

  const { organization = {}, limits = {}, usage = {}, enabledFeatures = [] } = subscription;
  const meta = STATUS_META[organization.status] || STATUS_META.trial;

  const usageRows = [
    { label: "Users", used: usage.users ?? 0, max: limits.maxUsers, Icon: Users },
    { label: "Branches", used: usage.branches ?? 0, max: limits.maxBranches, Icon: Building2 },
    { label: "Departments", used: usage.departments ?? 0, max: limits.maxDepartments, Icon: Layers },
    { label: "Projects", used: usage.projects ?? 0, max: limits.maxProjects, Icon: Briefcase },
    { label: "Clients", used: usage.clients ?? 0, max: limits.maxClients, Icon: Building2 },
    { label: "Storage (MB)", used: usage.storageMB ?? 0, max: limits.maxStorageMB, Icon: Layers },
  ];

  const totalFeatures = featureCatalog.flatMap((group) => group.features).length;
  const includedFeatures = featureCatalog.flatMap((group) => group.features).filter((feature) => enabledFeatures.includes(feature.key)).length;
  const renewalDate = organization.subscriptionExpiresAt || organization.trialEndsAt;
  const chartRows = usageRows.map((row) => {
    const pct = row.max ? Math.min(100, Math.round((row.used / row.max) * 100)) : 0;
    const over = row.max != null && row.used >= row.max;
    return { ...row, pct, over };
  });
  const highestUsed = Math.max(1, ...chartRows.map((row) => row.used || 0));
  const totalUsed = chartRows.reduce((sum, row) => sum + Number(row.used || 0), 0);

  return (
    <div className="fade-up subscription-premium">
      <style>{`
        @media (max-width: 760px) {
          .subscription-premium-hero { grid-template-columns: 1fr !important; }
          .subscription-premium-summary { grid-template-columns: 1fr !important; }
          .subscription-usage-row { grid-template-columns: 1fr !important; gap: 8px !important; }
          .subscription-usage-row > div:last-child { text-align: left !important; }
        }
      `}</style>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, overflow: "hidden", boxShadow: "0 18px 45px -38px rgba(15,23,42,.35)" }}>
        <div className="subscription-premium-hero" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(240px, .9fr)", gap: 0, background: `linear-gradient(135deg, ${T.inputBg}, #fff)` }}>
          <div style={{ padding: 26, borderRight: `1px solid ${T.borderLight}` }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 800, letterSpacing: ".07em", textTransform: "uppercase", color: T.brand, background: T.brandLight, border: `1px solid ${T.brandMid}`, borderRadius: 99, padding: "6px 10px", marginBottom: 16 }}>
              <Sparkles size={12} strokeWidth={2.2} /> Subscription
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ width: 48, height: 48, borderRadius: 15, background: `linear-gradient(135deg, ${T.brand}, ${T.brandDark || T.brand})`, display: "grid", placeItems: "center", boxShadow: `0 14px 28px ${T.brand}30` }}>
                <CreditCard size={20} color="#fff" strokeWidth={2.2} />
              </div>
              <div>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 23, color: T.textPrimary, textTransform: "capitalize", lineHeight: 1.1 }}>{organization.planName || "Starter"} Plan</h2>
                <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 5 }}>Plan limits, usage, and enabled modules for this workspace.</p>
              </div>
            </div>
          </div>
          <div className="subscription-premium-summary" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: 20 }}>
            <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: 15 }}>
              <div style={{ fontSize: 10.5, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".07em", fontWeight: 800 }}>Status</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 8, fontSize: 12, fontWeight: 800, color: meta.color, background: meta.bg, borderRadius: 99, padding: "6px 10px" }}>
                <ShieldCheck size={13} strokeWidth={2.2} /> {meta.label}
              </div>
            </div>
            <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: 15 }}>
              <div style={{ fontSize: 10.5, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".07em", fontWeight: 800 }}>{organization.subscriptionExpiresAt ? "Expires" : "Trial Ends"}</div>
              <div style={{ marginTop: 8, fontSize: 15, fontWeight: 800, color: T.textPrimary, fontFamily: "'Syne', sans-serif" }}>{fmtDate(renewalDate)}</div>
            </div>
            <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: 15, gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 10.5, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".07em", fontWeight: 800 }}>Feature Coverage</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                <div style={{ flex: 1, height: 8, background: T.borderLight, borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${totalFeatures ? Math.round((includedFeatures / totalFeatures) * 100) : 0}%`, background: `linear-gradient(90deg, ${T.green}, ${T.brand})`, borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: T.textPrimary }}>{includedFeatures}/{totalFeatures || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: 26, borderTop: `1px solid ${T.borderLight}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: T.textPrimary }}>Usage Limits</div>
              <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>Live consumption against current subscription allowances</div>
            </div>
          </div>

          <div style={{ marginBottom: 22 }}>
            <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16, padding: 18, boxShadow: "0 10px 24px -22px rgba(15,23,42,.5)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 800 }}>Utilization Chart</div>
                  <div style={{ marginTop: 4, fontSize: 13, color: T.textSecondary }}>Each bar shows used capacity against plan limit.</div>
                </div>
                <span style={{ fontSize: 12, color: T.textPrimary, background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 99, padding: "7px 11px", fontWeight: 800 }}>
                  {totalUsed} total records
                </span>
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                {chartRows.map(({ label, used, max, Icon, pct, over }) => (
                  <div key={label} style={{ display: "grid", gridTemplateColumns: "150px minmax(0, 1fr) 78px", gap: 12, alignItems: "center" }} className="subscription-usage-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 11, background: over ? T.redBg : T.brandLight, display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <Icon size={16} color={over ? T.red : T.brand} strokeWidth={2} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: T.textPrimary, fontWeight: 800, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
                        <div style={{ color: T.textMuted, fontSize: 11.5, marginTop: 2 }}>{max == null ? "Unlimited" : `${used} of ${max}`}</div>
                      </div>
                    </div>
                    <div style={{ position: "relative", height: 28, background: T.borderLight, borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${max == null ? Math.min(100, (used / highestUsed) * 100) : pct}%`, minWidth: used > 0 ? 8 : 0, background: over ? T.red : T.brand, borderRadius: 999, boxShadow: `0 8px 18px ${over ? "rgba(220,38,38,.16)" : `${T.brand}26`}` }} />
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", paddingLeft: 12, color: pct > 45 ? "#fff" : T.textSecondary, fontSize: 11.5, fontWeight: 800 }}>
                        {max == null ? `${used} used` : `${pct}% used`}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800, color: over ? T.red : T.textPrimary, whiteSpace: "nowrap" }}>
                      {used}{max != null ? <span style={{ color: T.textMuted, fontSize: 12, fontWeight: 700 }}> / {max}</span> : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 16, padding: "18px 20px" }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, color: T.textPrimary, marginBottom: 14 }}>Feature Access</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {featureCatalog.flatMap((group) => group.features).map((feature) => {
                const enabled = enabledFeatures.includes(feature.key);
                return (
                  <span key={feature.key} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, padding: "7px 12px", borderRadius: 10, color: enabled ? T.green : T.textMuted, background: enabled ? "#fff" : T.borderLight, border: `1px solid ${enabled ? T.greenBorder : T.border}` }}>
                    {enabled ? <CheckCircle2 size={13} strokeWidth={2.2} /> : <Lock size={12} strokeWidth={2} />}
                    {feature.label}
                  </span>
                );
              })}
            </div>
            <p style={{ fontSize: 11.5, color: T.textMuted, marginTop: 14 }}>Need a locked feature? Contact your Organization Administrator or upgrade your subscription.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
