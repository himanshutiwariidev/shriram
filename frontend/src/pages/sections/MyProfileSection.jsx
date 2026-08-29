import React, { useEffect, useState } from "react";
import {
  BadgeCheck, Briefcase, Building2, Calendar, CheckCircle2, Crown, HardDrive,
  Hash, Layers, Lock, Mail, Phone, ShieldCheck, Sparkles,
  User as UserIcon, Users,
} from "lucide-react";
import API from "../../services/api";
import EmailSettingsSection from "./EmailSettingsSection";
import AiSettingsSection from "./AiSettingsSection";
import { useAuth } from "../../context/AuthContext";
import { resolveFileUrl } from "../../utils/fileUrl";

const STATUS_META = {
  active: { label: "Active", color: "#047857", bg: "#ecfdf5", border: "#86efac", dot: "#22c55e" },
  trial: { label: "Trial", color: "#b45309", bg: "#fffbeb", border: "#fcd34d", dot: "#f59e0b" },
  suspended: { label: "Suspended", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5", dot: "#ef4444" },
  expired: { label: "Expired", color: "#64748b", bg: "#f8fafc", border: "#cbd5e1", dot: "#94a3b8" },
};

function fmtDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function getDaysLeft(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
}

const initialsFor = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "A";

export default function MyProfileSection({ subscription, featureCatalog }) {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    API.get("/users/me").then(({ data }) => {
      setProfile(data.user);
      updateUser({
        id: data.user._id || data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        tenantId: data.user.tenantId,
        profileImage: data.user.profileImage || "",
      });
    }).catch(() => {});
  }, [updateUser]);

  const org = subscription?.organization || {};
  const limits = subscription?.limits || {};
  const usage = subscription?.usage || {};
  const enabledFeatures = subscription?.enabledFeatures || [];
  const planName = org.planName || "Starter";
  const orgStatus = org.status || "trial";
  const statusMeta = STATUS_META[orgStatus] || STATUS_META.expired;
  const allCatalog = (featureCatalog || []).flatMap((g) => g.features.map((f) => ({ ...f, group: g.group })));
  const enabledCount = allCatalog.filter((f) => enabledFeatures.includes(f.key)).length;
  const expiryDate = org.subscriptionExpiresAt || org.trialEndsAt;
  const remaining = getDaysLeft(expiryDate);
  const orgName = org.name || "";

  if (!profile) {
    return (
      <div style={{ padding: 56, textAlign: "center", color: "#94a3b8", fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
        Loading...
      </div>
    );
  }

  const tenantId = profile.tenantId || org.tenantId || "";
  const avatarUrl = profile.profileImage ? resolveFileUrl(profile.profileImage) : null;
  const adminName = profile.name || "Tenant Admin";
  const adminRole = profile.designation || "Tenant Administrator";
  const daysColor = !remaining ? "#64748b" : remaining <= 0 ? "#64748b" : remaining <= 7 ? "#dc2626" : remaining <= 30 ? "#d97706" : "#059669";

  const daysBarPct = (() => {
    if (!remaining || remaining <= 0) return 0;
    if (!org.createdAt || !expiryDate) return 50;
    const total = Math.ceil((new Date(expiryDate) - new Date(org.createdAt)) / 86400000);
    return total > 0 ? Math.max(3, Math.min(100, Math.round((remaining / total) * 100))) : 50;
  })();

  const kpiTiles = [
    {
      label: "Team Members",
      value: usage.users ?? 0,
      sub: limits.maxUsers != null ? `${limits.maxUsers} seats available` : "Unlimited seats",
      color: "#2563eb",
      Icon: Users,
    },
    {
      label: "Active Projects",
      value: usage.projects ?? 0,
      sub: limits.maxProjects != null ? `${limits.maxProjects} project limit` : "Unlimited projects",
      color: "#7c3aed",
      Icon: Briefcase,
    },
    {
      label: "Active Clients",
      value: usage.clients ?? 0,
      sub: limits.maxClients != null ? `${limits.maxClients} client limit` : "Unlimited clients",
      color: "#0891b2",
      Icon: UserIcon,
    },
    {
      label: "Modules Enabled",
      value: enabledCount,
      sub: allCatalog.length > 0 ? `${allCatalog.length} modules in catalog` : "No catalog data",
      color: "#d97706",
      Icon: Layers,
    },
  ];

  const capacityRows = [
    { label: "Branches", Icon: Building2, used: usage.branches ?? 0, max: limits.maxBranches ?? null, color: "#0f766e" },
    { label: "Departments", Icon: Layers, used: usage.departments ?? 0, max: limits.maxDepartments ?? null, color: "#7c3aed" },
    { label: "Storage", Icon: HardDrive, used: usage.storageMB ?? 0, max: limits.maxStorageMB ?? null, unit: "MB", color: "#ea580c" },
  ];

  const accountRows = [
    tenantId && { Icon: Hash, label: "Tenant ID", value: tenantId, mono: true },
    profile.createdAt && { Icon: Calendar, label: "Admin Since", value: fmtDate(profile.createdAt) },
    org.createdAt && { Icon: Calendar, label: "Organisation Since", value: fmtDate(org.createdAt) },
  ].filter(Boolean);

  return (
    <div className="ap-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');

        .ap-root {
          font-family: 'Inter', sans-serif;
          width: 100%;
          max-width: 1160px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 18px;
          color: #0f172a;
        }

        .ap-hero {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 18px;
          background:
            radial-gradient(circle at 8% 0%, rgba(247, 147, 30, 0.18), transparent 28%),
            radial-gradient(circle at 92% 12%, rgba(37, 99, 235, 0.16), transparent 30%),
            linear-gradient(135deg, #ffffff 0%, #f8fafc 48%, #fef7ed 100%);
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.10);
          padding: 28px;
        }
        .ap-hero-inner {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 310px;
          gap: 24px;
          align-items: stretch;
        }
        .ap-admin {
          display: flex;
          align-items: center;
          gap: 22px;
          min-width: 0;
        }
        .ap-avatar-wrap {
          width: 118px;
          height: 118px;
          border-radius: 28px;
          padding: 4px;
          background: linear-gradient(135deg, #f7931e, #2563eb, #16a34a);
          box-shadow: 0 18px 38px rgba(37, 99, 235, 0.20);
          flex-shrink: 0;
        }
        .ap-avatar {
          width: 100%;
          height: 100%;
          border-radius: 24px;
          background: linear-gradient(135deg, #111827, #334155);
          display: grid;
          place-items: center;
          overflow: hidden;
          color: #fff;
          font-family: 'Sora', sans-serif;
          font-size: 34px;
          font-weight: 800;
        }
        .ap-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .ap-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 11px;
          border: 1px solid rgba(247, 147, 30, 0.24);
          border-radius: 999px;
          background: rgba(255, 247, 237, 0.86);
          color: #b45309;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .ap-name {
          font-family: 'Sora', sans-serif;
          font-size: clamp(30px, 4vw, 48px);
          font-weight: 800;
          line-height: 1;
          letter-spacing: 0;
          margin: 0 0 10px;
          color: #0f172a;
        }
        .ap-role {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
          color: #475569;
          font-size: 13px;
          font-weight: 600;
        }
        .ap-contact-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 18px;
        }
        .ap-chip {
          min-width: 0;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          border: 1px solid rgba(226, 232, 240, 0.95);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.78);
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
          color: #334155;
          font-size: 12.5px;
          font-weight: 600;
          overflow-wrap: anywhere;
        }
        .ap-hero-panel {
          border: 1px solid rgba(226, 232, 240, 0.86);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(14px);
          padding: 18px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
        }
        .ap-plan-mini {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 18px;
        }
        .ap-plan-label {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #94a3b8;
          margin-bottom: 7px;
        }
        .ap-plan-name {
          font-family: 'Sora', sans-serif;
          font-size: 28px;
          font-weight: 800;
          line-height: 1;
          color: #111827;
        }
        .ap-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }
        .ap-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .ap-bar-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 8px;
        }
        .ap-bar-lbl {
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
        }
        .ap-bar-val {
          font-size: 12px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .ap-track {
          height: 7px;
          background: #e2e8f0;
          border-radius: 999px;
          overflow: hidden;
        }
        .ap-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.7s cubic-bezier(.4,0,.2,1);
        }
        .ap-plan-dates {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 16px;
        }
        .ap-date-box {
          border-radius: 12px;
          background: #f8fafc;
          border: 1px solid #eef2f7;
          padding: 11px;
        }
        .ap-date-label {
          color: #94a3b8;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 800;
          margin-bottom: 5px;
        }
        .ap-date-value {
          color: #0f172a;
          font-size: 12.5px;
          font-weight: 800;
        }

        .ap-kpi-row {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }
        .ap-kpi {
          position: relative;
          overflow: hidden;
          background: #fff;
          border: 1px solid #e6edf5;
          border-radius: 14px;
          padding: 18px;
          min-height: 126px;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.07);
          transition: box-shadow 0.16s, transform 0.16s;
        }
        .ap-kpi:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.11);
        }
        .ap-kpi-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 18px;
        }
        .ap-kpi-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }
        .ap-kpi-value {
          font-family: 'Sora', sans-serif;
          font-size: 32px;
          font-weight: 800;
          line-height: 1;
          letter-spacing: 0;
          color: #0f172a;
        }
        .ap-kpi-label {
          font-size: 12px;
          font-weight: 800;
          color: #334155;
          margin-bottom: 5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ap-kpi-sub {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ap-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 330px;
          gap: 18px;
          align-items: start;
        }
        .ap-left,
        .ap-right {
          display: flex;
          flex-direction: column;
          gap: 18px;
          min-width: 0;
        }
        .ap-card {
          background: #fff;
          border: 1px solid #e6edf5;
          border-radius: 16px;
          padding: 22px;
          box-shadow: 0 14px 36px rgba(15, 23, 42, 0.07);
        }
        .ap-section {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
        }
        .ap-section::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #eef2f7;
        }
        .ap-overview-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .ap-overview-cell {
          border: 1px solid #eef2f7;
          border-radius: 12px;
          background: linear-gradient(180deg, #ffffff, #f8fafc);
          padding: 14px;
        }
        .ap-overview-label {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #94a3b8;
          margin-bottom: 7px;
        }
        .ap-overview-value {
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
          overflow-wrap: anywhere;
        }
        .ap-groups {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .ap-group-name {
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #cbd5e1;
          margin-bottom: 9px;
        }
        .ap-feat-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px 14px;
        }
        .ap-feat {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          border: 1px solid #eef2f7;
          border-radius: 10px;
          padding: 9px 10px;
          background: #f8fafc;
          color: #94a3b8;
          font-size: 12px;
          font-weight: 700;
        }
        .ap-feat--on {
          background: #f8fbff;
          border-color: #dbeafe;
          color: #1e293b;
        }
        .ap-feat-lbl {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ap-module-pill {
          margin-left: auto;
          font-size: 11px;
          font-weight: 800;
          color: #2563eb;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 999px;
          padding: 4px 10px;
          letter-spacing: normal;
          text-transform: none;
          white-space: nowrap;
        }

        .ap-detail-row,
        .ap-capacity-item {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 12px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .ap-detail-row:last-child,
        .ap-capacity-item:last-child {
          border-bottom: none;
        }
        .ap-detail-icon,
        .ap-capacity-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          background: #f8fafc;
        }
        .ap-detail-body {
          min-width: 0;
          flex: 1;
        }
        .ap-detail-label {
          font-size: 10.5px;
          color: #94a3b8;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 3px;
        }
        .ap-detail-val {
          font-size: 12.5px;
          font-weight: 700;
          color: #0f172a;
          overflow-wrap: anywhere;
        }
        .ap-detail-val--mono {
          font-family: 'Courier New', monospace;
          font-size: 11.5px;
          color: #334155;
        }
        .ap-empty {
          font-size: 12px;
          color: #94a3b8;
          text-align: center;
          padding: 16px 0 8px;
        }
        .ap-capacity-body {
          min-width: 0;
          flex: 1;
        }
        .ap-capacity-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
        }
        .ap-capacity-label {
          color: #334155;
          font-size: 12px;
          font-weight: 800;
        }
        .ap-capacity-count {
          color: #0f172a;
          font-size: 11.5px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .ap-capacity-note {
          margin-top: 5px;
          color: #94a3b8;
          font-size: 10.5px;
          font-weight: 700;
        }

        .smtp-grid-host { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; }
        .smtp-grid-auth { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .smtp-grid-sender { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; border-top: 1px dashed #e5e7eb; padding-top: 16px; }
        .smtp-test-row { display: flex; gap: 10px; }

        @media (max-width: 980px) {
          .ap-hero-inner,
          .ap-main-grid {
            grid-template-columns: 1fr;
          }
          .ap-kpi-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 680px) {
          .ap-hero {
            padding: 20px;
          }
          .ap-admin {
            align-items: flex-start;
            flex-direction: column;
          }
          .ap-avatar-wrap {
            width: 104px;
            height: 104px;
            border-radius: 24px;
          }
          .ap-avatar {
            border-radius: 20px;
          }
          .ap-plan-dates,
          .ap-overview-grid,
          .ap-feat-grid {
            grid-template-columns: 1fr;
          }
          .ap-card {
            padding: 18px;
          }
          .smtp-grid-host,
          .smtp-grid-auth,
          .smtp-grid-sender {
            grid-template-columns: 1fr;
          }
          .smtp-test-row {
            flex-direction: column;
          }
        }
        @media (max-width: 480px) {
          .ap-kpi-row {
            grid-template-columns: 1fr;
          }
          .ap-name {
            font-size: 30px;
          }
          .ap-chip {
            width: 100%;
          }
        }
      `}</style>

      <section className="ap-hero">
        <div className="ap-hero-inner">
          <div className="ap-admin">
            <div className="ap-avatar-wrap">
              <div className="ap-avatar">
                {avatarUrl ? <img src={avatarUrl} alt={adminName} /> : initialsFor(adminName)}
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="ap-eyebrow">
                <Crown size={13} strokeWidth={2.4} />
                Tenant Admin
              </div>
              <h1 className="ap-name">{adminName}</h1>
              <div className="ap-role">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                  <ShieldCheck size={15} color="#2563eb" strokeWidth={2.3} />
                  {adminRole}
                </span>
                {orgName && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                    <Building2 size={15} color="#0f766e" strokeWidth={2.3} />
                    {orgName}
                  </span>
                )}
              </div>
              <div className="ap-contact-row">
                {profile.email && (
                  <div className="ap-chip">
                    <Mail size={14} color="#2563eb" strokeWidth={2.2} />
                    {profile.email}
                  </div>
                )}
                {profile.phone && (
                  <div className="ap-chip">
                    <Phone size={14} color="#0f766e" strokeWidth={2.2} />
                    {profile.phone}
                  </div>
                )}
                <div className="ap-chip">
                  <BadgeCheck size={14} color={statusMeta.color} strokeWidth={2.2} />
                  {statusMeta.label} workspace
                </div>
              </div>
            </div>
          </div>

          <aside className="ap-hero-panel">
            <div className="ap-plan-mini">
              <div>
                <div className="ap-plan-label">Current Plan</div>
                <div className="ap-plan-name">{planName}</div>
              </div>
              <div className="ap-status-badge" style={{ background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.border}` }}>
                <div className="ap-status-dot" style={{ background: statusMeta.dot }} />
                {statusMeta.label}
              </div>
            </div>
            {remaining !== null && (
              <>
                <div className="ap-bar-row">
                  <span className="ap-bar-lbl">Subscription Timeline</span>
                  <span className="ap-bar-val" style={{ color: daysColor }}>
                    {remaining > 0 ? `${remaining} days left` : remaining === 0 ? "Last day" : "Expired"}
                  </span>
                </div>
                <div className="ap-track">
                  <div className="ap-fill" style={{ width: `${daysBarPct}%`, background: `linear-gradient(90deg, ${daysColor}66, ${daysColor})` }} />
                </div>
              </>
            )}
            <div className="ap-plan-dates">
              <div className="ap-date-box">
                <div className="ap-date-label">Started</div>
                <div className="ap-date-value">{fmtDate(org.createdAt)}</div>
              </div>
              <div className="ap-date-box">
                <div className="ap-date-label">Expires</div>
                <div className="ap-date-value">{fmtDate(expiryDate)}</div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <div className="ap-kpi-row">
        {kpiTiles.map(({ label, value, sub, color, Icon }) => (
          <div key={label} className="ap-kpi">
            <div className="ap-kpi-top">
              <div className="ap-kpi-icon" style={{ background: `${color}14` }}>
                <Icon size={18} color={color} strokeWidth={2.3} />
              </div>
              <Sparkles size={16} color={color} strokeWidth={2.1} style={{ opacity: 0.7 }} />
            </div>
            <div className="ap-kpi-value">{value}</div>
            <div className="ap-kpi-label">{label}</div>
            <div className="ap-kpi-sub">{sub}</div>
          </div>
        ))}
      </div>

      <div className="ap-main-grid">
        <div className="ap-left">
          {(featureCatalog || []).length > 0 && (
            <div className="ap-card">
              <div className="ap-section" style={{ marginBottom: 0 }}>
                Module Access
                <span className="ap-module-pill">{enabledCount} of {allCatalog.length} active</span>
              </div>
              <div style={{ marginTop: 18 }} className="ap-groups">
                {(featureCatalog || []).map((group) => (
                  <div key={group.group}>
                    <div className="ap-group-name">{group.group}</div>
                    <div className="ap-feat-grid">
                      {group.features.map((f) => {
                        const on = enabledFeatures.includes(f.key);
                        return (
                          <div key={f.key} className={`ap-feat${on ? " ap-feat--on" : ""}`}>
                            {on
                              ? <CheckCircle2 size={13} strokeWidth={2.4} color="#2563eb" style={{ flexShrink: 0 }} />
                              : <Lock size={12} strokeWidth={2.1} color="#cbd5e1" style={{ flexShrink: 0 }} />
                            }
                            <span className="ap-feat-lbl">{f.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="ap-right">
          <div className="ap-card">
            <div className="ap-section">Admin Details</div>
            {accountRows.length > 0 ? (
              <div>
                {accountRows.map(({ Icon, label, value, mono }) => (
                  <div key={label} className="ap-detail-row">
                    <div className="ap-detail-icon">
                      <Icon size={14} strokeWidth={2.2} color="#475569" />
                    </div>
                    <div className="ap-detail-body">
                      <div className="ap-detail-label">{label}</div>
                      <div className={`ap-detail-val${mono ? " ap-detail-val--mono" : ""}`}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ap-empty">No additional admin details available.</div>
            )}
          </div>

          <div className="ap-card">
            <div className="ap-section">Workspace Capacity</div>
            <div>
              {capacityRows.map(({ label, Icon, used, max, unit, color }) => {
                const hasLimit = max !== null && max > 0;
                const pct = hasLimit ? Math.min(100, Math.round((used / max) * 100)) : 0;
                const over = hasLimit && used >= max;
                const warn = hasLimit && pct >= 80 && !over;
                const bColor = over ? "#dc2626" : warn ? "#d97706" : color;
                const cnt = `${used}${unit ? " " + unit : ""}${hasLimit ? " / " + max + (unit ? " " + unit : "") : ""}`;
                return (
                  <div key={label} className="ap-capacity-item">
                    <div className="ap-capacity-icon" style={{ background: `${color}12` }}>
                      <Icon size={14} strokeWidth={2.2} color={color} />
                    </div>
                    <div className="ap-capacity-body">
                      <div className="ap-capacity-top">
                        <span className="ap-capacity-label">{label}</span>
                        <span className="ap-capacity-count" style={{ color: over ? "#dc2626" : undefined }}>{cnt}</span>
                      </div>
                      <div className="ap-track">
                        {hasLimit
                          ? <div className="ap-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${bColor}66, ${bColor})` }} />
                          : <div className="ap-fill" style={{ width: "42%", background: `linear-gradient(90deg, ${color}55, ${color})` }} />
                        }
                      </div>
                      <div className="ap-capacity-note" style={{ color: over ? "#dc2626" : warn ? "#d97706" : undefined }}>
                        {!hasLimit ? "Unlimited" : over ? "Limit reached" : warn ? `${pct}% used, nearing limit` : `${pct}% used`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="ap-card">
        <div className="ap-section" style={{ marginBottom: 0 }}>Email Configuration</div>
        <div style={{ marginTop: 22 }}>
          <EmailSettingsSection />
        </div>
      </div>

      {/* ── AI Configuration ─────────────────────────────────────────────── */}
      <div className="ap-card">
        <div className="ap-section" style={{ marginBottom: 0 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 20, height: 20, borderRadius: 6, background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", display: "inline-grid", placeItems: "center" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 6a6 6 0 0 1 6 6"/><circle cx="12" cy="12" r="2"/></svg>
            </span>
            AI Assistant Configuration
          </span>
        </div>
        <div style={{ marginTop: 22 }}>
          <AiSettingsSection />
        </div>
      </div>
    </div>
  );
}
