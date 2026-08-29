import React, { useMemo } from "react";
import { Layers, ListChecks, Wallet } from "lucide-react";
import useTenantTheme from "../../hooks/useTenantTheme";
import { countConfiguredLeaves, sumServiceBudgets } from "../../utils/nestedState";

const fmtCurrency = (value, currency) => {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
  } catch {
    return `${currency || ""} ${Number(value) || 0}`;
  }
};

// Deliberately honest: projectAmount (the field the org actually charges
// the client) is the one authoritative total. The budget rollup below it
// only ever sums fields that genuinely exist among selected services —
// most services in this spec carry no cost field at all, so there is no
// fabricated per-unit pricing anywhere here.
export default function ProposalSummary({ services = [], catalog = [], projectAmount, currency = "INR" }) {
  const { T } = useTenantTheme();

  const { totalLineItems, configuredLineItems, budgetRollup } = useMemo(() => {
    let total = 0;
    let configured = 0;
    for (const instance of services) {
      const config = catalog.find((s) => s.key === instance.serviceKey);
      if (!config) continue;
      const stats = countConfiguredLeaves(config, instance.data);
      total += stats.total;
      configured += stats.configured;
    }
    return { totalLineItems: total, configuredLineItems: configured, budgetRollup: sumServiceBudgets(services) };
  }, [services]);

  const Tile = ({ icon: Icon, label, value, sub }) => (
    <div style={{ flex: 1, minWidth: 160, background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <Icon size={13} strokeWidth={2} color={T.textMuted} />
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: T.textMuted }}>{label}</span>
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: T.textPrimary, fontFamily: "'Syne', sans-serif" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 16, padding: 22 }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: T.textPrimary, marginBottom: 14 }}>Proposal Summary</div>

      <div style={{ background: `linear-gradient(135deg, ${T.brand}, ${T.brandMid})`, borderRadius: 12, padding: "16px 18px", marginBottom: 14, color: "#fff" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", opacity: .85 }}>Total Proposal Value</div>
        <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "'Syne', sans-serif", marginTop: 4 }}>{fmtCurrency(projectAmount, currency)}</div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Tile icon={Layers} label="Services" value={services.length} sub={services.length === 1 ? "service selected" : "services selected"} />
        <Tile icon={ListChecks} label="Line Items" value={`${configuredLineItems}/${totalLineItems || 0}`} sub="options configured" />
        {budgetRollup > 0 && (
          <Tile icon={Wallet} label="Budget Rollup" value={fmtCurrency(budgetRollup, currency)} sub="partial — only services with a budget field" />
        )}
      </div>
    </div>
  );
}
