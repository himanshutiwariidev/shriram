/* eslint-disable react-refresh/only-export-components */
import React, { useState } from "react";
import {
  CheckCircle2, Clock, Lock, TrendingUp, X, Trash2,
} from "lucide-react";

export const T = {
  bg: "#f5f6fa",
  sidebar: "#ffffff",
  card: "#ffffff",
  header: "rgba(255,255,255,0.92)",
  border: "#e8eaf0",
  borderLight: "#f0f1f6",
  textPrimary: "#0f172a",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
  brand: "#f7931e",
  brandLight: "#fff4e6",
  brandMid: "#fed7aa",
  inputBg: "#f8f9fc",
  inputBorder: "#e2e6ef",
  green: "#16a34a",
  greenBg: "#dcffe6",
  greenBorder: "#bbf7d0",
  yellow: "#d97706",
  yellowBg: "#ffcaca",
  yellowBorder: "#fde68a",
  red: "#dc2626",
  redBg: "#fef2f2",
  redBorder: "#fecaca",
  pink: "#ff0095",
  pinkbg: "#ffc2dc",
  slate: "#64748b",
  slateBg: "#f8fafc",
  slateBorder: "#e2e8f0",
  teal: "#0f766e",
};

export const kpiGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 14,
};

export const PRIORITY = {
  low: { label: "Low", color: T.green, bg: T.greenBg, border: T.greenBorder },
  medium: { label: "Medium", color: T.yellow, bg: T.yellowBg, border: T.yellowBorder },
  high: { label: "High", color: T.red, bg: T.redBg, border: T.redBorder },
};

export const STATUS = {
  completed: { label: "Completed", color: T.green, bg: T.greenBg, border: T.greenBorder, Icon: CheckCircle2 },
  "in-progress": { label: "In Progress", color: T.yellow, bg: T.yellowBg, border: T.yellowBorder, Icon: TrendingUp },
  pending: { label: "Pending", color: T.slate, bg: T.slateBg, border: T.slateBorder, Icon: Clock },
};

export const ATT_STATUS_META = {
  Active: { color: "#0369a1", bg: "#e0f2fe", border: "#bae6fd" },
  Offline: { color: T.slate, bg: T.slateBg, border: T.slateBorder },
};

export const PIE_COLORS = ["#16a34a", "#d97706", "#64748b"];
export const PRIORITY_COLORS = { low: "#16a34a", medium: "#d97706", high: "#dc2626" };

export const PROJECT_EMPTY_FORM = {
  projectCategory: "allProjects",
  companyName: "",
  domain: "",
  handoverdate: "",
  salesPerson: "",
  businesstype: "",
  assignTo: "",
  technology: "",
  deployedDate: "",
  developer: "",
  websiteDueDate: "",
  domainDueDate: "",
  platform: "",
  domainProvider: "",
  hostingProvider: "",
  domainOwnership: "",
  hostingOwnership: "",
  status: "Active",
  userId: "",
  password: "",
  credentialType: "",
  credentials: [{ credentialType: "", userId: "", password: "" }],
};

export const PROJECT_TABS = [
  { id: "allProjects", label: "Live Projects" },
  { id: "ongoingProjects", label: "Ongoing Projects" },
  { id: "credentials", label: "Credentials" },
  { id: "domainDetails", label: "Domain Details" },
];

export const PROJECT_TAB_LABELS = PROJECT_TABS.reduce((labels, tab) => {
  labels[tab.id] = tab.label;
  return labels;
}, {});

export const PROJECT_FIELDS = [
  { key: "companyName", label: "Company Name", type: "text", required: true, placeholder: "Acme Pvt Ltd" },
  { key: "domain", label: "Domain", type: "text", placeholder: "example.com" },
  { key: "salesPerson", label: "Sales Person", type: "text" },
  { key: "developer", label: "Developer", type: "text", placeholder: "Developer name" },
  { key: "websiteDueDate", label: "Website Due Date", type: "date" },
  { key: "domainDueDate", label: "Domain Due Date", type: "date" },
  { key: "platform", label: "Platform", type: "text", placeholder: "WordPress / React" },
  { key: "domainProvider", label: "Domain Provider", type: "text", placeholder: "GoDaddy" },
  { key: "hostingProvider", label: "Hosting Provider", type: "text", placeholder: "Hostinger" },
  { key: "domainOwnership", label: "Domain Ownership", type: "text", placeholder: "Client / Company" },
  { key: "hostingOwnership", label: "Hosting Ownership", type: "text", placeholder: "Client / Company" },
];

export const PROJECT_TAB_FIELDS = {
  allProjects: PROJECT_FIELDS,
  ongoingProjects: [
    { key: "companyName", label: "Company", type: "text", required: true, placeholder: "Acme Pvt Ltd" },
    { key: "businesstype", label: "Business Type", type: "select", placeholder: "Select business type", options: ["Service", "Product"] },
    { key: "handoverdate", label: "Handover Date", type: "date" },
    { key: "salesPerson", label: "Sales Person", type: "text", placeholder: "Sales person name" },
    { key: "assignTo", label: "Assign To", type: "text", placeholder: "Assigned team member" },
    { key: "technology", label: "Technology", type: "text", placeholder: "React / WordPress / Node" },
  ],
  credentials: [
    { key: "companyName", label: "Company", type: "text", required: true, placeholder: "Acme Pvt Ltd" },
    { key: "domain", label: "Domain Name", type: "text", placeholder: "example.com" },
  ],
  domainDetails: [
    { key: "companyName", label: "Company", type: "text", required: true, placeholder: "Acme Pvt Ltd" },
    { key: "domain", label: "Domain Name", type: "text", placeholder: "example.com" },
    { key: "domainDueDate", label: "Domain Due Date", type: "date" },
    { key: "websiteDueDate", label: "Website Due Date", type: "date" },
    { key: "domainOwnership", label: "Ownership", type: "select", placeholder: "Select ownership", options: ["Client", "Company"] },
  ],
};

export const PROJECT_EXPORT_FIELDS = [
  { key: "projectCategory", label: "Project Tab" },
  { key: "companyName", label: "Company Name" },
  { key: "domain", label: "Domain" },
  { key: "handoverdate", label: "Handover Date", type: "date" },
  { key: "salesPerson", label: "Sales Person" },
  { key: "businesstype", label: "Business Type" },
  { key: "assignTo", label: "Assign To" },
  { key: "technology", label: "Technology" },
  { key: "deployedDate", label: "Deployed Date", type: "date" },
  { key: "developer", label: "Developer" },
  { key: "websiteDueDate", label: "Website Due Date", type: "date" },
  { key: "domainDueDate", label: "Domain Due Date", type: "date" },
  { key: "platform", label: "Platform" },
  { key: "domainProvider", label: "Domain Provider" },
  { key: "hostingProvider", label: "Hosting Provider" },
  { key: "domainOwnership", label: "Domain Ownership" },
  { key: "hostingOwnership", label: "Hosting Ownership" },
  { key: "status", label: "Status" },
  { key: "credentials", label: "Credentials" },
  { key: "userId", label: "User ID" },
  { key: "password", label: "Password" },
  { key: "credentialType", label: "Credential Type" },
];

export const PROJECT_STATUS = {
  Active: { label: "Active", color: T.green, bg: T.greenBg, border: T.greenBorder },
  "In-Active": { label: "In-Active", color: T.slate, bg: T.slateBg, border: T.slateBorder },
};
export const PROJECT_TYPES = {
  Service: { label: "Service", color: T.green, bg: T.greenBg, border: T.greenBorder },
  Product: { label: "Product", color: T.slate, bg: T.slateBg, border: T.slateBorder },
};

export const PROJECT_CHART_COLORS = ["#0f766e", "#0891b2", "#f7931e", "#d97706", "#16a34a", "#dc2626"];

export const fmtDateTime = (v) => {
  if (!v) return "—";
  return new Date(v).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const fmtMin = (min) => {
  const s = Number(min) || 0;
  return `${Math.floor(s / 60)}h ${s % 60}m`;
};

export const fmtCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

export const fmtShortDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export const daysUntil = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date - today) / 86400000);
};

export const listFromResponse = (data, key) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export const formatCsvDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const escapeCsvValue = (value) => {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

export function KpiCard({ Icon, label, value, color, bgColor, sub }) {
  return (
    <div className="card" style={{
      minWidth: 0, borderRadius: 18, padding: "18px 18px 20px",
      background: bgColor, border: "none",
      boxShadow: "0 1px 2px rgba(0,0,0,.02)",
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, background: `${color}26`, display: "grid", placeItems: "center", marginBottom: 14 }}>
        <Icon size={19} color={color} strokeWidth={2} />
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color, marginBottom: 5, whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.textPrimary, lineHeight: 1.1, fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color, marginTop: 5, fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

export function AttStatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="card" style={{
      minWidth: 0, background: bg, border: "none",
      borderRadius: 16, padding: "16px 16px 18px",
      boxShadow: "0 1px 2px rgba(0,0,0,.02)",
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: `${color}26`, display: "grid", placeItems: "center", marginBottom: 12 }}>
        <Icon size={17} color={color} strokeWidth={2} />
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color, marginBottom: 4, whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary, lineHeight: 1.1, fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}

export function ChartCard({ title, subtitle, children, style = {} }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 16,
      padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,.04)", ...style,
    }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

export function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 16px rgba(0,0,0,.1)", fontSize: 13 }}>
      {label && <div style={{ fontWeight: 600, color: T.textPrimary, marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || T.textSecondary, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, display: "inline-block" }} />
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function FormField({ label, children, span2 = false }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: span2 ? "1 / -1" : undefined }}>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, letterSpacing: ".06em", textTransform: "uppercase" }}>{label}</label>
      {children}
    </div>
  );
}

export const baseInp = {
  width: "100%", boxSizing: "border-box",
  background: T.inputBg, border: `1.5px solid ${T.inputBorder}`,
  borderRadius: 10, padding: "10px 14px 10px 40px",
  color: T.textPrimary, fontSize: 13.5, outline: "none", fontFamily: "inherit",
  transition: "border-color .18s, box-shadow .18s",
};

export const baseInpNoIcon = { ...baseInp, paddingLeft: 14 };

export const baseFilter = {
  padding: "9px 12px 9px 36px",
  background: T.inputBg, border: `1.5px solid ${T.inputBorder}`,
  borderRadius: 9, color: T.textPrimary,
  fontSize: 13, outline: "none", fontFamily: "inherit",
  transition: "border-color .18s, box-shadow .18s",
};

export function FieldIcon({ icon: Icon, small = false }) {
  return (
    <div style={{ position: "absolute", left: small ? 11 : 13, top: "50%", transform: "translateY(-50%)", color: T.textMuted, display: "flex", pointerEvents: "none" }}>
      <Icon size={small ? 13 : 15} strokeWidth={1.8} />
    </div>
  );
}

export function Modal({ title, onClose, children, width = 560 }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)", animation: "fadeIn .18s ease" }}>
      <div style={{ background: "#fff", borderRadius: 20, width: `min(${width}px, 95vw)`, boxShadow: "0 24px 80px rgba(0,0,0,.2)", border: `1px solid ${T.border}`, animation: "slideUp .22s cubic-bezier(.22,1,.36,1)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 26px 18px", borderBottom: `1px solid ${T.borderLight}` }}>
          <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: T.textPrimary }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex", padding: 4, borderRadius: 6, transition: "background .15s" }} onMouseEnter={e => e.currentTarget.style.background = T.slateBg} onMouseLeave={e => e.currentTarget.style.background = "none"}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div style={{ padding: "22px 26px 26px" }}>{children}</div>
      </div>
    </div>
  );
}

export function ConfirmModal({ title, message, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose} width={420}>
      <p style={{ fontSize: 13.5, color: T.textSecondary, lineHeight: 1.7, marginBottom: 24 }}>{message}</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 9, border: `1.5px solid ${T.border}`, background: "#fff", color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }} onMouseEnter={e => e.currentTarget.style.background = T.slateBg} onMouseLeave={e => e.currentTarget.style.background = "#fff"}>Cancel</button>
        <button onClick={onConfirm} style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: "linear-gradient(135deg, #dc2626, #b91c1c)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif", display: "flex", alignItems: "center", gap: 7 }} onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.1)"} onMouseLeave={e => e.currentTarget.style.filter = ""}>
          <Trash2 size={14} strokeWidth={2} /> Delete
        </button>
      </div>
    </Modal>
  );
}

// Shown when a Tenant Admin clicks a sidebar module that Super Admin hasn't
// enabled for their subscription. `featureLabel` is the tab's display name
// (e.g. "Tasks"), shown in the title so the popup is specific, not generic.
export function LockedFeatureModal({ featureLabel, onClose }) {
  return (
    <Modal title={featureLabel ? `${featureLabel} — Locked` : "Feature Locked"} onClose={onClose} width={420}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14, padding: "8px 0 4px" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: T.brandLight, display: "grid", placeItems: "center" }}>
          <Lock size={22} color={T.brand} strokeWidth={2} />
        </div>
        <p style={{ fontSize: 13.5, color: T.textSecondary, lineHeight: 1.7 }}>
          This feature is not included in your current subscription.<br />
          Please contact your Organization Administrator or upgrade your subscription.
        </p>
        <button onClick={onClose} style={{ padding: "9px 24px", borderRadius: 9, border: "none", background: "linear-gradient(135deg, #f7931e, #e8590c)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif" }}>
          Got it
        </button>
      </div>
    </Modal>
  );
}

export function IconBtn({ icon: Icon, color, bg, hoverBg, onClick, title }) {
  const [hov, setHov] = useState(false);
  return (
    <button title={title} onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: 30, height: 30, borderRadius: 7, border: "none", cursor: "pointer", display: "grid", placeItems: "center", background: hov ? hoverBg : bg, color, transition: "background .15s, transform .15s", transform: hov ? "scale(1.1)" : "scale(1)", fontFamily: "inherit" }}>
      <Icon size={13} strokeWidth={2.2} />
    </button>
  );
}
