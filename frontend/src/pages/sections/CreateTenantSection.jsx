import React from "react";
import {
  Briefcase, Building2, Calendar, Eye, EyeOff, Globe,
  Hash, Image, Lock, Mail, MapPin, Phone, Trash2, UploadCloud, User, UserPlus,
} from "lucide-react";
import { FieldIcon, FormField, T, baseInp } from "./shared";
import FeatureAccessMatrix from "./FeatureAccessMatrix";

const SectionHeading = ({ children }) => (
  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: T.textPrimary, margin: "26px 0 14px", paddingTop: 20, borderTop: `1px solid ${T.borderLight}` }}>
    {children}
  </div>
);

// The organization (and its owner user) doesn't exist yet at this point, so
// neither the logo nor the owner photo can be uploaded until the tenant is
// created — this just stages the File locally (with a preview) and the hook
// uploads it right after creation succeeds. Shared by both the Company Logo
// and Owner Photo fields rather than duplicating near-identical pickers.
function PendingImagePicker({ file, setFile, chooseLabel, accept = ".png,.jpg,.jpeg,.svg,.webp", hint = "PNG, JPG, JPEG, SVG, or WEBP, up to 2MB.", round = false }) {
  const inputRef = React.useRef(null);
  const [previewUrl, setPreviewUrl] = React.useState(null);

  React.useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, borderRadius: 12, border: `1.5px dashed ${T.inputBorder}`, background: T.inputBg }}>
      {previewUrl ? (
        <img src={previewUrl} alt="Preview" style={{ width: 48, height: 48, borderRadius: round ? "50%" : 10, objectFit: "cover", background: "#fff", border: `1px solid ${T.border}` }} />
      ) : (
        <div style={{ width: 48, height: 48, borderRadius: round ? "50%" : 10, background: T.borderLight, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Image size={20} color={T.textMuted} strokeWidth={1.8} />
        </div>
      )}
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 12, color: T.textMuted, marginBottom: 8 }}>{hint}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => inputRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${T.inputBorder}`, background: "#fff", color: T.textSecondary, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <UploadCloud size={13} strokeWidth={2} /> {file ? "Replace" : chooseLabel}
          </button>
          {file && (
            <button type="button" onClick={() => setFile(null)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: `1.5px solid ${T.redBorder}`, background: T.redBg, color: T.red, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <Trash2 size={13} strokeWidth={2} /> Remove
            </button>
          )}
        </div>
      </div>
      <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); e.target.value = ""; }} />
    </div>
  );
}

export default function CreateTenantSection({ createTenantForm, setCreateTenantForm, handleCreateTenant, handlePlanChange, creatingTenant, featureCatalog, pendingLogoFile, setPendingLogoFile, pendingOwnerPhotoFile, setPendingOwnerPhotoFile }) {
  const form = createTenantForm;
  const set = (field) => (e) => setCreateTenantForm({ ...form, [field]: e.target.value });
  const [showPw, setShowPw] = React.useState(false);
  const isCustomPlan = form.planName === "custom";
  const lockedFieldStyle = isCustomPlan ? {} : { background: T.borderLight, cursor: "not-allowed", color: T.textMuted };

  return (
    <div className="fade-up" style={{ maxWidth: 860 }}>
      <div style={{ marginBottom: 26 }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: T.textPrimary }}>Create New Tenant</h2>
        <p style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>Provision a new organization, its first admin, and its default branch/department</p>
      </div>

      <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: "30px", boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
        <form onSubmit={handleCreateTenant}>

          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: T.textPrimary, marginBottom: 14 }}>Organization</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField label="Organization Name" span2>
              <div style={{ position: "relative" }}><FieldIcon icon={Building2} /><input className="inp" style={baseInp} type="text" placeholder="Acme Pvt Ltd" value={form.organizationName} onChange={set("organizationName")} required /></div>
            </FormField>
            <FormField label="Company Logo" span2>
              <PendingImagePicker file={pendingLogoFile} setFile={setPendingLogoFile} chooseLabel="Choose Logo" />
            </FormField>
            <FormField label="Company Email">
              <div style={{ position: "relative" }}><FieldIcon icon={Mail} /><input className="inp" style={baseInp} type="email" placeholder="hello@acme.com" value={form.companyEmail} onChange={set("companyEmail")} /></div>
            </FormField>
            <FormField label="Company Phone">
              <div style={{ position: "relative" }}><FieldIcon icon={Phone} /><input className="inp" style={baseInp} type="text" placeholder="Contact number" value={form.companyPhone} onChange={set("companyPhone")} /></div>
            </FormField>
            <FormField label="Website">
              <div style={{ position: "relative" }}><FieldIcon icon={Globe} /><input className="inp" style={baseInp} type="text" placeholder="https://acme.com" value={form.website} onChange={set("website")} /></div>
            </FormField>
            <FormField label="GST Number">
              <div style={{ position: "relative" }}><FieldIcon icon={Hash} /><input className="inp" style={baseInp} type="text" value={form.gstNumber} onChange={set("gstNumber")} /></div>
            </FormField>
            <FormField label="PAN Number">
              <div style={{ position: "relative" }}><FieldIcon icon={Hash} /><input className="inp" style={baseInp} type="text" value={form.panNumber} onChange={set("panNumber")} /></div>
            </FormField>
            <FormField label="Address" span2>
              <div style={{ position: "relative" }}><FieldIcon icon={MapPin} /><input className="inp" style={baseInp} type="text" value={form.address} onChange={set("address")} /></div>
            </FormField>
            <FormField label="City"><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="text" value={form.city} onChange={set("city")} /></FormField>
            <FormField label="State"><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="text" value={form.state} onChange={set("state")} /></FormField>
            <FormField label="Country"><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="text" value={form.country} onChange={set("country")} /></FormField>
            <FormField label="Postal Code"><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="text" value={form.postalCode} onChange={set("postalCode")} /></FormField>
            <FormField label="Time Zone"><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="text" value={form.timezone} onChange={set("timezone")} /></FormField>
            <FormField label="Currency"><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="text" value={form.currency} onChange={set("currency")} /></FormField>
            <FormField label="Business Type" span2><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="text" placeholder="e.g. Agency, Retail, IT Services" value={form.businessType} onChange={set("businessType")} /></FormField>
          </div>

          <SectionHeading>Subscription</SectionHeading>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField label="Subscription Plan">
              <div style={{ position: "relative" }}>
                <FieldIcon icon={Briefcase} />
                <select className="inp" style={{ ...baseInp, appearance: "none" }} value={form.planName} onChange={(e) => handlePlanChange(e.target.value)}>
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="business">Business</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </FormField>
            <FormField label="Status">
              <div style={{ position: "relative" }}>
                <FieldIcon icon={Briefcase} />
                <select className="inp" style={{ ...baseInp, appearance: "none" }} value={form.status} onChange={set("status")}>
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </FormField>
            <FormField label="Trial Days"><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="number" min="0" value={form.trialDays} onChange={set("trialDays")} /></FormField>
            <FormField label="Subscription Start Date"><div style={{ position: "relative" }}><FieldIcon icon={Calendar} /><input className="inp" style={baseInp} type="date" value={form.subscriptionStartDate} onChange={set("subscriptionStartDate")} /></div></FormField>
            <FormField label="Subscription Expiry Date"><div style={{ position: "relative" }}><FieldIcon icon={Calendar} /><input className="inp" style={baseInp} type="date" value={form.subscriptionExpiresAt} onChange={set("subscriptionExpiresAt")} /></div></FormField>
            <FormField label="Maximum Users"><input className="inp" style={{ ...baseInp, paddingLeft: 14, ...lockedFieldStyle }} type="number" min="0" value={form.maxUsers} onChange={set("maxUsers")} readOnly={!isCustomPlan} /></FormField>
            <FormField label="Maximum Branches"><input className="inp" style={{ ...baseInp, paddingLeft: 14, ...lockedFieldStyle }} type="number" min="0" value={form.maxBranches} onChange={set("maxBranches")} readOnly={!isCustomPlan} /></FormField>
            <FormField label="Maximum Departments"><input className="inp" style={{ ...baseInp, paddingLeft: 14, ...lockedFieldStyle }} type="number" min="0" value={form.maxDepartments} onChange={set("maxDepartments")} readOnly={!isCustomPlan} /></FormField>
            <FormField label="Maximum Projects"><input className="inp" style={{ ...baseInp, paddingLeft: 14, ...lockedFieldStyle }} type="number" min="0" value={form.maxProjects} onChange={set("maxProjects")} readOnly={!isCustomPlan} /></FormField>
            <FormField label="Maximum Clients"><input className="inp" style={{ ...baseInp, paddingLeft: 14, ...lockedFieldStyle }} type="number" min="0" value={form.maxClients} onChange={set("maxClients")} readOnly={!isCustomPlan} /></FormField>
            <FormField label="Max Storage (MB)"><input className="inp" style={{ ...baseInp, paddingLeft: 14, ...lockedFieldStyle }} type="number" min="0" value={form.maxStorageMB} onChange={set("maxStorageMB")} readOnly={!isCustomPlan} /></FormField>
          </div>
          <p style={{ fontSize: 11.5, color: T.textMuted, marginTop: 10 }}>
            {isCustomPlan
              ? "Custom plan — set your own limits above. Leave a field blank for unlimited."
              : "Limits are set by the selected plan and locked here. Switch to Custom to override them for this tenant."}
          </p>

          <SectionHeading>Tenant Admin</SectionHeading>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField label="Full Name"><div style={{ position: "relative" }}><FieldIcon icon={User} /><input className="inp" style={baseInp} type="text" placeholder="John Doe" value={form.adminName} onChange={set("adminName")} required /></div></FormField>
            <FormField label="Mobile Number"><div style={{ position: "relative" }}><FieldIcon icon={Phone} /><input className="inp" style={baseInp} type="text" value={form.adminMobile} onChange={set("adminMobile")} /></div></FormField>
            <FormField label="Email Address"><div style={{ position: "relative" }}><FieldIcon icon={Mail} /><input className="inp" style={baseInp} type="email" placeholder="admin@acme.com" value={form.adminEmail} onChange={set("adminEmail")} required /></div></FormField>
            <FormField label="Password">
              <div style={{ position: "relative" }}>
                <FieldIcon icon={Lock} />
                <input className="inp" style={baseInp} type={showPw ? "text" : "password"} placeholder="Set a strong password" value={form.adminPassword} onChange={set("adminPassword")} required />
                <button type="button" onClick={() => setShowPw((p) => !p)} style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex", padding: 0 }}>
                  {showPw ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
                </button>
              </div>
            </FormField>
            <FormField label="Designation"><div style={{ position: "relative" }}><FieldIcon icon={Briefcase} /><input className="inp" style={baseInp} type="text" placeholder="e.g. Founder, CEO" value={form.adminDesignation} onChange={set("adminDesignation")} /></div></FormField>
            <FormField label="Owner Photo" span2>
              <PendingImagePicker file={pendingOwnerPhotoFile} setFile={setPendingOwnerPhotoFile} chooseLabel="Choose Photo" accept=".png,.jpg,.jpeg,.webp" hint="PNG, JPG, JPEG, or WEBP, up to 2MB." round />
            </FormField>
          </div>

          <SectionHeading>Feature Access</SectionHeading>
          <FeatureAccessMatrix
            catalog={featureCatalog}
            enabledFeatures={form.enabledFeatures}
            onChange={(enabledFeatures) => setCreateTenantForm({ ...form, enabledFeatures })}
          />

          <button className="pri-btn" type="submit" disabled={creatingTenant} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "linear-gradient(135deg, #f7931e, #e8590c)", color: "#fff", borderRadius: 11, padding: "13px", fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", letterSpacing: ".03em", marginTop: 28, opacity: creatingTenant ? 0.8 : 1 }}>
            <UserPlus size={16} strokeWidth={2} /> {creatingTenant ? "Creating Tenant..." : "Create Tenant"}
          </button>
        </form>
      </div>
    </div>
  );
}
