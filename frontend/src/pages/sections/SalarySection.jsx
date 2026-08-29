import React from "react";
import { Briefcase } from "lucide-react";
import useTenantTheme from "../../hooks/useTenantTheme";

export default function SalarySection({ users, openPaySalary }) {
  const { T } = useTenantTheme();
  const employees = users.filter(u => u.role === "user");

  return (
    <div className="fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>Salary Management</h2>
          <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>Send automated salary slips to employee email addresses.</p>
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: T.brand, background: T.brandLight, border: `1px solid ${T.brandMid}`, borderRadius: 999, padding: "8px 12px" }}>
          {employees.length} employee{employees.length !== 1 ? "s" : ""}
        </div>
      </div>

      {employees.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <Briefcase size={48} strokeWidth={1} color={T.textMuted} style={{ margin: "0 auto 16px", display: "block" }} />
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, color: T.textSecondary }}>No employees available</p>
          <p style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>Create a user account first to start sending salary slips.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {employees.map((user, i) => {
            const initials = user.name ? user.name.trim().split(/\s+/).map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??";
            return (
              <div key={user._id} className="card card-in" style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: "22px", animationDelay: `${i * 35}ms`, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 18 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #fb923c, #f59e0b)", display: "grid", placeItems: "center", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: "#fff", boxShadow: "0 4px 14px rgba(245,158,11,.28)" }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 15, color: T.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
                  </div>
                </div>

                <button className="pri-btn" onClick={() => openPaySalary(user)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 14px", borderRadius: 11, background: `linear-gradient(135deg, ${T.brand}, ${T.brandDark})`, color: "#fff", fontSize: 13.5, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>
                  <Briefcase size={15} strokeWidth={2} /> Pay Salary
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
