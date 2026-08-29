import React from "react";
import { Building2, Clock, MapPin, Phone, User } from "lucide-react";
import { FieldIcon, FormField, baseInp } from "./shared";
import useTenantTheme from "../../hooks/useTenantTheme";

export default function CreateBranchSection({ branchForm, setBranchForm, handleCreateBranch, users = [] }) {
  const { T } = useTenantTheme();
  return (
    <div className="fade-up" style={{ maxWidth: 620 }}>
      <div style={{ marginBottom: 26 }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: T.textPrimary }}>Add New Branch</h2>
        <p style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>Set up a new office location for this organization</p>
      </div>
      <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: "30px", boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
        <form onSubmit={handleCreateBranch}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <FormField label="Branch Name" span2>
              <div style={{ position: "relative" }}><FieldIcon icon={Building2} /><input className="inp" style={baseInp} type="text" placeholder="Delhi Office" value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} required /></div>
            </FormField>
            <FormField label="Address" span2>
              <div style={{ position: "relative" }}><FieldIcon icon={MapPin} /><input className="inp" style={baseInp} type="text" placeholder="Street, city" value={branchForm.address} onChange={e => setBranchForm({ ...branchForm, address: e.target.value })} /></div>
            </FormField>
            <FormField label="Manager">
              <div style={{ position: "relative" }}>
                <FieldIcon icon={User} />
                <select className="inp" style={{ ...baseInp, appearance: "none" }} value={branchForm.manager} onChange={e => setBranchForm({ ...branchForm, manager: e.target.value })}>
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </div>
            </FormField>
            <FormField label="Phone">
              <div style={{ position: "relative" }}><FieldIcon icon={Phone} /><input className="inp" style={baseInp} type="text" placeholder="Contact number" value={branchForm.phone} onChange={e => setBranchForm({ ...branchForm, phone: e.target.value })} /></div>
            </FormField>
            <FormField label="Working Hours">
              <div style={{ position: "relative" }}><FieldIcon icon={Clock} /><input className="inp" style={baseInp} type="text" placeholder="9:00 AM - 6:00 PM" value={branchForm.workingHours} onChange={e => setBranchForm({ ...branchForm, workingHours: e.target.value })} /></div>
            </FormField>
            <FormField label="Status">
              <div style={{ position: "relative" }}>
                <FieldIcon icon={Building2} />
                <select className="inp" style={{ ...baseInp, appearance: "none" }} value={branchForm.status} onChange={e => setBranchForm({ ...branchForm, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </FormField>
          </div>
          <button className="pri-btn" type="submit" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: `linear-gradient(135deg, ${T.brand}, ${T.brandDark})`, color: "#fff", borderRadius: 11, padding: "13px", fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", letterSpacing: ".03em" }}>
            <Building2 size={16} strokeWidth={2} /> Create Branch
          </button>
        </form>
      </div>
    </div>
  );
}
