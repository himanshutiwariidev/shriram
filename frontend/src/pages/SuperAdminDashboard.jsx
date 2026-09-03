import React from "react";
import { Building2, CheckCircle2, AlertCircle, LogOut, Plus, ShieldCheck, X, Layers, IndianRupee, MessageSquare } from "lucide-react";
import logo from "../assets/logo.png";
import OrganizationsSection from "./sections/OrganizationsSection";
import CreateTenantSection from "./sections/CreateTenantSection";
import ServiceCatalogSection from "./sections/ServiceCatalogSection";
import SubscriptionPaymentsSection from "./sections/SubscriptionPaymentsSection";
import SupportChatsSection from "./sections/SupportChatsSection";
import useSuperAdminDashboard from "./sections/useSuperAdminDashboard";
import { ConfirmModal, T } from "./sections/shared";

const TABS = [
  { id: "organizations", label: "Organizations",   Icon: Building2      },
  { id: "createTenant",  label: "New Tenant",       Icon: Plus           },
  { id: "serviceCatalog",label: "Service Catalog",  Icon: Layers         },
  { id: "payments",      label: "Payments",          Icon: IndianRupee   },
  { id: "supportChats",  label: "Support Inbox",     Icon: MessageSquare },
];

export default function SuperAdminDashboard() {
  const {
    organizations, loading, toast, setToast,
    deleteOrg, setDeleteOrg,
    tab, setTab,
    featureCatalog, plans, createTenantForm, setCreateTenantForm, creatingTenant, handleCreateTenant, handlePlanChange,
    pendingLogoFile, setPendingLogoFile, pendingOwnerPhotoFile, setPendingOwnerPhotoFile,
    handleSuspend, handleActivate, handleDeleteOrg, handleLogout,
  } = useSuperAdminDashboard();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: ${T.bg}; min-height: 100vh; }
        ::placeholder { color: ${T.textMuted}; font-size: 13px; }

        .card { transition: border-color .2s, box-shadow .2s, transform .2s; }
        .card:hover { border-color: ${T.brandMid} !important; box-shadow: 0 4px 24px rgba(247, 147, 30,.08) !important; transform: translateY(-1px); }

        .inp { transition: border-color .18s, box-shadow .18s; }
        .inp:focus { border-color: ${T.brand} !important; box-shadow: 0 0 0 3px rgba(247, 147, 30,.1) !important; outline: none; background: #fff !important; }

        .nav-btn { border: none; cursor: pointer; font-family: inherit; background: transparent; transition: all .16s; }
        .nav-btn:hover:not(.nav-active) { background: ${T.brandLight} !important; color: ${T.brand} !important; }

        .logout-btn { transition: background .16s, color .16s; cursor: pointer; border: none; font-family: inherit; }
        .logout-btn:hover { background: ${T.redBg} !important; color: ${T.red} !important; }

        @keyframes fadeUp  { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cardIn  { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes toastIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }

        .fade-up { animation: fadeUp .32s cubic-bezier(.22,1,.36,1) both; }
        .card-in  { animation: cardIn  .36s cubic-bezier(.22,1,.36,1) both; }
      `}</style>

      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Inter', sans-serif", color: T.textSecondary }}>

        {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
        <aside style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 238, background: T.sidebar, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", zIndex: 100, boxShadow: "1px 0 0 0 #e8eaf0" }}>
          <div style={{ padding: "24px 22px 22px", borderBottom: `1px solid ${T.borderLight}` }}>
            <img src={logo} alt="Bharat Bizmart" style={{ height: 34, width: "auto", display: "block" }} />
            <div style={{ fontSize: 10, color: T.textMuted, letterSpacing: ".1em", marginTop: 9, textTransform: "uppercase", fontWeight: 600 }}>Platform Control</div>
          </div>
          <nav style={{ flex: 1, padding: "18px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
            {TABS.map(({ id, label, Icon }) => {
              const active = tab === id;
              return (
                <button key={id} className={`nav-btn${active ? " nav-active" : ""}`} onClick={() => setTab(id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 9, textAlign: "left", color: active ? T.brand : T.textSecondary, background: active ? T.brandLight : "transparent", fontWeight: active ? 600 : 400, fontSize: 13.5, borderLeft: `3px solid ${active ? T.brand : "transparent"}` }}>
                  <Icon size={16} strokeWidth={active ? 2.2 : 1.8} color={active ? T.brand : T.textMuted} />
                  {label}
                  {active && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: T.brand, flexShrink: 0 }} />}
                </button>
              );
            })}
          </nav>
          <div style={{ padding: "14px 12px", borderTop: `1px solid ${T.borderLight}` }}>
            <button className="logout-btn" onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 9, color: T.textSecondary, background: "transparent", fontSize: 13.5, fontWeight: 500 }}>
              <LogOut size={15} strokeWidth={1.8} /> Sign Out
            </button>
          </div>
        </aside>

        {/* ── CONTENT ─────────────────────────────────────────────────────── */}
        <div style={{ marginLeft: 238, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <header style={{ position: "sticky", top: 0, zIndex: 50, height: 64, padding: "0 36px", display: "flex", alignItems: "center", justifyContent: "space-between", background: T.header, borderBottom: `1px solid ${T.border}`, backdropFilter: "blur(16px)", boxShadow: "0 1px 0 0 #e8eaf0" }}>
            <div>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: T.textPrimary, lineHeight: 1 }}>{TABS.find((t) => t.id === tab)?.label || "Organizations"}</h1>
              <p style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3 }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #f7931e, #e8590c)", display: "grid", placeItems: "center", boxShadow: "0 2px 10px rgba(247, 147, 30,.3)" }}>
                <ShieldCheck size={15} color="#fff" strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, lineHeight: 1 }}>Platform Owner</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>Super Admin</div>
              </div>
            </div>
          </header>

          <main style={{ padding: "30px 36px 64px", flex: 1 }}>
            {tab === "createTenant" ? (
              <CreateTenantSection
                createTenantForm={createTenantForm}
                setCreateTenantForm={setCreateTenantForm}
                handleCreateTenant={handleCreateTenant}
                handlePlanChange={handlePlanChange}
                creatingTenant={creatingTenant}
                featureCatalog={featureCatalog}
                pendingLogoFile={pendingLogoFile}
                setPendingLogoFile={setPendingLogoFile}
                pendingOwnerPhotoFile={pendingOwnerPhotoFile}
                setPendingOwnerPhotoFile={setPendingOwnerPhotoFile}
              />
            ) : tab === "serviceCatalog" ? (
              <ServiceCatalogSection />
            ) : tab === "payments" ? (
              <SubscriptionPaymentsSection />
            ) : tab === "supportChats" ? (
              <SupportChatsSection />
            ) : (
              <OrganizationsSection
                organizations={organizations}
                loading={loading}
                handleSuspend={handleSuspend}
                handleActivate={handleActivate}
                setDeleteOrg={setDeleteOrg}
              />
            )}
          </main>
        </div>

        {/* ── TOAST ─────────────────────────────────────────────────────────── */}
        {toast && (
          <div style={{ position: "fixed", bottom: 26, right: 26, zIndex: 9999, background: "#fff", border: `1.5px solid ${toast.ok ? T.greenBorder : T.redBorder}`, borderRadius: 13, padding: "14px 18px", fontWeight: 500, fontSize: 13.5, animation: "toastIn .26s cubic-bezier(.22,1,.36,1) both", display: "flex", alignItems: "center", gap: 11, boxShadow: "0 8px 32px rgba(0,0,0,.12)", maxWidth: 340 }}>
            {toast.ok ? <CheckCircle2 size={17} strokeWidth={2} color={T.green} /> : <AlertCircle size={17} strokeWidth={2} color={T.red} />}
            <span style={{ flex: 1, color: T.textPrimary }}>{toast.msg}</span>
            <button onClick={() => setToast(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex", padding: 0 }}><X size={14} strokeWidth={2} /></button>
          </div>
        )}

        {deleteOrg && (
          <ConfirmModal
            title="Delete Organization"
            message={`Are you sure you want to delete "${deleteOrg.name}"? This permanently deletes ALL of its data (users, clients, projects, everything). This action cannot be undone.`}
            onConfirm={handleDeleteOrg}
            onClose={() => setDeleteOrg(null)}
          />
        )}
      </div>
    </>
  );
}
