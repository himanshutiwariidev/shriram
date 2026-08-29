import React from "react";
import { Building2, Clock, MapPin, Pencil, Phone, Plus, Trash2, User } from "lucide-react";
import { IconBtn } from "./shared";
import useTenantTheme from "../../hooks/useTenantTheme";

export default function BranchesSection({ branches = [], setTab, openEditBranch, setDeleteBranch }) {
  const { T } = useTenantTheme();
  return (
    <div className="fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>Branches</h2>
          <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>{branches.length} branch{branches.length !== 1 ? "es" : ""} total</p>
        </div>
        <button className="pri-btn" onClick={() => setTab("createBranch")} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: `linear-gradient(135deg, ${T.brand}, ${T.brandDark})`, color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
          <Plus size={15} strokeWidth={2.5} /> New Branch
        </button>
      </div>

      {branches.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <Building2 size={48} strokeWidth={1} color={T.textMuted} style={{ margin: "0 auto 16px", display: "block" }} />
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, color: T.textSecondary }}>No branches yet</p>
          <p style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>Create your first branch to get started</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {branches.map((branch, i) => {
            const isActive = branch.status !== "inactive";
            return (
              <div key={branch._id} className="card card-in" style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: "18px 20px", animationDelay: `${i * 35}ms`, display: "flex", alignItems: "flex-start", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
                <div style={{ width: 3, borderRadius: 99, background: isActive ? T.green : T.textMuted, alignSelf: "stretch", marginRight: 16, flexShrink: 0, minHeight: 52 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 8 }}>
                    <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14.5, color: T.textPrimary }}>{branch.name}</h3>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 5, color: isActive ? T.green : T.textMuted, background: isActive ? T.greenBg : T.borderLight, border: `1px solid ${isActive ? T.greenBorder : T.border}`, letterSpacing: ".07em", textTransform: "uppercase" }}>
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12, color: T.textMuted, alignItems: "center" }}>
                    {branch.address && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><MapPin size={12} strokeWidth={1.8} />{branch.address}</span>}
                    {branch.manager?.name && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><User size={12} strokeWidth={1.8} />{branch.manager.name}</span>}
                    {branch.phone && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Phone size={12} strokeWidth={1.8} />{branch.phone}</span>}
                    {branch.workingHours && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Clock size={12} strokeWidth={1.8} />{branch.workingHours}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 14, flexShrink: 0 }}>
                  <IconBtn icon={Pencil} color={T.brand} bg={T.brandLight} hoverBg={T.brandMid} onClick={() => openEditBranch(branch)} title="Edit branch" />
                  <IconBtn icon={Trash2} color={T.red} bg={T.redBg} hoverBg={T.redBorder} onClick={() => setDeleteBranch(branch)} title="Delete branch" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
