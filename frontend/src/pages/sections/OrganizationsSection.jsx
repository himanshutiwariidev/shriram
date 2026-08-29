import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Building2, Eye, PauseCircle, PlayCircle, Search, Trash2, Users } from "lucide-react";
import { IconBtn, T } from "./shared";
import OrganizationProfileCard from "../../components/OrganizationProfileCard";

const STATUS_META = {
  active: { label: "Active", color: T.green, bg: T.greenBg, border: T.greenBorder },
  trial: { label: "Trial", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  suspended: { label: "Suspended", color: T.red, bg: T.redBg, border: T.redBorder },
  expired: { label: "Expired", color: T.textMuted, bg: T.borderLight, border: T.border },
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");

export default function OrganizationsSection({ organizations = [], loading, handleSuspend, handleActivate, setDeleteOrg }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter((org) => org.name?.toLowerCase().includes(q) || org.slug?.toLowerCase().includes(q));
  }, [organizations, search]);

  return (
    <div className="fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 14 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>Organizations</h2>
          <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>{organizations.length} tenant{organizations.length !== 1 ? "s" : ""} on the platform</p>
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: 20, maxWidth: 360 }}>
        <Search size={15} strokeWidth={2} color={T.textMuted} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input
          className="inp"
          placeholder="Search organizations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px 10px 38px", background: T.inputBg, border: `1.5px solid ${T.inputBorder}`, borderRadius: 10, color: T.textPrimary, fontSize: 13.5, outline: "none", fontFamily: "inherit" }}
        />
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: T.textMuted }}>Loading organizations…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <Building2 size={48} strokeWidth={1} color={T.textMuted} style={{ margin: "0 auto 16px", display: "block" }} />
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, color: T.textSecondary }}>No organizations match your search</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((org, i) => {
            const meta = STATUS_META[org.status] || STATUS_META.trial;
            const isSuspended = org.status === "suspended";
            return (
              <div key={org._id} className="card card-in" style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: "18px 20px", animationDelay: `${i * 35}ms`, display: "flex", alignItems: "flex-start", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
                <div style={{ width: 3, borderRadius: 99, background: meta.color, alignSelf: "stretch", marginRight: 16, flexShrink: 0, minHeight: 52 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <OrganizationProfileCard compact organization={org} owner={org.createdBy} />
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12, color: T.textMuted, alignItems: "center", marginTop: 10 }}>
                    <span>/{org.slug}</span>
                    {org.trialEndsAt && <span>Trial ends {fmtDate(org.trialEndsAt)}</span>}
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Users size={12} strokeWidth={1.8} />{org.usage?.users ?? 0} users</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Building2 size={12} strokeWidth={1.8} />{org.usage?.clients ?? 0} clients</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Briefcase size={12} strokeWidth={1.8} />{org.usage?.projects ?? 0} projects</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 14, flexShrink: 0 }}>
                  <IconBtn icon={Eye} color={T.brand} bg={T.brandLight} hoverBg={T.brandMid} onClick={() => navigate(`/superadmin/organizations/${org._id}`)} title="View / Edit tenant" />
                  {isSuspended ? (
                    <IconBtn icon={PlayCircle} color={T.green} bg={T.greenBg} hoverBg={T.greenBorder} onClick={() => handleActivate(org)} title="Activate organization" />
                  ) : (
                    <IconBtn icon={PauseCircle} color="#d97706" bg="#fffbeb" hoverBg="#fde68a" onClick={() => handleSuspend(org)} title="Suspend organization" />
                  )}
                  <IconBtn icon={Trash2} color={T.red} bg={T.redBg} hoverBg={T.redBorder} onClick={() => setDeleteOrg(org)} title="Delete organization" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
