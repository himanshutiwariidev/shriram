import React, { useEffect, useState } from "react";
import {
  Activity, BarChart2, BadgeCheck, Briefcase, Building2,
  CalendarDays, CheckCircle2, Clock, Gem, GitBranch,
  Headphones, Layers, ListChecks, Lock, Mail, MapPin,
  Receipt, Settings, ShieldCheck, Users, Wallet,
} from "lucide-react";
import imageOne from "../../assets/imageone.png";
import imageTwo from "../../assets/imagetwo.png";
import imageThree from "../../assets/imagethree.webp";
import API from "../../services/api";
import EmailSettingsSection from "./EmailSettingsSection";
import AiSettingsSection from "./AiSettingsSection";
import { useAuth } from "../../context/AuthContext";
import { resolveFileUrl } from "../../utils/fileUrl";

/* ── helpers ─────────────────────────────────────────────────────────────── */
const STATUS_META = {
  active:    { label: "Active",    color: "#047857", bg: "#ecfdf5", border: "#86efac", dot: "#22c55e" },
  trial:     { label: "Trial",     color: "#b45309", bg: "#fffbeb", border: "#fcd34d", dot: "#f59e0b" },
  suspended: { label: "Suspended", color: "#dc2626", bg: "#fef2f2", border: "#fca5a5", dot: "#ef4444" },
  expired:   { label: "Expired",   color: "#64748b", bg: "#f8fafc", border: "#cbd5e1", dot: "#94a3b8" },
};

const fmtLong    = (v) => { if (!v) return "-"; const d = new Date(v); return isNaN(d) ? "-" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); };
const fmtWeekday = (v) => { if (!v) return ""; const d = new Date(v); return isNaN(d) ? "" : d.toLocaleDateString("en-IN", { weekday: "long" }); };
const getDaysLeft = (v) => { if (!v) return null; const d = new Date(v); if (isNaN(d)) return null; return Math.ceil((d - new Date()) / 86400000); };
const initialsFor = (n = "") => n.trim().split(/\s+/).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "A";

/* ── Module visual catalogue (keyed by featureCatalog keys) ─────────────── */
const MODULE_META = {
  attendance:     { Icon: Clock,        bg: "#dbeafe", color: "#2563eb", grad: "linear-gradient(135deg,#60a5fa,#2563eb)", title: "Attendance",          desc: "Track employee attendance" },
  leaves:         { Icon: Layers,       bg: "#dcfce7", color: "#16a34a", grad: "linear-gradient(135deg,#4ade80,#16a34a)", title: "Leave Management",    desc: "Manage leaves & approvals" },
  payroll:        { Icon: Wallet,       bg: "#ede9fe", color: "#7c3aed", grad: "linear-gradient(135deg,#c4b5fd,#7c3aed)", title: "Payroll",             desc: "Salary, payslip & payroll" },
  clients:        { Icon: Users,        bg: "#ffedd5", color: "#ea580c", grad: "linear-gradient(135deg,#fb923c,#ea580c)", title: "Clients & CRM",       desc: "Manage clients & relationships" },
  projects:       { Icon: Briefcase,    bg: "#dbeafe", color: "#1d4ed8", grad: "linear-gradient(135deg,#93c5fd,#1d4ed8)", title: "Projects",            desc: "Manage projects & timelines" },
  tasks:          { Icon: ListChecks,   bg: "#fce7f3", color: "#db2777", grad: "linear-gradient(135deg,#f9a8d4,#db2777)", title: "Tasks",               desc: "Assign & track team tasks" },
  branches:       { Icon: Building2,    bg: "#fef3c7", color: "#d97706", grad: "linear-gradient(135deg,#fcd34d,#d97706)", title: "Branch Management",   desc: "Manage all branches" },
  departments:    { Icon: GitBranch,    bg: "#ccfbf1", color: "#0f766e", grad: "linear-gradient(135deg,#5eead4,#0f766e)", title: "Dept. Management",    desc: "Manage departments" },
  meetings:       { Icon: CalendarDays, bg: "#ede9fe", color: "#7c3aed", grad: "linear-gradient(135deg,#a78bfa,#7c3aed)", title: "Meeting Scheduler",   desc: "Schedule & manage meetings" },
  expenses:       { Icon: Receipt,      bg: "#d1fae5", color: "#059669", grad: "linear-gradient(135deg,#6ee7b7,#059669)", title: "Expense Tracker",     desc: "Track & manage expenses" },
  gmb_scraper:    { Icon: MapPin,       bg: "#e0f2fe", color: "#0369a1", grad: "linear-gradient(135deg,#38bdf8,#0369a1)", title: "GMB Lead Scraper",    desc: "Extract leads from Google Maps" },
  mail_automation:{ Icon: Mail,         bg: "#fee2e2", color: "#dc2626", grad: "linear-gradient(135deg,#fca5a5,#dc2626)", title: "Mail Automation",     desc: "Automate & track email campaigns" },
};

/* ── featureCatalog key → tab ID ────────────────────────────────────────── */
const FEATURE_TAB = {
  attendance:      "attendance",
  leaves:          "leavePolicy",
  payroll:         "salary",
  clients:         "clients",
  projects:        "projects",
  tasks:           "tasks",
  branches:        "branches",
  departments:     "departments",
  meetings:        "meetings",
  expenses:        "expenseDashboard",
  gmb_scraper:     "gmbScraper",
  mail_automation: "mailAutomation",
};

/* ── Quick Actions ───────────────────────────────────────────────────────── */
const QUICK_ACTIONS = [
  { Icon: Users,       color: "#7c3aed", bg: "#ede9fe", title: "Manage Team",      sub: "View & manage team",  tab: "users" },
  { Icon: BarChart2,   color: "#16a34a", bg: "#dcfce7", title: "View Reports",     sub: "Analytics & insights",     tab: "reportBuilder" },
  { Icon: Activity,    color: "#d97706", bg: "#fef3c7", title: "System Activity",  sub: "Recent activity logs",     tab: "dashboard" },
  { Icon: Settings,    color: "#0369a1", bg: "#e0f2fe", title: "Account Settings", sub: "Configure workspace",      tab: "myProfile" },
  { Icon: Headphones,  color: "#dc2626", bg: "#fee2e2", title: "Help & Support",   sub: "Get help & support",       tab: null },
];

export default function MyProfileSection({ subscription, featureCatalog, setTab, onOpenSupport }) {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);

  const goTo = (tabId) => {
    if (!tabId || !setTab) return;
    setTab(tabId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    API.get("/users/me").then(({ data }) => {
      setProfile(data.user);
      updateUser({ id: data.user._id || data.user.id, name: data.user.name, email: data.user.email, role: data.user.role, tenantId: data.user.tenantId, profileImage: data.user.profileImage || "" });
    }).catch(() => {});
  }, [updateUser]);

  const org           = subscription?.organization || {};
  const enabledFeatures = subscription?.enabledFeatures || [];
  const planName      = org.planName || "Starter";
  const orgStatus     = org.status || "trial";
  const sm            = STATUS_META[orgStatus] || STATUS_META.expired;
  const allCatalog    = (featureCatalog || []).flatMap((g) => g.features.map((f) => ({ ...f, group: g.group })));
  const enabledCount  = allCatalog.filter((f) => enabledFeatures.includes(f.key)).length;
  const expiryDate    = org.subscriptionExpiresAt || org.trialEndsAt;
  const remaining     = getDaysLeft(expiryDate);
  const orgName       = org.name || "";

  if (!profile) return (
    <div style={{ padding: 56, textAlign: "center", color: "#94a3b8", fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
      Loading...
    </div>
  );

  const avatarUrl  = profile.profileImage ? resolveFileUrl(profile.profileImage) : null;
  const adminName  = profile.name || "Tenant Admin";
  const adminRole  = profile.designation || "Tenant Administrator";
  const daysColor  = !remaining ? "#64748b" : remaining <= 0 ? "#64748b" : remaining <= 7 ? "#dc2626" : remaining <= 30 ? "#d97706" : "#059669";
  const daysBarPct = (() => {
    if (!remaining || remaining <= 0) return 0;
    if (!org.createdAt || !expiryDate) return 50;
    const total = Math.ceil((new Date(expiryDate) - new Date(org.createdAt)) / 86400000);
    return total > 0 ? Math.max(3, Math.min(100, Math.round((remaining / total) * 100))) : 50;
  })();

  return (
    <div className="mp-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .mp-root { font-family: 'Inter', sans-serif; color: #0f172a; width: 100%; box-sizing: border-box; }

        /* ── Shell ── */
        .mp-shell { display: grid; grid-template-columns: 270px minmax(0,1fr); gap: 20px; align-items: start; }

        /* ── Sidebar ── */
        .mp-sidebar {
          background: #fff; border: 1px solid #e8eef6; border-radius: 20px;
          padding: 28px 22px 0; box-shadow: 0 4px 24px rgba(15,23,42,.07);
          display: flex; flex-direction: column; gap: 18px; overflow: hidden;
        }
        .mp-avatar-wrap {
          width: 100px; height: 100px; margin: 0 auto; border-radius: 50%;
          padding: 3px; background: linear-gradient(135deg,#c7d2fe,#818cf8,#6366f1);
          box-shadow: 0 8px 24px rgba(99,102,241,.22); position: relative;
        }
        .mp-avatar {
          width: 100%; height: 100%; border-radius: 50%;
          background: linear-gradient(135deg,#1e293b,#334155);
          display: grid; place-items: center;
          font-size: 28px; font-weight: 800; color: #fff; overflow: hidden;
        }
        .mp-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .mp-online { position: absolute; right: 5px; bottom: 5px; width: 16px; height: 16px; border-radius: 50%; background: #22c55e; border: 3px solid #fff; }
        .mp-name { font-size: 22px; font-weight: 800; text-align: center; color: #0f172a; margin: 0; }
        .mp-role-badge {
          display: inline-flex; align-items: center; gap: 6px; margin: 0 auto;
          padding: 5px 12px; border-radius: 99px;
          background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8;
          font-size: 11.5px; font-weight: 700;
        }
        .mp-meta { display: flex; flex-direction: column; gap: 8px; }
        .mp-meta-row { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 600; color: #475569; }
        .mp-meta-icon { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; flex-shrink: 0; }
        .mp-divider { height: 1px; background: #f1f5f9; }
        .mp-contact-lbl { font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #94a3b8; }
        .mp-contact-list { display: flex; flex-direction: column; gap: 11px; }
        .mp-contact-row { display: flex; align-items: center; gap: 10px; font-size: 12.5px; font-weight: 600; color: #334155; overflow-wrap: anywhere; }
        .mp-contact-icon { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; flex-shrink: 0; }

        /* sidebar illustration strip */
        .mp-sidebar-illus {
          margin: 0 -22px; padding: 18px 22px 22px;
          background: linear-gradient(180deg,#f8faff 0%,#eef2ff 100%);
          display: flex; align-items: flex-end; gap: 12px;
          position: relative; overflow: hidden;
        }
        .mp-illus-circle {
          position: absolute; right: -20px; bottom: -20px; width: 100px; height: 100px;
          border-radius: 50%; background: rgba(99,102,241,.08);
        }

        /* ── Main ── */
        .mp-main { display: flex; flex-direction: column; gap: 18px; min-width: 0; }

        /* welcome card */
        .mp-welcome {
          background: #fff; border: 1px solid #e8eef6; border-radius: 18px;
          padding: 24px 28px; display: flex; align-items: center; gap: 16px;
          box-shadow: 0 4px 24px rgba(15,23,42,.07); position: relative; overflow: hidden;
        }
        .mp-welcome-emoji { width: 52px; height: 52px; border-radius: 14px; background: #f1f5f9; display: grid; place-items: center; font-size: 24px; flex-shrink: 0; }
        .mp-welcome-hi { color: #64748b; font-size: 13px; font-weight: 500; margin: 0; }
        .mp-welcome-name { font-size: 26px; font-weight: 800; margin: 2px 0 4px; color: #0f172a; }
        .mp-welcome-sub { color: #64748b; font-size: 13px; font-weight: 500; margin: 0; }
        .mp-welcome-deco { position: absolute; right: 24px; top: 50%; transform: translateY(-50%); display: flex; align-items: flex-end; gap: 10px; pointer-events: none; }
        .mp-welcome-deco span { font-size: 36px; filter: drop-shadow(0 4px 8px rgba(0,0,0,.1)); line-height: 1; }

        /* plan card */
        .mp-plan-card {
          background: #fff; border: 1px solid #e8eef6; border-radius: 18px;
          padding: 26px 28px; box-shadow: 0 4px 24px rgba(15,23,42,.07);
          display: flex; flex-direction: column; gap: 20px;
        }
        .mp-plan-top { display: flex; gap: 24px; align-items: flex-start; }
        .mp-plan-left { flex: 1; display: flex; flex-direction: column; gap: 14px; }
        .mp-plan-label-row { display: flex; align-items: center; gap: 10px; }
        .mp-plan-lbl { font-size: 10px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #94a3b8; }
        .mp-plan-gem { width: 52px; height: 52px; border-radius: 14px; background: linear-gradient(135deg,#eff6ff,#dbeafe); display: grid; place-items: center; flex-shrink: 0; box-shadow: 0 2px 10px rgba(37,99,235,.14); }
        .mp-plan-name { font-size: 38px; font-weight: 900; color: #0f172a; line-height: 1; text-transform: capitalize; }
        .mp-status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 99px; font-size: 11.5px; font-weight: 700; }
        .mp-status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .mp-plan-right { flex-shrink: 0; width: 46%; }
        .mp-date-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .mp-date-box { background: #f8fafc; border: 1px solid #e8eef6; border-radius: 14px; padding: 16px 14px; }
        .mp-date-lbl { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; color: #94a3b8; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
        .mp-date-val { font-size: 18px; font-weight: 800; color: #0f172a; }
        .mp-date-day { font-size: 12px; font-weight: 600; color: #94a3b8; margin-top: 4px; }

        /* timeline inner card */
        .mp-timeline-card { background: #f8fafc; border: 1px solid #e8eef6; border-radius: 14px; padding: 18px 20px; }
        .mp-timeline-lbl { font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
        .mp-bar-wrap { position: relative; padding: 18px 0 6px; }
        .mp-bar-track { height: 10px; background: #e2e8f0; border-radius: 99px; overflow: visible; }
        .mp-bar-fill { height: 100%; border-radius: 99px; transition: width 1s cubic-bezier(.4,0,.2,1); }
        .mp-turtle-wrap { position: absolute; top: 18px; transform: translate(-50%, -50%); display: flex; align-items: center; pointer-events: none; }
        .mp-turtle { font-size: 30px; line-height: 1; animation: turtleWiggle .9s ease-in-out infinite; }
        .mp-speed-lines { display: flex; flex-direction: column; gap: 3px; margin-right: 1px; }
        .mp-speed-lines span { display: block; height: 2.5px; border-radius: 99px; background: linear-gradient(90deg,transparent,#ef4444); animation: speedPulse .55s ease-in-out infinite; }
        .mp-speed-lines span:nth-child(1) { width: 22px; opacity: .85; }
        .mp-speed-lines span:nth-child(2) { width: 32px; animation-delay: .1s; }
        .mp-speed-lines span:nth-child(3) { width: 16px; opacity: .55; animation-delay: .2s; }
        @keyframes turtleWiggle {
          0%,100% { transform: translateY(0) rotate(-2deg) scaleX(-1); }
          50%      { transform: translateY(-3px) rotate(2deg) scaleX(-1); }
        }
        @keyframes speedPulse {
          0%,100% { opacity: .2; transform: scaleX(.65); }
          50%      { opacity: .8; transform: scaleX(1); }
        }

        /* plan footer message */
        .mp-plan-footer { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 18px; border-radius: 99px; background: #f0f4ff; border: 1px solid #c7d2fe; color: #4338ca; font-size: 12.5px; font-weight: 600; align-self: center; }

        /* quick actions */
        .mp-qa-grid { display: grid; grid-template-columns: repeat(5,minmax(0,1fr)); gap: 12px; }
        .mp-qa-card {
          background: #fff; border: 1px solid #e8eef6; border-radius: 16px;
          padding: 18px 14px 14px; display: flex; flex-direction: column; gap: 12px;
          box-shadow: 0 4px 16px rgba(15,23,42,.06); transition: transform .15s, box-shadow .15s;
          cursor: pointer;
        }
        .mp-qa-card:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(15,23,42,.11); }
        .mp-qa-icon { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; }
        .mp-qa-title { font-size: 12.5px; font-weight: 700; color: #0f172a; }
        .mp-qa-sub { font-size: 11px; color: #94a3b8; font-weight: 500; }
        .mp-qa-arrow { color: #f97316; font-size: 14px; font-weight: 700; margin-top: auto; }

        /* stats row */
        .mp-stats-row { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 14px; }
        .mp-stat-card {
          background: #fff; border: 1px solid #e8eef6; border-radius: 14px;
          padding: 18px; box-shadow: 0 4px 16px rgba(15,23,42,.06);
          display: flex; align-items: center; gap: 14px;
        }
        .mp-stat-icon { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; flex-shrink: 0; }
        .mp-stat-val { font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1; }
        .mp-stat-lbl { font-size: 11.5px; font-weight: 600; color: #64748b; margin-top: 3px; }
        .mp-stat-sub { font-size: 10.5px; font-weight: 700; margin-top: 2px; }

        /* module access */
        .mp-module-section {
          background: #fff; border: 1px solid #e8eef6; border-radius: 20px;
          padding: 24px; box-shadow: 0 4px 24px rgba(15,23,42,.07); margin-top: 20px;
        }
        .mp-module-hdr { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
        .mp-module-hdr-title { font-size: 12px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #0f172a; }
        .mp-module-hdr-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 13px; border-radius: 99px;
          background: #f0fdf4; border: 1px solid #86efac;
          color: #15803d; font-size: 11.5px; font-weight: 700;
        }
        .mp-module-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 14px; }
        .mp-mod-card {
          border-radius: 16px; padding: 18px;
          display: flex; flex-direction: column; gap: 14px;
          transition: transform .15s, box-shadow .15s; cursor: pointer;
        }
        .mp-mod-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(15,23,42,.12); }
        .mp-mod-icon {
          width: 52px; height: 52px; border-radius: 14px;
          display: grid; place-items: center; flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0,0,0,.18);
        }
        .mp-mod-title { font-size: 14px; font-weight: 700; color: #0f172a; line-height: 1.3; }
        .mp-mod-desc { font-size: 11.5px; color: #64748b; font-weight: 500; margin-top: 3px; line-height: 1.4; }
        .mp-mod-footer { display: flex; align-items: center; justify-content: space-between; }
        .mp-mod-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 700;
        }
        .mp-mod-badge--off { background: #f8fafc; border: 1px solid #e2e8f0; color: #94a3b8; }
        .mp-mod-arrow { font-size: 16px; color: #94a3b8; font-weight: 700; }
        .mp-module-footer-bar {
          margin-top: 22px; padding: 14px 18px;
          background: #f8fafc; border-radius: 12px; border: 1px solid #e8eef6;
          display: flex; align-items: center; justify-content: space-around;
          gap: 12px; flex-wrap: wrap;
        }
        .mp-mf-item { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: #64748b; }
        .mp-mf-item strong { color: #0f172a; font-weight: 800; }

        /* config cards */
        .mp-config-row {
          display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;
          align-items: stretch;
        }
        .mp-config-card {
          background: #fff; border: 1px solid #e8eef6; border-radius: 18px;
          padding: 22px 24px; box-shadow: 0 4px 24px rgba(15,23,42,.07);
          display: flex; flex-direction: column;
        }
        .mp-config-hdr {
          font-size: 10.5px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase;
          color: #94a3b8; display: flex; align-items: center; gap: 10px; margin-bottom: 20px;
          padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;
        }
        .mp-config-hdr::after { content: ''; flex: 1; height: 1px; background: #f1f5f9; }

        @media (max-width: 1100px) {
          .mp-qa-grid { grid-template-columns: repeat(3,minmax(0,1fr)); }
          .mp-module-grid { grid-template-columns: repeat(3,minmax(0,1fr)); }
        }
        @media (max-width: 900px) {
          .mp-shell { grid-template-columns: 1fr; }
          .mp-plan-card { grid-template-columns: 1fr; gap: 16px; }
          .mp-stats-row { grid-template-columns: repeat(2,minmax(0,1fr)); }
          .mp-sidebar-illus { display: none; }
          .mp-config-row { grid-template-columns: 1fr; }
        }
        @media (max-width: 680px) {
          .mp-qa-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
          .mp-module-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
          .mp-welcome-deco { display: none; }
        }
        @media (max-width: 480px) {
          .mp-stats-row { grid-template-columns: 1fr; }
          .mp-module-grid { grid-template-columns: 1fr; }
          .mp-qa-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      {/* ══ TWO-COLUMN SHELL ══════════════════════════════════════════════ */}
      <div className="mp-shell">

        {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
        <aside className="mp-sidebar">
          {/* Avatar */}
          <div className="mp-avatar-wrap">
            <div className="mp-avatar">
              {avatarUrl ? <img src={avatarUrl} alt={adminName} /> : initialsFor(adminName)}
            </div>
            <div className="mp-online" />
          </div>

          {/* Name + role */}
          <h1 className="mp-name">{adminName}</h1>
          <div className="mp-role-badge">
            <BadgeCheck size={13} color="#2563eb" strokeWidth={2.5} />
            Tenant Admin
          </div>

          {/* Designation + org */}
          <div className="mp-meta">
            {adminRole && (
              <div className="mp-meta-row">
                <span className="mp-meta-icon" style={{ background: "#f0fdf4" }}>
                  <Users size={13} color="#16a34a" strokeWidth={2.3} />
                </span>
                {adminRole}
              </div>
            )}
            {orgName && (
              <div className="mp-meta-row">
                <span className="mp-meta-icon" style={{ background: "#eff6ff" }}>
                  <ShieldCheck size={13} color="#2563eb" strokeWidth={2.3} />
                </span>
                {orgName}
              </div>
            )}
          </div>

          <div className="mp-divider" />

          {/* Contact */}
          <div className="mp-contact-lbl">Contact</div>
          <div className="mp-contact-list">
            {profile.email && (
              <div className="mp-contact-row">
                <span className="mp-contact-icon" style={{ background: "#f5f3ff" }}>
                  <Mail size={13} color="#7c3aed" strokeWidth={2.2} />
                </span>
                {profile.email}
              </div>
            )}
            {profile.phone && (
              <div className="mp-contact-row">
                <span className="mp-contact-icon" style={{ background: "#f0fdf4" }}>
                  <span style={{ color: "#16a34a", fontWeight: 700, fontSize: 13 }}>📞</span>
                </span>
                {profile.phone}
              </div>
            )}
            <div className="mp-contact-row">
              <span className="mp-contact-icon" style={{ background: sm.bg }}>
                <ShieldCheck size={13} color={sm.color} strokeWidth={2.2} />
              </span>
              {sm.label} workspace
            </div>
          </div>

          {/* Decorative illustration strip */}
          <div className="mp-sidebar-illus">
            <img src={imageTwo} alt="" style={{ width: "100%", objectFit: "contain", pointerEvents: "none", userSelect: "none", display: "block" }} />
            <div className="mp-illus-circle" />
          </div>
        </aside>

        {/* ── MAIN COLUMN ─────────────────────────────────────────────── */}
        <div className="mp-main">

          {/* Welcome banner */}
          <div className="mp-welcome">
            <div className="mp-welcome-emoji">👋</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p className="mp-welcome-hi">Welcome back,</p>
              <div className="mp-welcome-name">{adminName}!</div>
              <p className="mp-welcome-sub">Here's what's happening in your organization.</p>
            </div>
            <div className="mp-welcome-deco">
              <img src={imageOne} alt="" style={{ height: 90, objectFit: "contain", pointerEvents: "none", userSelect: "none" }} />
            </div>
          </div>

          {/* Plan + Subscription card */}
          <div className="mp-plan-card">

            {/* ── Top row: plan info LEFT + date boxes RIGHT ── */}
            <div className="mp-plan-top">
              <div className="mp-plan-left">
                <div className="mp-plan-label-row">
                  <span className="mp-plan-lbl">Current Plan</span>
                  <div className="mp-status-pill" style={{ background: sm.bg, color: sm.color, border: `1px solid ${sm.border}` }}>
                    <div className="mp-status-dot" style={{ background: sm.dot }} />
                    {sm.label}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span className="mp-plan-gem">
                    <Gem size={22} color="#2563eb" strokeWidth={2.2} />
                  </span>
                  <span className="mp-plan-name">{planName}</span>
                </div>
              </div>
              <div className="mp-plan-right">
                <div className="mp-date-row">
                  <div className="mp-date-box">
                    <div className="mp-date-lbl">📅 Started on</div>
                    <div className="mp-date-val">{fmtLong(org.createdAt)}</div>
                    <div className="mp-date-day">{fmtWeekday(org.createdAt)}</div>
                  </div>
                  <div className="mp-date-box">
                    <div className="mp-date-lbl">📅 Expires on</div>
                    <div className="mp-date-val">{fmtLong(expiryDate)}</div>
                    <div className="mp-date-day">{fmtWeekday(expiryDate)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Timeline inner card ── */}
            <div className="mp-timeline-card">
              <div className="mp-timeline-lbl">
                <span>Subscription Timeline</span>
                {remaining !== null && (
                  <span style={{ color: daysColor, fontSize: 14, fontWeight: 800 }}>
                    {remaining > 0 ? `${remaining} days left` : remaining === 0 ? "Last day" : "Expired"}
                  </span>
                )}
              </div>
              {remaining !== null && (
                <div className="mp-bar-wrap">
                  <div className="mp-bar-track">
                    <div className="mp-bar-fill" style={{ width: `${daysBarPct}%`, background: `linear-gradient(90deg,${daysColor}77,${daysColor})` }} />
                  </div>
                  <div className="mp-turtle-wrap" style={{ left: `${Math.min(Math.max(daysBarPct, 4), 96)}%` }}>
                    <div className="mp-speed-lines"><span /><span /><span /></div>
                    <span className="mp-turtle">🐢</span>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{fmtLong(org.createdAt)}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>Started</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{fmtLong(expiryDate)}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>Expires</div>
                </div>
              </div>
            </div>

            {/* ── Footer message ── */}
            <div className="mp-plan-footer">
              <CalendarDays size={14} color="#4338ca" strokeWidth={2.2} />
              Your subscription is {sm.label.toLowerCase()}. Enjoy all {planName} features!
            </div>

          </div>

          {/* Quick Actions */}
          <div className="mp-qa-grid">
            {QUICK_ACTIONS.map(({ Icon, color, bg, title, sub, tab }) => (
              <div key={title} className="mp-qa-card"
                onClick={() => title === "Help & Support" ? onOpenSupport?.() : goTo(tab)}
                style={{ cursor: "pointer" }}>
                <div className="mp-qa-icon" style={{ background: bg }}>
                  <Icon size={20} color={color} strokeWidth={2.2} />
                </div>
                <div>
                  <div className="mp-qa-title">{title}</div>
                  <div className="mp-qa-sub">{sub}</div>
                </div>
                {/* <div className="mp-qa-arrow">→</div> */}
              </div>
            ))}
          </div>

          {/* Stats row */}
     {/*      <div className="mp-stats-row">
            <div className="mp-stat-card">
              <div className="mp-stat-icon" style={{ background: "#eff6ff" }}>
                <span style={{ fontSize: 18 }}>🧩</span>
              </div>
              <div>
                <div className="mp-stat-val">{allCatalog.length}</div>
                <div className="mp-stat-lbl">Total Modules</div>
                <div className="mp-stat-sub" style={{ color: "#16a34a" }}>{enabledCount} Active</div>
              </div>
            </div>
            <div className="mp-stat-card">
              <div className="mp-stat-icon" style={{ background: "#f0fdf4" }}>
                <ShieldCheck size={20} color="#16a34a" strokeWidth={2.2} />
              </div>
              <div>
                <div className="mp-stat-val">100%</div>
                <div className="mp-stat-lbl">Access Level</div>
                <div className="mp-stat-sub" style={{ color: "#16a34a" }}>Authorized</div>
              </div>
            </div>
            <div className="mp-stat-card">
              <div className="mp-stat-icon" style={{ background: "#f5f3ff" }}>
                <Users size={20} color="#7c3aed" strokeWidth={2.2} />
              </div>
              <div>
                <div className="mp-stat-val">Admin</div>
                <div className="mp-stat-lbl">User Role</div>
                <div className="mp-stat-sub" style={{ color: "#7c3aed" }}>Full Access</div>
              </div>
            </div>
            <div className="mp-stat-card">
              <div className="mp-stat-icon" style={{ background: sm.bg }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: sm.dot, display: "inline-block" }} />
              </div>
              <div>
                <div className="mp-stat-val">{sm.label}</div>
                <div className="mp-stat-lbl">Workspace</div>
                <div className="mp-stat-sub" style={{ color: sm.color }}>Fully Operational</div>
              </div>
            </div>
          </div>
 */}
        </div>
      </div>

      {/* ══ FULL-WIDTH SECTIONS ══════════════════════════════════════════ */}

      {/* Module Access */}
      {allCatalog.length > 0 && (
        <div className="mp-module-section">
          <div className="mp-module-hdr">
            <div className="mp-module-hdr-title">Module Access</div>
            <div className="mp-module-hdr-badge">
              <CheckCircle2 size={13} color="#16a34a" strokeWidth={2.5} />
              {enabledCount} / {allCatalog.length} Active
            </div>
          </div>

          <div className="mp-module-grid">
            {allCatalog.map((feat) => {
              const meta = MODULE_META[feat.key] || { Icon: ShieldCheck, bg: "#f1f5f9", color: "#64748b", grad: "linear-gradient(135deg,#cbd5e1,#94a3b8)", title: feat.label, desc: feat.group };
              const { Icon, bg, color, grad, title, desc } = meta;
              const on = enabledFeatures.includes(feat.key);
              const tabId = FEATURE_TAB[feat.key];
              return (
                <div key={feat.key} className="mp-mod-card"
                  onClick={() => on && goTo(tabId)}
                  style={{
                    background: on ? `${color}0a` : "#fff",
                    border: `1px solid ${on ? color + "28" : "#e8eef6"}`,
                    cursor: tabId && on ? "pointer" : "default",
                  }}>
                  {/* Icon + title row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div className="mp-mod-icon" style={{ background: on ? grad : "linear-gradient(135deg,#cbd5e1,#94a3b8)" }}>
                      <Icon size={24} color="#fff" strokeWidth={2} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="mp-mod-title">{title}</div>
                      <div className="mp-mod-desc">{desc}</div>
                    </div>
                  </div>
                  {/* Footer */}
                  <div className="mp-mod-footer">
                    {on ? (
                      <div className="mp-mod-badge" style={{ background: bg, border: `1px solid ${color}33`, color }}>
                        <div style={{ width: 15, height: 15, borderRadius: "50%", background: color, display: "grid", placeItems: "center", flexShrink: 0 }}>
                          <CheckCircle2 size={9} color="#fff" strokeWidth={3} />
                        </div>
                        Active
                      </div>
                    ) : (
                      <div className="mp-mod-badge mp-mod-badge--off">
                        <Lock size={11} strokeWidth={2.3} color="#94a3b8" /> Inactive
                      </div>
                    )}
                    <span className="mp-mod-arrow">→</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer bar */}
          <div className="mp-module-footer-bar">
            <div className="mp-mf-item">
              <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#ede9fe", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <ShieldCheck size={14} color="#7c3aed" strokeWidth={2.2} />
              </span>
              All Modules <strong>{allCatalog.length}</strong> <span style={{ color: "#16a34a" }}>Active</span>
            </div>
            <div style={{ width: 1, height: 20, background: "#e2e8f0", flexShrink: 0 }} />
            <div className="mp-mf-item">
              <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#ede9fe", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Users size={14} color="#7c3aed" strokeWidth={2.2} />
              </span>
              User Role <strong>Admin</strong> <span style={{ color: "#7c3aed" }}>Full Access</span>
            </div>
            <div style={{ width: 1, height: 20, background: "#e2e8f0", flexShrink: 0 }} />
            <div className="mp-mf-item">
              <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#fee2e2", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Lock size={14} color="#dc2626" strokeWidth={2.2} />
              </span>
              Access Level <strong>100%</strong> <span style={{ color: "#16a34a" }}>Authorized</span>
            </div>
          </div>
        </div>
      )}

      {/* Email + AI Configuration — side by side */}
      <div className="mp-config-row">
        <div className="mp-config-card">
          <div className="mp-config-hdr">
            <Mail size={14} color="#2563eb" strokeWidth={2.3} />
            Email Configuration
          </div>
          <EmailSettingsSection />
        </div>

        <div className="mp-config-card">
          <div className="mp-config-hdr">
            <span style={{ width: 20, height: 20, borderRadius: 6, background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", display: "inline-grid", placeItems: "center", flexShrink: 0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 6a6 6 0 0 1 6 6"/><circle cx="12" cy="12" r="2"/></svg>
            </span>
            AI Assistant Configuration
          </div>
          <AiSettingsSection />
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", marginTop: 16, minHeight: 0 }}>
            <img src={imageThree} alt="" style={{ width: "100%", maxHeight: 180, objectFit: "contain", objectPosition: "bottom", pointerEvents: "none", userSelect: "none", display: "block" }} />
          </div>
        </div>
      </div>

    </div>
  );
}
