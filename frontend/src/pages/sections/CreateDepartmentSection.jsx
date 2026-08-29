import React from "react";
import { Building2, Layers } from "lucide-react";
import { FieldIcon, FormField, baseInp, baseInpNoIcon } from "./shared";
import useTenantTheme from "../../hooks/useTenantTheme";

export default function CreateDepartmentSection({ departmentForm, setDepartmentForm, handleCreateDepartment, branches = [] }) {
  const { T } = useTenantTheme();
  return (
    <div className="fade-up" style={{ maxWidth: 620 }}>
      <div style={{ marginBottom: 26 }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: T.textPrimary }}>Add New Department</h2>
        <p style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>Organize employees into a department</p>
      </div>
      <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: "30px", boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
        <form onSubmit={handleCreateDepartment}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <FormField label="Department Name" span2>
              <div style={{ position: "relative" }}><FieldIcon icon={Layers} /><input className="inp" style={baseInp} type="text" placeholder="Development" value={departmentForm.name} onChange={e => setDepartmentForm({ ...departmentForm, name: e.target.value })} required /></div>
            </FormField>
            <FormField label="Branch">
              <div style={{ position: "relative" }}>
                <FieldIcon icon={Building2} />
                <select className="inp" style={{ ...baseInp, appearance: "none" }} value={departmentForm.branch} onChange={e => setDepartmentForm({ ...departmentForm, branch: e.target.value })}>
                  <option value="">No specific branch</option>
                  {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>
            </FormField>
            <FormField label="Description" span2>
              <textarea className="inp" style={{ ...baseInpNoIcon, minHeight: 80 }} placeholder="Optional description…" value={departmentForm.description} onChange={e => setDepartmentForm({ ...departmentForm, description: e.target.value })} />
            </FormField>
          </div>
          <button className="pri-btn" type="submit" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: `linear-gradient(135deg, ${T.brand}, ${T.brandDark})`, color: "#fff", borderRadius: 11, padding: "13px", fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", letterSpacing: ".03em" }}>
            <Layers size={16} strokeWidth={2} /> Create Department
          </button>
        </form>
      </div>
    </div>
  );
}
