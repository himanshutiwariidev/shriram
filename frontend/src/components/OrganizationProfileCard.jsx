import React from "react";
import { Building2, Calendar, HardDrive, Mail, Phone, Users } from "lucide-react";
import TenantLogo from "./TenantLogo";
import { resolveFileUrl } from "../utils/fileUrl";
import { T } from "../pages/sections/shared";

const STATUS_META = {
  active: { label: "Active", color: T.green, bg: T.greenBg },
  trial: { label: "Trial", color: "#d97706", bg: "#fffbeb" },
  suspended: { label: "Suspended", color: T.red, bg: T.redBg },
  expired: { label: "Expired", color: T.textMuted, bg: T.borderLight },
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");

function OwnerAvatar({ owner, size = 32 }) {
  const photoUrl = owner?.profileImage ? resolveFileUrl(owner.profileImage) : null;
  if (photoUrl) {
    return <img src={photoUrl} alt={owner?.name || "Owner"} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: `1px solid ${T.border}`, flexShrink: 0 }} />;
  }
  const initials = (owner?.name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: T.borderLight, display: "grid", placeItems: "center", flexShrink: 0, color: T.textSecondary, fontWeight: 700, fontSize: size * 0.4 }}>
      {initials}
    </div>
  );
}

// Reusable, props-driven — no data fetching of its own. Used in compact form
// inside OrganizationsSection.jsx's list card (logo/owner/status only, the
// suspend/activate/delete actions stay in the caller) and in full form on
// TenantDetailPage's Overview tab and the tenant-side Organization Profile
// section.
export default function OrganizationProfileCard({ organization, owner, usage, limits, compact = false, showPlanMeta = true }) {
  if (!organization) return null;
  const meta = STATUS_META[organization.status] || STATUS_META.trial;

  if (compact) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <TenantLogo logoUrl={organization.logoUrl ? resolveFileUrl(organization.logoUrl) : null} name={organization.name} primaryColor={organization.primaryColor} size={38} />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14.5, color: T.textPrimary }}>{organization.name}</h3>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 5, color: meta.color, background: meta.bg, letterSpacing: ".07em", textTransform: "uppercase" }}>{meta.label}</span>
          </div>
          {owner && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, fontSize: 12, color: T.textMuted }}>
              <OwnerAvatar owner={owner} size={16} />
              <span>{owner.name || "No owner set"}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const usageRows = [
    { label: "Users", value: usage?.users, limit: limits?.maxUsers },
    { label: "Branches", value: usage?.branches, limit: limits?.maxBranches },
    { label: "Projects", value: usage?.projects, limit: limits?.maxProjects },
    { label: "Storage (MB)", value: usage?.storageMB, limit: limits?.maxStorageMB },
  ].filter((row) => row.value !== undefined);

  return (
    <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: 28 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <TenantLogo logoUrl={organization.logoUrl ? resolveFileUrl(organization.logoUrl) : null} name={organization.name} primaryColor={organization.primaryColor} size={52} />
          <div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>{organization.name}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: "4px 10px", borderRadius: 20, color: meta.color, background: meta.bg, letterSpacing: ".06em", textTransform: "uppercase" }}>{meta.label}</span>
              {showPlanMeta && organization.planName && <span style={{ fontSize: 12, color: T.textMuted, textTransform: "capitalize" }}>{organization.planName} plan</span>}
            </div>
          </div>
        </div>
        {showPlanMeta ? (
          <div style={{ textAlign: "right", fontSize: 12, color: T.textMuted }}>
            {organization.trialEndsAt && <div>Trial ends {fmtDate(organization.trialEndsAt)}</div>}
            {organization.subscriptionExpiresAt && <div style={{ marginTop: 3 }}>Expires {fmtDate(organization.subscriptionExpiresAt)}</div>}
            {organization.createdAt && <div style={{ marginTop: 3, display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end" }}><Calendar size={11} strokeWidth={1.8} /> Created {fmtDate(organization.createdAt)}</div>}
          </div>
        ) : organization.createdAt && (
          <div style={{ textAlign: "right", fontSize: 12, color: T.textMuted, display: "flex", alignItems: "center", gap: 5 }}><Calendar size={11} strokeWidth={1.8} /> Created {fmtDate(organization.createdAt)}</div>
        )}
      </div>

      {owner && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 0", borderTop: `1px solid ${T.borderLight}`, borderBottom: usageRows.length ? `1px solid ${T.borderLight}` : "none" }}>
          <OwnerAvatar owner={owner} size={44} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: T.textPrimary }}>{owner.name || "No owner set"}{owner.designation ? ` · ${owner.designation}` : ""}</div>
            <div style={{ display: "flex", gap: 14, marginTop: 4, fontSize: 12, color: T.textMuted, flexWrap: "wrap" }}>
              {owner.email && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Mail size={12} strokeWidth={1.8} />{owner.email}</span>}
              {owner.phone && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Phone size={12} strokeWidth={1.8} />{owner.phone}</span>}
              {owner.lastLogin && <span>Last login {fmtDate(owner.lastLogin)}</span>}
            </div>
          </div>
        </div>
      )}

      {usageRows.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${usageRows.length}, 1fr)`, gap: 14, marginTop: 18 }}>
          {usageRows.map((row) => (
            <div key={row.label} style={{ background: T.inputBg, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 10.5, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                {row.label === "Users" && <Users size={11} strokeWidth={1.8} />}
                {row.label === "Branches" && <Building2 size={11} strokeWidth={1.8} />}
                {row.label === "Storage (MB)" && <HardDrive size={11} strokeWidth={1.8} />}
                {row.label}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary, marginTop: 4 }}>
                {row.value ?? 0}{row.limit ? <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 500 }}> / {row.limit}</span> : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
