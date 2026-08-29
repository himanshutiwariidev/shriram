import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, AlertCircle,
  Save, ShieldCheck, X, HardDrive, CreditCard, FileClock,
} from "lucide-react";
import API from "../services/api";
import { FormField, T, baseInp } from "./sections/shared";
import FeatureAccessMatrix from "./sections/FeatureAccessMatrix";
import LogoUploadField from "./sections/LogoUploadField";
import OrganizationProfileCard from "../components/OrganizationProfileCard";
import { TENANT_COLLECTIONS_LABELS, TENANT_COLLECTIONS_ORDER } from "./sections/tenantCollectionsLabels";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "organization", label: "Organization" },
  { id: "owner", label: "Owner" },
  { id: "branding", label: "Branding" },
  { id: "subscription", label: "Subscription" },
  { id: "limits", label: "Limits" },
  { id: "features", label: "Feature Access" },
  { id: "services", label: "Proposal Services" },
  { id: "users", label: "Users" },
  { id: "branches", label: "Branches" },
  { id: "departments", label: "Departments" },
  { id: "usage", label: "Usage" },
  { id: "auditLogs", label: "Audit Logs" },
  { id: "billing", label: "Billing" },
];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");

const PLAN_FEATURE_PRESETS = {
  starter:      ["attendance", "leaves", "payroll", "clients", "projects", "tasks", "branches", "departments", "meetings", "expenses"],
  professional: ["attendance", "leaves", "payroll", "clients", "projects", "tasks", "branches", "departments", "meetings", "expenses", "mail_automation"],
  business:     ["attendance", "leaves", "payroll", "clients", "projects", "tasks", "branches", "departments", "meetings", "expenses", "mail_automation", "gmb_scraper"],
  enterprise:   ["attendance", "leaves", "payroll", "clients", "projects", "tasks", "branches", "departments", "meetings", "expenses", "mail_automation", "gmb_scraper"],
};

const calcTrialDays = (start, end) => {
  if (!start || !end) return "";
  const diff = Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : "";
};

export default function TenantDetailPage() {
  const { orgId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [organization, setOrganization] = useState(null);
  const [usage, setUsage] = useState({});
  const [limits, setLimits] = useState({});
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orgForm, setOrgForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [users, setUsers] = useState(null);
  const [branches, setBranches] = useState(null);
  const [departments, setDepartments] = useState(null);
  const [featureCatalog, setFeatureCatalog] = useState([]);
  const [enabledFeatures, setEnabledFeatures] = useState([]);
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [serviceCatalog, setServiceCatalog] = useState([]);
  const [enabledServiceKeys, setEnabledServiceKeys] = useState(null); // null = all enabled
  const [savingServices, setSavingServices] = useState(false);
  const [ownerForm, setOwnerForm] = useState(null);
  const [savingOwner, setSavingOwner] = useState(false);
  const [auditLogs, setAuditLogs] = useState(null);
  const [planPresetApplied, setPlanPresetApplied] = useState(false);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };

  const loadOverview = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/superadmin/organizations/${orgId}`);
      setOrganization(data.organization);
      setUsage(data.usage || {});
      setLimits(data.limits || {});
      setOrgForm({
        name: data.organization.name || "",
        email: data.organization.email || "",
        phone: data.organization.phone || "",
        website: data.organization.website || "",
        gstNumber: data.organization.gstNumber || "",
        panNumber: data.organization.panNumber || "",
        address: data.organization.address || "",
        city: data.organization.city || "",
        state: data.organization.state || "",
        country: data.organization.country || "",
        postalCode: data.organization.postalCode || "",
        businessType: data.organization.businessType || "",
        timezone: data.organization.timezone || "Asia/Kolkata",
        currency: data.organization.currency || "INR",
        planName: data.organization.planName || "starter",
        status: data.organization.status || "trial",
        trialDays: data.organization.trialDays ?? 14,
        trialEndsAt: data.organization.trialEndsAt ? data.organization.trialEndsAt.slice(0, 10) : "",
        subscriptionStartDate: data.organization.subscriptionStartDate ? data.organization.subscriptionStartDate.slice(0, 10) : "",
        subscriptionExpiresAt: data.organization.subscriptionExpiresAt ? data.organization.subscriptionExpiresAt.slice(0, 10) : "",
        // Seeded from the resolved *effective* limits (live Plan lookup for
        // standard tiers, the org's own fields for custom) — not the raw
        // organization.max* fields, which are only meaningful when custom.
        maxUsers: data.limits?.maxUsers ?? "",
        maxBranches: data.limits?.maxBranches ?? "",
        maxDepartments: data.limits?.maxDepartments ?? "",
        maxProjects: data.limits?.maxProjects ?? "",
        maxClients: data.limits?.maxClients ?? "",
        maxStorageMB: data.limits?.maxStorageMB ?? "",
      });
      const owner = data.organization.createdBy;
      setOwnerForm({
        name: owner?.name || "",
        email: owner?.email || "",
        phone: owner?.phone || "",
        designation: owner?.designation || "",
        departmentId: owner?.departmentId || "",
      });
    } catch {
      showToast("Failed to load tenant", false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOverview(); }, [orgId]);

  useEffect(() => {
    API.get("/superadmin/organizations/meta/plans").then(({ data }) => setPlans(data?.plans || [])).catch(() => {});
  }, []);

  // Same live-plan auto-population as Create Tenant — only "custom" allows
  // editing; picking a standard plan re-fetches its current limits.
  const handleOrgPlanChange = (planName) => {
    if (planName === "custom") {
      setOrgForm((prev) => ({ ...prev, planName }));
      setPlanPresetApplied(false);
      return;
    }
    const plan = plans.find((p) => p.key === planName);
    setOrgForm((prev) => ({
      ...prev,
      planName,
      maxUsers: plan?.maxUsers ?? "",
      maxBranches: plan?.maxBranches ?? "",
      maxDepartments: plan?.maxDepartments ?? "",
      maxProjects: plan?.maxProjects ?? "",
      maxClients: plan?.maxClients ?? "",
      maxStorageMB: plan?.maxStorageMB ?? "",
    }));
    if (PLAN_FEATURE_PRESETS[planName]) {
      setEnabledFeatures(PLAN_FEATURE_PRESETS[planName]);
      setPlanPresetApplied(true);
    }
  };

  useEffect(() => {
    if (activeTab === "users" && users === null) {
      API.get(`/superadmin/organizations/${orgId}/users`).then(({ data }) => setUsers(data.users || [])).catch(() => setUsers([]));
    }
    if (activeTab === "branches" && branches === null) {
      API.get(`/superadmin/organizations/${orgId}/branches`).then(({ data }) => setBranches(data.branches || [])).catch(() => setBranches([]));
    }
    if (activeTab === "departments" && departments === null) {
      API.get(`/superadmin/organizations/${orgId}/departments`).then(({ data }) => setDepartments(data.departments || [])).catch(() => setDepartments([]));
    }
    if (activeTab === "features" && featureCatalog.length === 0) {
      Promise.all([
        API.get("/superadmin/organizations/meta/feature-catalog"),
        API.get(`/superadmin/organizations/${orgId}/features`),
      ]).then(([catalogRes, featuresRes]) => {
        setFeatureCatalog(catalogRes.data.catalog || []);
        setEnabledFeatures(featuresRes.data.enabledFeatures || []);
      }).catch(() => showToast("Failed to load feature access", false));
    }
    if (activeTab === "owner" && departments === null) {
      API.get(`/superadmin/organizations/${orgId}/departments`).then(({ data }) => setDepartments(data.departments || [])).catch(() => setDepartments([]));
    }
    if (activeTab === "auditLogs" && auditLogs === null) {
      API.get(`/superadmin/organizations/${orgId}/audit-logs`).then(({ data }) => setAuditLogs(data.logs || [])).catch(() => setAuditLogs([]));
    }
    if (activeTab === "services" && serviceCatalog.length === 0) {
      API.get(`/superadmin/organizations/${orgId}/services`)
        .then(({ data }) => {
          setServiceCatalog(data.catalog || []);
          setEnabledServiceKeys(data.enabledServiceKeys);
        })
        .catch(() => showToast("Failed to load service catalog", false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleSaveOrg = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.put(`/superadmin/organizations/${orgId}`, orgForm);
      if (planPresetApplied) {
        await API.put(`/superadmin/organizations/${orgId}/features`, { enabledFeatures });
        setPlanPresetApplied(false);
      }
      showToast("Tenant updated successfully");
      loadOverview();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to update tenant", false);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOwner = async (e) => {
    e.preventDefault();
    setSavingOwner(true);
    try {
      await API.put(`/superadmin/organizations/${orgId}/owner`, ownerForm);
      showToast("Owner details updated");
      loadOverview();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to update owner", false);
    } finally {
      setSavingOwner(false);
    }
  };

  const handleSaveFeatures = async () => {
    setSavingFeatures(true);
    try {
      await API.put(`/superadmin/organizations/${orgId}/features`, { enabledFeatures });
      showToast("Feature access updated");
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to update feature access", false);
    } finally {
      setSavingFeatures(false);
    }
  };

  const handleSaveServices = async () => {
    setSavingServices(true);
    try {
      // enabledServiceKeys null means "all" — send the full list so the backend
      // creates an explicit record (which can later be restricted).
      const keys = enabledServiceKeys ?? serviceCatalog.map((s) => s.key);
      await API.put(`/superadmin/organizations/${orgId}/services`, { enabledServiceKeys: keys });
      showToast("Service access updated");
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to update service access", false);
    } finally {
      setSavingServices(false);
    }
  };

  if (loading || !organization) {
    return <div style={{ padding: 40, fontFamily: "'Inter', sans-serif", color: T.textMuted }}>Loading tenant…</div>;
  }

  return (
    <>
      <style>{`
        .nav-btn { border: none; cursor: pointer; font-family: inherit; background: transparent; transition: all .16s; }
        .nav-btn:hover:not(.nav-active) { background: ${T.brandLight} !important; color: ${T.brand} !important; }
      `}</style>
      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Inter', sans-serif", color: T.textSecondary }}>

        {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
        <aside style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 238, background: T.sidebar, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", zIndex: 100, boxShadow: "1px 0 0 0 #e8eaf0" }}>
          <div style={{ padding: "24px 22px 22px", borderBottom: `1px solid ${T.borderLight}` }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary }}>Edit Organization</div>
            <div style={{ fontSize: 10, color: T.textMuted, letterSpacing: ".1em", marginTop: 9, textTransform: "uppercase", fontWeight: 600 }}>Tenant Detail</div>
          </div>
          <nav style={{ flex: 1, padding: "18px 12px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
            {TABS.map(({ id, label }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  className={`nav-btn${active ? " nav-active" : ""}`}
                  onClick={() => setActiveTab(id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px",
                    borderRadius: 9, textAlign: "left",
                    color: active ? T.brand : T.textSecondary,
                    background: active ? T.brandLight : "transparent",
                    fontWeight: active ? 600 : 400, fontSize: 13.5,
                    borderLeft: `3px solid ${active ? T.brand : "transparent"}`,
                  }}
                >
                  {label}
                  {active && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: T.brand, flexShrink: 0 }} />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── CONTENT ─────────────────────────────────────────────────────── */}
        <div style={{ marginLeft: 238, padding: "30px 36px 64px" }}>
      <button onClick={() => navigate("/superadmin")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 13, fontWeight: 600, marginBottom: 18, padding: 0 }}>
        <ArrowLeft size={15} strokeWidth={2} /> Back to Organizations
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #f7931e, #e8590c)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <ShieldCheck size={22} color="#fff" strokeWidth={2} />
        </div>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: T.textPrimary }}>{organization.name}</h1>
          <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>/{organization.slug} · {organization.planName} · {organization.status}</p>
        </div>
      </div>

      {activeTab === "overview" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <OrganizationProfileCard organization={organization} owner={organization.createdBy} usage={usage} limits={limits} />
          </div>
        </div>
      )}

      {activeTab === "organization" && orgForm && (
        <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: 28, maxWidth: 760 }}>
          <form onSubmit={handleSaveOrg}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <FormField label="Organization Name" span2><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="text" value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} required /></FormField>
              <FormField label="Email"><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="email" value={orgForm.email} onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })} /></FormField>
              <FormField label="Phone"><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="text" value={orgForm.phone} onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })} /></FormField>
              <FormField label="Website"><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="text" value={orgForm.website} onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })} /></FormField>
              <FormField label="GST Number"><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="text" value={orgForm.gstNumber} onChange={(e) => setOrgForm({ ...orgForm, gstNumber: e.target.value })} /></FormField>
              <FormField label="PAN Number"><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="text" value={orgForm.panNumber} onChange={(e) => setOrgForm({ ...orgForm, panNumber: e.target.value })} /></FormField>
              <FormField label="Address" span2><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="text" value={orgForm.address} onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })} /></FormField>
              <FormField label="City"><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="text" value={orgForm.city} onChange={(e) => setOrgForm({ ...orgForm, city: e.target.value })} /></FormField>
              <FormField label="State"><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="text" value={orgForm.state} onChange={(e) => setOrgForm({ ...orgForm, state: e.target.value })} /></FormField>
              <FormField label="Country"><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="text" value={orgForm.country} onChange={(e) => setOrgForm({ ...orgForm, country: e.target.value })} /></FormField>
              <FormField label="Postal Code"><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="text" value={orgForm.postalCode} onChange={(e) => setOrgForm({ ...orgForm, postalCode: e.target.value })} /></FormField>
              <FormField label="Business Type"><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="text" placeholder="e.g. Agency, Retail, IT Services" value={orgForm.businessType} onChange={(e) => setOrgForm({ ...orgForm, businessType: e.target.value })} /></FormField>
              <FormField label="Time Zone"><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="text" value={orgForm.timezone} onChange={(e) => setOrgForm({ ...orgForm, timezone: e.target.value })} /></FormField>
              <FormField label="Currency"><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="text" value={orgForm.currency} onChange={(e) => setOrgForm({ ...orgForm, currency: e.target.value })} /></FormField>
            </div>
            <button className="pri-btn" type="submit" disabled={saving} style={{ display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #f7931e, #e8590c)", color: "#fff", borderRadius: 10, padding: "11px 22px", fontSize: 13.5, fontWeight: 700, fontFamily: "'Syne', sans-serif", marginTop: 22, opacity: saving ? 0.8 : 1 }}>
              <Save size={15} strokeWidth={2} /> {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      )}

      {activeTab === "owner" && ownerForm && (
        <TenantOwnerTab
          orgId={orgId}
          organization={organization}
          ownerForm={ownerForm}
          setOwnerForm={setOwnerForm}
          departments={departments}
          savingOwner={savingOwner}
          handleSaveOwner={handleSaveOwner}
          showToast={showToast}
          onUpdated={loadOverview}
        />
      )}

      {activeTab === "branding" && (
        <TenantBrandingTab orgId={orgId} organization={organization} showToast={showToast} onUpdated={loadOverview} />
      )}

      {activeTab === "subscription" && orgForm && (
        <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: 28, maxWidth: 760 }}>
          <form onSubmit={handleSaveOrg}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <FormField label="Subscription Plan">
                <select className="inp" style={{ ...baseInp, paddingLeft: 14, appearance: "none" }} value={orgForm.planName} onChange={(e) => handleOrgPlanChange(e.target.value)}>
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="business">Business</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="custom">Custom</option>
                </select>
              </FormField>
              <FormField label="Status">
                <select className="inp" style={{ ...baseInp, paddingLeft: 14, appearance: "none" }} value={orgForm.status} onChange={(e) => setOrgForm({ ...orgForm, status: e.target.value })}>
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="expired">Expired</option>
                </select>
              </FormField>

              {/* Trial-only fields */}
              {orgForm.status === "trial" && (
                <>
                  <FormField label="Trial Days">
                    <input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="number" min="0" value={orgForm.trialDays}
                      onChange={(e) => setOrgForm({ ...orgForm, trialDays: e.target.value })} />
                  </FormField>
                  <FormField label="Trial End Date">
                    <input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="date" value={orgForm.trialEndsAt || ""}
                      onChange={(e) => setOrgForm({ ...orgForm, trialEndsAt: e.target.value })} />
                  </FormField>
                </>
              )}

              {/* Paid-subscription fields — shown for active / expired / suspended */}
              {orgForm.status !== "trial" && (
                <>
                  <FormField label="Subscription Start Date">
                    <input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="date" value={orgForm.subscriptionStartDate}
                      onChange={(e) => setOrgForm((prev) => ({ ...prev, subscriptionStartDate: e.target.value }))} />
                  </FormField>
                  <FormField label="Subscription Expiry Date">
                    <input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="date" value={orgForm.subscriptionExpiresAt}
                      onChange={(e) => setOrgForm((prev) => ({ ...prev, subscriptionExpiresAt: e.target.value }))} />
                  </FormField>
                </>
              )}
            </div>
            {planPresetApplied && (
              <p style={{ fontSize: 12, color: "#d97706", marginTop: 14, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "9px 13px" }}>
                Feature access preset applied for <b style={{ textTransform: "capitalize" }}>{orgForm.planName}</b> plan — will be saved automatically with your changes.
              </p>
            )}
            <button className="pri-btn" type="submit" disabled={saving} style={{ display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #f7931e, #e8590c)", color: "#fff", borderRadius: 10, padding: "11px 22px", fontSize: 13.5, fontWeight: 700, fontFamily: "'Syne', sans-serif", marginTop: 22, opacity: saving ? 0.8 : 1 }}>
              <Save size={15} strokeWidth={2} /> {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      )}

      {activeTab === "limits" && orgForm && (
        <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: 28, maxWidth: 760 }}>
          <form onSubmit={handleSaveOrg}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {(() => {
                const isCustom = orgForm.planName === "custom";
                const lockedStyle = isCustom ? {} : { background: T.borderLight, cursor: "not-allowed", color: T.textMuted };
                return (
                  <>
                    <FormField label="Maximum Users"><input className="inp" style={{ ...baseInp, paddingLeft: 14, ...lockedStyle }} type="number" min="0" value={orgForm.maxUsers} onChange={(e) => setOrgForm({ ...orgForm, maxUsers: e.target.value })} readOnly={!isCustom} /></FormField>
                    <FormField label="Maximum Branches"><input className="inp" style={{ ...baseInp, paddingLeft: 14, ...lockedStyle }} type="number" min="0" value={orgForm.maxBranches} onChange={(e) => setOrgForm({ ...orgForm, maxBranches: e.target.value })} readOnly={!isCustom} /></FormField>
                    <FormField label="Maximum Departments"><input className="inp" style={{ ...baseInp, paddingLeft: 14, ...lockedStyle }} type="number" min="0" value={orgForm.maxDepartments} onChange={(e) => setOrgForm({ ...orgForm, maxDepartments: e.target.value })} readOnly={!isCustom} /></FormField>
                    <FormField label="Maximum Projects"><input className="inp" style={{ ...baseInp, paddingLeft: 14, ...lockedStyle }} type="number" min="0" value={orgForm.maxProjects} onChange={(e) => setOrgForm({ ...orgForm, maxProjects: e.target.value })} readOnly={!isCustom} /></FormField>
                    <FormField label="Maximum Clients"><input className="inp" style={{ ...baseInp, paddingLeft: 14, ...lockedStyle }} type="number" min="0" value={orgForm.maxClients} onChange={(e) => setOrgForm({ ...orgForm, maxClients: e.target.value })} readOnly={!isCustom} /></FormField>
                    <FormField label="Max Storage (MB)"><input className="inp" style={{ ...baseInp, paddingLeft: 14, ...lockedStyle }} type="number" min="0" value={orgForm.maxStorageMB} onChange={(e) => setOrgForm({ ...orgForm, maxStorageMB: e.target.value })} readOnly={!isCustom} /></FormField>
                  </>
                );
              })()}
            </div>
            <p style={{ fontSize: 11.5, color: T.textMuted, marginTop: 10 }}>
              {orgForm.planName === "custom"
                ? "Custom plan — set your own limits above. Leave a field blank for unlimited."
                : "Limits are set by the selected plan and locked here. Switch to Custom to override them for this tenant."}
            </p>
            <button className="pri-btn" type="submit" disabled={saving} style={{ display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #f7931e, #e8590c)", color: "#fff", borderRadius: 10, padding: "11px 22px", fontSize: 13.5, fontWeight: 700, fontFamily: "'Syne', sans-serif", marginTop: 22, opacity: saving ? 0.8 : 1 }}>
              <Save size={15} strokeWidth={2} /> {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      )}

      {activeTab === "users" && (
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
          {users === null ? (
            <p style={{ padding: 20, fontSize: 13, color: T.textMuted }}>Loading users…</p>
          ) : users.length === 0 ? (
            <p style={{ padding: 20, fontSize: 13, color: T.textMuted }}>No users yet.</p>
          ) : users.map((u, i) => (
            <div key={u._id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: i < users.length - 1 ? `1px solid ${T.borderLight}` : "none" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: T.textPrimary }}>{u.name}</div>
                  {organization.createdBy && u._id === organization.createdBy._id && (
                    <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 5, color: T.brand, background: T.brandLight, letterSpacing: ".05em", textTransform: "uppercase" }}>Owner</span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>{u.email}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: u.isActive ? T.green : T.textMuted, marginRight: 4 }}>{u.isActive ? "Active" : "Inactive"}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 6, color: T.brand, background: T.brandLight, textTransform: "uppercase" }}>{u.role}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === "branches" && (
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
          {branches === null ? (
            <p style={{ padding: 20, fontSize: 13, color: T.textMuted }}>Loading branches…</p>
          ) : branches.length === 0 ? (
            <p style={{ padding: 20, fontSize: 13, color: T.textMuted }}>No branches yet.</p>
          ) : branches.map((b, i) => (
            <div key={b._id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: i < branches.length - 1 ? `1px solid ${T.borderLight}` : "none" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: T.textPrimary }}>{b.name}</div>
                {b.address && <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>{b.address}</div>}
              </div>
              <span style={{ fontSize: 11, color: b.status === "inactive" ? T.textMuted : T.green, fontWeight: 700 }}>{b.status}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === "departments" && (
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
          {departments === null ? (
            <p style={{ padding: 20, fontSize: 13, color: T.textMuted }}>Loading departments…</p>
          ) : departments.length === 0 ? (
            <p style={{ padding: 20, fontSize: 13, color: T.textMuted }}>No departments yet.</p>
          ) : departments.map((d, i) => (
            <div key={d._id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: i < departments.length - 1 ? `1px solid ${T.borderLight}` : "none" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: T.textPrimary }}>{d.name}</div>
                {d.description && <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>{d.description}</div>}
              </div>
              {d.branch?.name && <span style={{ fontSize: 11.5, color: T.textMuted }}>{d.branch.name}</span>}
            </div>
          ))}
        </div>
      )}

      {activeTab === "usage" && (
        <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: 28, maxWidth: 760 }}>
          <p style={{ fontSize: 12, color: T.textMuted, marginBottom: 18 }}>Real usage against this tenant's effective plan limits, per collection.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {TENANT_COLLECTIONS_ORDER.map((key) => {
              const used = usage[key] ?? 0;
              const limitKey = { users: "maxUsers", branches: "maxBranches", departments: "maxDepartments", projects: "maxProjects", clients: "maxClients" }[key];
              const max = limitKey ? limits[limitKey] : null;
              const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
              const over = max != null && used >= max;
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
                    <span style={{ color: T.textSecondary, fontWeight: 600 }}>{TENANT_COLLECTIONS_LABELS[key]}</span>
                    <span style={{ color: T.textMuted }}>{used}{max != null ? ` / ${max}` : " (unlimited)"}</span>
                  </div>
                  {max != null && (
                    <div style={{ height: 5, background: T.borderLight, borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: over ? T.red : T.brand, borderRadius: 99 }} />
                    </div>
                  )}
                </div>
              );
            })}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
                <span style={{ color: T.textSecondary, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><HardDrive size={13} strokeWidth={1.8} /> Storage</span>
                <span style={{ color: T.textMuted }}>{usage.storageMB ?? 0} MB{limits.maxStorageMB != null ? ` / ${limits.maxStorageMB} MB` : " (unlimited)"}</span>
              </div>
              {limits.maxStorageMB != null && (
                <div style={{ height: 5, background: T.borderLight, borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, Math.round(((usage.storageMB ?? 0) / limits.maxStorageMB) * 100))}%`, background: (usage.storageMB ?? 0) >= limits.maxStorageMB ? T.red : T.brand, borderRadius: 99 }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "auditLogs" && (
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
          {auditLogs === null ? (
            <p style={{ padding: 20, fontSize: 13, color: T.textMuted }}>Loading audit logs…</p>
          ) : auditLogs.length === 0 ? (
            <p style={{ padding: 20, fontSize: 13, color: T.textMuted }}>No audit history yet.</p>
          ) : auditLogs.map((log, i) => (
            <div key={log._id} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 18px", borderBottom: i < auditLogs.length - 1 ? `1px solid ${T.borderLight}` : "none" }}>
              <FileClock size={15} strokeWidth={1.8} color={T.textMuted} style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: T.textPrimary }}>{log.message}</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>
                  {fmtDate(log.createdAt)} {new Date(log.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  {log.performedBy?.name ? ` · by ${log.performedBy.name}` : ""}
                </div>
              </div>
              <span style={{ fontSize: 9.5, fontWeight: 700, padding: "3px 8px", borderRadius: 5, color: T.textMuted, background: T.borderLight, letterSpacing: ".05em", textTransform: "uppercase", flexShrink: 0 }}>{log.action.replace("_", " ")}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === "billing" && (
        <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: 40, maxWidth: 760, textAlign: "center" }}>
          <CreditCard size={32} strokeWidth={1.5} color={T.textMuted} style={{ margin: "0 auto 14px", display: "block" }} />
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary, marginBottom: 6 }}>Billing integration is not yet connected</p>
          <p style={{ fontSize: 12.5, color: T.textMuted, maxWidth: 420, margin: "0 auto" }}>
            This platform has no payment gateway wired up yet, so there's no real invoice/charge history to show here. Subscription plan and limits are managed from the Subscription and Limits tabs.
          </p>
        </div>
      )}

      {activeTab === "features" && (
        <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: 28, maxWidth: 760 }}>
          {featureCatalog.length === 0 ? (
            <p style={{ fontSize: 13, color: T.textMuted }}>Loading feature access…</p>
          ) : (
            <>
              <FeatureAccessMatrix catalog={featureCatalog} enabledFeatures={enabledFeatures} onChange={setEnabledFeatures} />
              <button onClick={handleSaveFeatures} disabled={savingFeatures} className="pri-btn" style={{ display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #f7931e, #e8590c)", color: "#fff", borderRadius: 10, padding: "11px 22px", fontSize: 13.5, fontWeight: 700, fontFamily: "'Syne', sans-serif", marginTop: 22, opacity: savingFeatures ? 0.8 : 1 }}>
                <Save size={15} strokeWidth={2} /> {savingFeatures ? "Saving..." : "Save Feature Access"}
              </button>
            </>
          )}
        </div>
      )}

      {activeTab === "services" && (
        <TenantServicesTab
          serviceCatalog={serviceCatalog}
          enabledServiceKeys={enabledServiceKeys}
          onChange={setEnabledServiceKeys}
          onSave={handleSaveServices}
          saving={savingServices}
        />
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 26, right: 26, zIndex: 9999, background: "#fff", border: `1.5px solid ${toast.ok ? T.greenBorder : T.redBorder}`, borderRadius: 13, padding: "14px 18px", fontWeight: 500, fontSize: 13.5, display: "flex", alignItems: "center", gap: 11, boxShadow: "0 8px 32px rgba(0,0,0,.12)", maxWidth: 340 }}>
          {toast.ok ? <CheckCircle2 size={17} strokeWidth={2} color={T.green} /> : <AlertCircle size={17} strokeWidth={2} color={T.red} />}
          <span style={{ flex: 1, color: T.textPrimary }}>{toast.msg}</span>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex", padding: 0 }}><X size={14} strokeWidth={2} /></button>
        </div>
      )}
        </div>
      </div>
    </>
  );
}

// Logo/favicon upload immediately via LogoUploadField (org already exists at
// this point, unlike Create Tenant); color/footer text save via the regular
// PUT /organizations/:id like every other field on this page.
function TenantBrandingTab({ orgId, organization, showToast, onUpdated }) {
  const [logoUrl, setLogoUrl] = useState(organization.logoUrl || null);
  const [faviconUrl, setFaviconUrl] = useState(organization.faviconUrl || null);
  const [colors, setColors] = useState({
    primaryColor: organization.primaryColor || "#f7931e",
    secondaryColor: organization.secondaryColor || "",
    footerText: organization.footerText || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSaveColors = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.put(`/superadmin/organizations/${orgId}`, colors);
      showToast("Branding updated successfully");
      onUpdated();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to update branding", false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 760 }}>
      <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: 28 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: T.textPrimary, marginBottom: 16 }}>Logo & Favicon</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <LogoUploadField
            label="Logo"
            value={logoUrl}
            uploadUrl={`/superadmin/organizations/${orgId}/logo`}
            deleteUrl={`/superadmin/organizations/${orgId}/logo`}
            fieldName="logo"
            onChange={setLogoUrl}
            showToast={showToast}
          />
          <LogoUploadField
            label="Favicon"
            value={faviconUrl}
            uploadUrl={`/superadmin/organizations/${orgId}/favicon`}
            deleteUrl={`/superadmin/organizations/${orgId}/favicon`}
            fieldName="favicon"
            onChange={setFaviconUrl}
            showToast={showToast}
          />
        </div>
      </div>

      <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: 28 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: T.textPrimary, marginBottom: 16 }}>Colors & Footer</div>
        <form onSubmit={handleSaveColors}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField label="Primary Color">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="color" value={colors.primaryColor} onChange={(e) => setColors({ ...colors, primaryColor: e.target.value })} style={{ width: 44, height: 40, border: `1.5px solid ${T.inputBorder}`, borderRadius: 8, cursor: "pointer", padding: 2 }} />
                <input className="inp" style={{ ...baseInp, paddingLeft: 14, flex: 1 }} type="text" value={colors.primaryColor} onChange={(e) => setColors({ ...colors, primaryColor: e.target.value })} />
              </div>
            </FormField>
            <FormField label="Secondary Color">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="color" value={colors.secondaryColor || "#000000"} onChange={(e) => setColors({ ...colors, secondaryColor: e.target.value })} style={{ width: 44, height: 40, border: `1.5px solid ${T.inputBorder}`, borderRadius: 8, cursor: "pointer", padding: 2 }} />
                <input className="inp" style={{ ...baseInp, paddingLeft: 14, flex: 1 }} type="text" placeholder="Optional" value={colors.secondaryColor} onChange={(e) => setColors({ ...colors, secondaryColor: e.target.value })} />
              </div>
            </FormField>
            <FormField label="Footer Text" span2>
              <input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="text" placeholder="e.g. © 2026 Acme Pvt Ltd" value={colors.footerText} onChange={(e) => setColors({ ...colors, footerText: e.target.value })} />
            </FormField>
          </div>
          <button className="pri-btn" type="submit" disabled={saving} style={{ display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #f7931e, #e8590c)", color: "#fff", borderRadius: 10, padding: "11px 22px", fontSize: 13.5, fontWeight: 700, fontFamily: "'Syne', sans-serif", marginTop: 22, opacity: saving ? 0.8 : 1 }}>
            <Save size={15} strokeWidth={2} /> {saving ? "Saving..." : "Save Branding"}
          </button>
        </form>
      </div>
      <p style={{ fontSize: 11.5, color: T.textMuted }}>
        Applies to this tenant's own dashboard (sidebar logo, browser tab icon/title) after login — never to the Super Admin panel, and not to the login screen itself (no per-tenant login routing exists yet).
      </p>
    </div>
  );
}

// "Owner" is the organization's first/primary admin User (Organization.createdBy)
// — no separate collection, per the same reasoning documented on the User model.
function TenantOwnerTab({ orgId, organization, ownerForm, setOwnerForm, departments, savingOwner, handleSaveOwner, showToast, onUpdated }) {
  const owner = organization.createdBy;
  const [photo, setPhoto] = useState(owner?.profileImage || null);

  if (!owner) {
    return (
      <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: 28, maxWidth: 760 }}>
        <p style={{ fontSize: 13, color: T.textMuted }}>This organization has no owner/admin account on record.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 760 }}>
      <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: 28 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: T.textPrimary, marginBottom: 16 }}>Owner Photo</div>
        <LogoUploadField
          label="Photo"
          value={photo}
          uploadUrl={`/superadmin/organizations/${orgId}/owner-photo`}
          deleteUrl={`/superadmin/organizations/${orgId}/owner-photo`}
          fieldName="photo"
          onChange={(url) => { setPhoto(url); onUpdated(); }}
          showToast={showToast}
        />
      </div>

      <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: 28 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: T.textPrimary, marginBottom: 16 }}>Owner Details</div>
        <form onSubmit={handleSaveOwner}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField label="Full Name"><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="text" value={ownerForm.name} onChange={(e) => setOwnerForm({ ...ownerForm, name: e.target.value })} required /></FormField>
            <FormField label="Email"><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="email" value={ownerForm.email} onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })} required /></FormField>
            <FormField label="Phone"><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="text" value={ownerForm.phone} onChange={(e) => setOwnerForm({ ...ownerForm, phone: e.target.value })} /></FormField>
            <FormField label="Designation"><input className="inp" style={{ ...baseInp, paddingLeft: 14 }} type="text" placeholder="e.g. Founder, CEO" value={ownerForm.designation} onChange={(e) => setOwnerForm({ ...ownerForm, designation: e.target.value })} /></FormField>
            <FormField label="Department">
              <select className="inp" style={{ ...baseInp, paddingLeft: 14, appearance: "none" }} value={ownerForm.departmentId || ""} onChange={(e) => setOwnerForm({ ...ownerForm, departmentId: e.target.value })}>
                <option value="">No department</option>
                {(departments || []).map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </FormField>
            <FormField label="Status">
              <div style={{ display: "flex", alignItems: "center", height: 42 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 6, color: owner.isActive ? T.green : T.textMuted, background: owner.isActive ? T.greenBg : T.borderLight, textTransform: "uppercase" }}>
                  {owner.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </FormField>
          </div>
          {owner.lastLogin && (
            <p style={{ fontSize: 11.5, color: T.textMuted, marginTop: 14 }}>Last login: {fmtDate(owner.lastLogin)}</p>
          )}
          <button className="pri-btn" type="submit" disabled={savingOwner} style={{ display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #f7931e, #e8590c)", color: "#fff", borderRadius: 10, padding: "11px 22px", fontSize: 13.5, fontWeight: 700, fontFamily: "'Syne', sans-serif", marginTop: 22, opacity: savingOwner ? 0.8 : 1 }}>
            <Save size={15} strokeWidth={2} /> {savingOwner ? "Saving..." : "Save Owner Details"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Tenant Services Tab ──────────────────────────────────────────────────────
// Shown inside TenantDetailPage on the "Proposal Services" tab.
// Superadmin toggles which catalog services this tenant can use when
// building proposals. All-enabled = no TenantServiceAccess document in DB
// (fail-open). The toggle list maps the global catalog.
function TenantServicesTab({ serviceCatalog, enabledServiceKeys, onChange, onSave, saving }) {
  // null = all enabled (no explicit restriction set yet)
  const effectiveKeys = enabledServiceKeys ?? serviceCatalog.map((s) => s.key);
  const enabledSet = new Set(effectiveKeys);

  const toggleKey = (key) => {
    const next = new Set(enabledSet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange([...next]);
  };

  const toggleAll = () => {
    if (enabledSet.size === serviceCatalog.length) {
      onChange([]);
    } else {
      onChange(serviceCatalog.map((s) => s.key));
    }
  };

  const allEnabled = enabledSet.size === serviceCatalog.length;

  return (
    <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: 28, maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary }}>Proposal Services</div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>
            Toggle which services this tenant can see when creating proposals.
            {enabledServiceKeys === null && (
              <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, color: T.brand }}>All enabled (default)</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          style={{ fontSize: 12.5, fontWeight: 600, color: T.brand, background: T.brandLight, border: `1px solid ${T.brandMid}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit" }}
        >
          {allEnabled ? "Disable All" : "Enable All"}
        </button>
      </div>

      {serviceCatalog.length === 0 ? (
        <p style={{ fontSize: 13, color: T.textMuted }}>Loading services…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {serviceCatalog.map((svc) => {
            const isOn = enabledSet.has(svc.key);
            return (
              <label
                key={svc.key}
                style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "13px 16px",
                  borderRadius: 11, border: `1.5px solid ${isOn ? T.brandMid : T.border}`,
                  background: isOn ? T.brandLight : T.inputBg, cursor: "pointer", transition: "all .14s",
                }}
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggleKey(svc.key)}
                  style={{ width: 16, height: 16, accentColor: T.brand, flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: isOn ? T.brand : T.textPrimary }}>{svc.label}</div>
                  <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>key: {svc.key}</div>
                </div>
                <span style={{
                  fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 6,
                  color: isOn ? T.green : T.textMuted,
                  background: isOn ? T.greenBg : T.borderLight,
                  border: `1px solid ${isOn ? T.greenBorder : T.border}`,
                  textTransform: "uppercase", letterSpacing: ".07em",
                }}>
                  {isOn ? "Enabled" : "Disabled"}
                </span>
              </label>
            );
          })}
        </div>
      )}

      <button
        onClick={onSave}
        disabled={saving}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "linear-gradient(135deg, #f7931e, #e8590c)", color: "#fff",
          borderRadius: 10, padding: "11px 22px", fontSize: 13.5, fontWeight: 700,
          fontFamily: "'Syne', sans-serif", border: "none", cursor: saving ? "not-allowed" : "pointer",
          marginTop: 22, opacity: saving ? 0.8 : 1,
        }}
      >
        <Save size={15} strokeWidth={2} /> {saving ? "Saving..." : "Save Service Access"}
      </button>
    </div>
  );
}
