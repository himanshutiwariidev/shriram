import React from "react";
import { Activity, Briefcase, Calendar, KeyRound, Plus, Save, Trash2 } from "lucide-react";
import { FieldIcon, FormField, PROJECT_TAB_FIELDS, PROJECT_TABS, baseInp } from "./shared";
import useTenantTheme from "../../hooks/useTenantTheme";

export default function CreateProjectSection({
  projectForm,
  setProjectForm,
  handleCreateProject,
  cancelProjectForm,
  projectFormTab,
  setProjectFormTab,
  isEditing = false,
}) {
  const { T } = useTenantTheme();
  const activeTab = projectFormTab || projectForm.projectCategory || "allProjects";
  const fields = PROJECT_TAB_FIELDS[activeTab] || PROJECT_TAB_FIELDS.allProjects;
  const updateProjectFormTab = (tabId) => {
    setProjectFormTab(tabId);
    setProjectForm({
      ...projectForm,
      projectCategory: tabId,
      credentials: projectForm.credentials?.length ? projectForm.credentials : [{ credentialType: "", userId: "", password: "" }],
    });
  };
  const credentialRows = projectForm.credentials?.length ? projectForm.credentials : [{ credentialType: "", userId: "", password: "" }];
  const updateCredential = (index, key, value) => {
    const nextCredentials = credentialRows.map((credential, i) => (
      i === index ? { ...credential, [key]: value } : credential
    ));
    setProjectForm({ ...projectForm, credentials: nextCredentials });
  };
  const addCredential = () => {
    setProjectForm({
      ...projectForm,
      credentials: [...credentialRows, { credentialType: "", userId: "", password: "" }],
    });
  };
  const removeCredential = (index) => {
    const nextCredentials = credentialRows.filter((_, i) => i !== index);
    setProjectForm({
      ...projectForm,
      credentials: nextCredentials.length ? nextCredentials : [{ credentialType: "", userId: "", password: "" }],
    });
  };
  const iconForField = (field) => {
    if (field.key === "password" || field.key === "userId" || field.key === "credentialType") return KeyRound;
    if (field.type === "date") return Calendar;
    if (field.key === "status") return Activity;
    return Briefcase;
  };

  return (
    <div className="fade-up" style={{ maxWidth: 980 }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {PROJECT_TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => updateProjectFormTab(tab.id)}
                style={{
                  padding: "9px 14px",
                  borderRadius: 9,
                  border: `1.5px solid ${isActive ? T.brandMid : T.border}`,
                  background: isActive ? T.brandLight : "#fff",
                  color: isActive ? T.brand : T.textSecondary,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: T.textPrimary }}>{isEditing ? "Update Project Information" : "Add Project Information"}</h2>
        <p style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>{isEditing ? "Update project, domain, hosting and credential details." : "Save project, domain, hosting and credential details."}</p>
      </div>
      <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: "30px", boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
        <form onSubmit={handleCreateProject}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16, marginBottom: 16 }}>
            {fields.map((field) => (
              <FormField key={field.key} label={field.label} span2={field.key === "companyName"}>
                <div style={{ position: "relative" }}>
                  <FieldIcon icon={iconForField(field)} />
                  {field.type === "select" ? (
                    <select
                      className="inp"
                      style={{ ...baseInp, appearance: "none" }}
                      value={projectForm[field.key]}
                      onChange={e => setProjectForm({ ...projectForm, [field.key]: e.target.value })}
                      required={field.required}
                    >
                      <option value="">{field.placeholder || `Select ${field.label}`}</option>
                      {field.options.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="inp"
                      style={baseInp}
                      type={field.type}
                      placeholder={field.placeholder}
                      value={projectForm[field.key]}
                      onChange={e => setProjectForm({ ...projectForm, [field.key]: e.target.value })}
                      required={field.required}
                    />
                  )}
                </div>
              </FormField>
            ))}
            {activeTab === "allProjects" && (
              <FormField label="Status">
                <div style={{ position: "relative" }}>
                  <FieldIcon icon={Activity} />
                  <select className="inp" style={{ ...baseInp, appearance: "none" }} value={projectForm.status} onChange={e => setProjectForm({ ...projectForm, status: e.target.value })}>
                    <option value="Active">Active</option>
                    <option value="In-Active">In-Active</option>
                  </select>
                </div>
              </FormField>
            )}
            {activeTab === "credentials" && (
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 700, color: T.textSecondary, letterSpacing: ".06em", textTransform: "uppercase" }}>Credentials</label>
                  <button
                    type="button"
                    onClick={addCredential}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 9, border: `1.5px solid ${T.brandMid}`, background: T.brandLight, color: T.brand, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    <Plus size={14} strokeWidth={2.4} /> Add Credential
                  </button>
                </div>
                {credentialRows.map((credential, index) => (
                  <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end", padding: 14, borderRadius: 12, border: `1px solid ${T.border}`, background: T.bg }}>
                    <FormField label="Credentials Type">
                      <div style={{ position: "relative" }}>
                        <FieldIcon icon={KeyRound} />
                        <input className="inp" style={baseInp} type="text" placeholder="Admin / Hosting / Domain" value={credential.credentialType || ""} onChange={e => updateCredential(index, "credentialType", e.target.value)} />
                      </div>
                    </FormField>
                    <FormField label="ID">
                      <div style={{ position: "relative" }}>
                        <FieldIcon icon={KeyRound} />
                        <input className="inp" style={baseInp} type="text" placeholder="Login username or email" value={credential.userId || ""} onChange={e => updateCredential(index, "userId", e.target.value)} />
                      </div>
                    </FormField>
                    <FormField label="Password">
                      <div style={{ position: "relative" }}>
                        <FieldIcon icon={KeyRound} />
                        <input className="inp" style={baseInp} type="text" placeholder="Credential password" value={credential.password || ""} onChange={e => updateCredential(index, "password", e.target.value)} />
                      </div>
                    </FormField>
                    <button
                      type="button"
                      onClick={() => removeCredential(index)}
                      disabled={credentialRows.length === 1}
                      title="Remove credential"
                      style={{ width: 40, height: 40, borderRadius: 10, border: `1.5px solid ${credentialRows.length === 1 ? T.slateBorder : T.redBorder}`, background: credentialRows.length === 1 ? T.slateBg : T.redBg, color: credentialRows.length === 1 ? T.textMuted : T.red, display: "grid", placeItems: "center", cursor: credentialRows.length === 1 ? "not-allowed" : "pointer" }}
                    >
                      <Trash2 size={15} strokeWidth={2.2} />
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={cancelProjectForm} style={{ padding: "10px 18px", borderRadius: 9, border: `1.5px solid ${T.border}`, background: "#fff", color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button className="pri-btn" type="submit" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: `linear-gradient(135deg, ${T.brand}, ${T.brandDark})`, color: "#fff", borderRadius: 11, padding: "11px 20px", fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", letterSpacing: ".03em" }}>
              <Save size={16} strokeWidth={2.5} /> {isEditing ? "Update Project" : "Save Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
