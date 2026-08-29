import React from "react";
import { Printer } from "lucide-react";
import useTenantTheme from "../../hooks/useTenantTheme";
import { Modal } from "../../pages/sections/shared";
import { collectConfiguredLeaves } from "../../utils/nestedState";

const fmtCurrency = (value, currency) => {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
  } catch {
    return `${currency || ""} ${Number(value) || 0}`;
  }
};

// window.print() + @media print CSS — no PDF library needed. Shows a
// clean read-only summary (mirrors what the emailed PDF's Scope Of Work
// table shows the client), hides all interactive form chrome.
export default function ProposalPrintPreview({ project, services, catalog = [], clientName, onClose }) {
  const { T } = useTenantTheme();

  const groups = services
    .map((instance) => {
      const config = catalog.find((s) => s.key === instance.serviceKey);
      if (!config) return null;
      const items = collectConfiguredLeaves(config, instance.data);
      return { label: config.label, items };
    })
    .filter((g) => g && g.items.length > 0);

  return (
    <Modal title="Print Preview" onClose={onClose} width={720}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #proposal-print-area, #proposal-print-area * { visibility: visible; }
          #proposal-print-area { position: absolute; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div id="proposal-print-area" style={{ padding: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `2px solid ${T.textPrimary}`, paddingBottom: 16, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: T.textPrimary }}>{project.projectName || "Untitled Project"}</h1>
            {clientName && <p style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>Prepared for {clientName}</p>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10.5, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".06em" }}>Total Proposal Value</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.textPrimary, fontFamily: "'Syne', sans-serif" }}>{fmtCurrency(project.projectAmount, project.currency)}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24, fontSize: 12.5 }}>
          {project.timeline && <div><strong>Timeline:</strong> {project.timeline}</div>}
          {project.priority && <div><strong>Priority:</strong> {project.priority}</div>}
          {project.validUntil && <div><strong>Valid Till:</strong> {new Date(project.validUntil).toLocaleDateString()}</div>}
        </div>

        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary, marginBottom: 12 }}>Scope of Work</h2>
        {groups.length === 0 ? (
          <p style={{ fontSize: 13, color: T.textMuted }}>No services configured yet.</p>
        ) : (
          groups.map((group) => (
            <div key={group.label} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.brand, marginBottom: 6 }}>{group.label}</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <tbody>
                  {group.items.map((item) => (
                    <tr key={item.title} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                      <td style={{ padding: "6px 4px", color: T.textSecondary }}>{item.title}</td>
                      <td style={{ padding: "6px 4px", textAlign: "right", color: T.textMuted, width: 90 }}>Qty: {item.quantity}/mo</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
        <button
          type="button"
          onClick={() => window.print()}
          style={{ display: "flex", alignItems: "center", gap: 8, background: `linear-gradient(135deg, ${T.brand}, ${T.brandMid})`, color: "#fff", border: "none", borderRadius: 10, padding: "11px 20px", fontSize: 13.5, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer" }}
        >
          <Printer size={15} strokeWidth={2} /> Print
        </button>
      </div>
    </Modal>
  );
}
