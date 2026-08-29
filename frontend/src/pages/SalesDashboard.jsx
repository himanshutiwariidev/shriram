import React, { useState } from "react";
import { LogOut, Users, Target, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import ClientsPage from "./ClientsPage";
import SalesTargetSection from "./sections/SalesTargetSection";
import TenantLogo from "../components/TenantLogo";
import NotificationBell from "../components/NotificationBell";
import useTenantTheme from "../hooks/useTenantTheme";
import { TenantBrandingProvider } from "../context/TenantBrandingContext";
import { useAuth } from "../context/AuthContext";

const TABS = [
  { id: "clients",  label: "Clients",   Icon: Users  },
  { id: "myTarget", label: "My Target", Icon: Target },
];

const ICON_COLORS = {
  clients:  "#f59e0b",
  myTarget: "#22c55e",
};

function SalesDashboardInner() {
  const navigate  = useNavigate();
  const { logout, user } = useAuth();
  const { T, branding } = useTenantTheme();
  const [activeTab, setActiveTab] = useState("clients");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try { await API.post("/users/logout"); } catch {}
    logout();
    navigate("/");
  };

  const currentLabel = TABS.find(t => t.id === activeTab)?.label || "Clients";
  const userName = user?.name || "Sales";
  const userInitials = userName.trim().split(/\s+/).map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: ${T.bg}; min-height: 100vh; }

        .sales-nav-btn { border: none; cursor: pointer; font-family: inherit; background: transparent; transition: all .16s; }
        .sales-nav-btn:hover:not(.sales-nav-active) { background: rgba(255,255,255,0.07) !important; color: #fff !important; }

        .sales-logout-btn { transition: background .16s, color .16s; cursor: pointer; border: none; font-family: inherit; }
        .sales-logout-btn:hover { background: rgba(239,68,68,0.18) !important; color: #fca5a5 !important; }

        aside nav::-webkit-scrollbar { width: 3px; }
        aside nav::-webkit-scrollbar-track { background: transparent; }
        aside nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 2px; }
        aside nav::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.35); }
      `}</style>

      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Inter', sans-serif", color: T.textSecondary }}>

        {sidebarOpen && (
          <div className="crm-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
        <aside className={`crm-sidebar${sidebarOpen ? " sidebar-open" : ""}`} style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 238, background: "#08132f", borderRight: "none", display: "flex", flexDirection: "column", zIndex: 300, boxShadow: "4px 0 24px rgba(0,0,0,0.28)" }}>
          <div style={{ padding: "24px 22px 22px", borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
            <TenantLogo logoUrl={branding.logoUrl} name={branding.name} primaryColor={branding.primaryColor} size={34} />
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", letterSpacing: ".1em", marginTop: 9, textTransform: "uppercase", fontWeight: 600 }}>Sales Portal</div>
          </div>
          <nav style={{ flex: 1, padding: "18px 12px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", overflowX: "hidden" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 800, padding: "4px 12px 8px" }}>NAVIGATION</div>
            {TABS.map(({ id, label, Icon }) => {
              const active = activeTab === id;
              const iconColor = ICON_COLORS[id] || "rgba(255,255,255,0.55)";
              return (
                <button
                  key={id}
                  className={`sales-nav-btn${active ? " sales-nav-active" : ""}`}
                  onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "10px 12px", borderRadius: 9, textAlign: "left",
                    color: active ? "#ffffff" : "rgba(255,255,255,0.88)",
                    background: active ? "rgba(255,255,255,0.1)" : "transparent",
                    fontWeight: active ? 600 : 500, fontSize: 13.5,
                    borderLeft: `3px solid ${active ? "#60a5fa" : "transparent"}`,
                  }}
                >
                  <Icon size={16} strokeWidth={active ? 2.2 : 2} color={iconColor} />
                  {label}
                  {active && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#60a5fa", flexShrink: 0 }} />}
                </button>
              );
            })}
          </nav>
          <div style={{ padding: "14px 12px", borderTop: "1px solid rgba(255,255,255,0.09)", flexShrink: 0 }}>
            <button className="sales-logout-btn" onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 9, color: "rgba(255,255,255,0.82)", background: "transparent", fontSize: 13.5, fontWeight: 500 }}>
              <LogOut size={15} strokeWidth={2} color="#f87171" /> Sign Out
            </button>
          </div>
        </aside>

        {/* ── CONTENT ─────────────────────────────────────────────────────── */}
        <div className="crm-content" style={{ marginLeft: 238, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <header className="crm-header" style={{ position: "sticky", top: 0, zIndex: 50, height: 64, padding: "0 36px", display: "flex", alignItems: "center", justifyContent: "space-between", background: T.header, borderBottom: `1px solid ${T.border}`, backdropFilter: "blur(16px)", boxShadow: "0 1px 0 0 #e8eaf0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button className="crm-hamburger" onClick={() => setSidebarOpen(true)} style={{ display: "none" }}>
                <Menu size={20} color={T.textPrimary} strokeWidth={2} />
              </button>
              <div>
                <h1 className="crm-header-title" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, color: T.textPrimary, lineHeight: 1 }}>{currentLabel}</h1>
                <p className="crm-header-date" style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3 }}>
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <NotificationBell />
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${T.brand}, ${T.brandMid})`, display: "grid", placeItems: "center", boxShadow: `0 2px 10px ${T.brand}4d`, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: "#fff" }}>
                  {userInitials}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, lineHeight: 1 }}>{userName}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>Sales Executive</div>
                </div>
              </div>
            </div>
          </header>

          <main className="crm-main" style={{ flex: 1 }}>
            {activeTab === "clients" ? (
              <ClientsPage />
            ) : (
              <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>
                <SalesTargetSection myUserId={user?.id} />
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

export default function SalesDashboard() {
  return (
    <TenantBrandingProvider>
      <SalesDashboardInner />
    </TenantBrandingProvider>
  );
}
