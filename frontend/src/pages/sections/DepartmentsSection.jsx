import React from "react";
import { Building2, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { IconBtn } from "./shared";
import useTenantTheme from "../../hooks/useTenantTheme";

export default function DepartmentsSection({ departments = [], setTab, openEditDepartment, setDeleteDepartment }) {
  const { T } = useTenantTheme();
  return (
    <div className="fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>Departments</h2>
          <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>{departments.length} department{departments.length !== 1 ? "s" : ""} total</p>
        </div>
        <button className="pri-btn" onClick={() => setTab("createDepartment")} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: `linear-gradient(135deg, ${T.brand}, ${T.brandDark})`, color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
          <Plus size={15} strokeWidth={2.5} /> New Department
        </button>
      </div>

      {departments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <Layers size={48} strokeWidth={1} color={T.textMuted} style={{ margin: "0 auto 16px", display: "block" }} />
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, color: T.textSecondary }}>No departments yet</p>
          <p style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>Create your first department to get started</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {departments.map((department, i) => (
            <div key={department._id} className="card card-in" style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: "18px 20px", animationDelay: `${i * 35}ms`, display: "flex", alignItems: "flex-start", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
              <div style={{ width: 3, borderRadius: 99, background: T.brand, alignSelf: "stretch", marginRight: 16, flexShrink: 0, minHeight: 44 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14.5, color: T.textPrimary, marginBottom: department.description || department.branch?.name ? 8 : 0 }}>{department.name}</h3>
                {department.description && <p style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.65, marginBottom: department.branch?.name ? 8 : 0 }}>{department.description}</p>}
                {department.branch?.name && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: T.textMuted, width: "fit-content" }}>
                    <Building2 size={12} strokeWidth={1.8} />{department.branch.name}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 14, flexShrink: 0 }}>
                <IconBtn icon={Pencil} color={T.brand} bg={T.brandLight} hoverBg={T.brandMid} onClick={() => openEditDepartment(department)} title="Edit department" />
                <IconBtn icon={Trash2} color={T.red} bg={T.redBg} hoverBg={T.redBorder} onClick={() => setDeleteDepartment(department)} title="Delete department" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
