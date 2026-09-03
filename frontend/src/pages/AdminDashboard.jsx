import React, { useState, useMemo } from "react";
import { CheckCircle2, AlertCircle, Lock, LogOut, X, ChevronDown, Menu } from "lucide-react";
import TenantLogo from "../components/TenantLogo";
import useTenantTheme from "../hooks/useTenantTheme";
import { TenantBrandingProvider } from "../context/TenantBrandingContext";
import NotificationBell from "../components/NotificationBell";
import ProfileDropdown from "../components/ProfileDropdown";
import SupportChatBox from "../components/SupportChatBox";
import DashboardSection from "./sections/DashboardSection";
import TasksSection from "./sections/TasksSection";
import ClientsSection from "./sections/ClientsSection";
import ProjectsSection from "./sections/ProjectsSection";
import UsersSection from "./sections/UsersSection";
import SalarySection from "./sections/SalarySection";
import CreateTaskSection from "./sections/CreateTaskSection";
import CreateProjectSection from "./sections/CreateProjectSection";
import CreateUserSection from "./sections/CreateUserSection";
import BranchesSection from "./sections/BranchesSection";
import CreateBranchSection from "./sections/CreateBranchSection";
import DepartmentsSection from "./sections/DepartmentsSection";
import CreateDepartmentSection from "./sections/CreateDepartmentSection";
import MeetingsSection from "./sections/MeetingsSection";
import MyProfileSection from "./sections/MyProfileSection";
import DashboardModals from "./sections/DashboardModals";
import useAdminDashboard from "./sections/useAdminDashboard";
import { LockedFeatureModal } from "./sections/shared";
import AttendanceSection from "./sections/AttendanceSection";
import ExpenseDashboardSection from "./sections/ExpenseDashboardSection";
import ExpensesSection from "./sections/ExpensesSection";
import ExpenseCategoriesSection from "./sections/ExpenseCategoriesSection";
import VendorsSection from "./sections/VendorsSection";
import BudgetsSection from "./sections/BudgetsSection";
import ExpenseReportsSection from "./sections/ExpenseReportsSection";
import CollectionsSection from "./sections/CollectionsSection";
import EmailSettingsSection from "./sections/EmailSettingsSection";
import GmbScraperSection from "./sections/GmbScraperSection";
import MailAutomationSection from "./sections/MailAutomationSection";
import SalesTargetSection from "./sections/SalesTargetSection";
import AnnouncementSection from "./sections/AnnouncementSection";
import CompanyCalendarSection from "./sections/CompanyCalendarSection";
import ChatSection from "./sections/ChatSection";
import ReportBuilderSection from "./sections/ReportBuilderSection";
import HolidayShiftSection from "./sections/HolidayShiftSection";
import LeavePolicySection from "./sections/LeavePolicySection";
import PerformanceSection from "./sections/PerformanceSection";
import RenewalModal from "./sections/RenewalModal";
import AiChat from "../components/AiChat";
import { useAuth } from "../context/AuthContext";

const SIDEBAR_GROUPS = [
  // ── Main (no section header) ───────────────────────────────────────────────
  { type: "tab",   id: "dashboard" },
  { type: "group", key: "tasks",       label: "Tasks",       iconId: "tasks",       children: ["tasks", "createTask"] },
  { type: "group", key: "users",       label: "Users",       iconId: "users",       children: ["users", "createUser"] },
  { type: "tab",   id: "attendance" },
  { type: "tab",   id: "meetings" },
  { type: "tab",   id: "clients" },
  { type: "group", key: "projects",    label: "Projects",    iconId: "projects",    children: ["projects", "createProject"] },
  { type: "group", key: "branches",    label: "Branches",    iconId: "branches",    children: ["branches", "createBranch"] },
  { type: "group", key: "departments", label: "Departments", iconId: "departments", children: ["departments", "createDepartment"] },

  // ── Finance (static section header) ───────────────────────────────────────
  {
    type: "section", label: "Finance",
    items: [
      { type: "tab",   id: "salesTargets" },
      { type: "group", key: "financeOverview", label: "Finance Overview", iconId: "expenseDashboard",
        children: ["expenseDashboard", "collections", "expenses", "expenseCategories", "vendors", "budgets", "expenseReports"] },
    ],
  },

  // ── Automation (static section header) ────────────────────────────────────
  {
    type: "section", label: "Automation",
    items: [
      { type: "tab", id: "gmbScraper" },
      { type: "tab", id: "mailAutomation" },
    ],
  },

  // ── Operations (static section header) ────────────────────────────────────
  {
    type: "section", label: "Operations",
    items: [
      { type: "tab", id: "announcements" },
      { type: "tab", id: "companyCalendar" },
      { type: "tab", id: "teamChat" },
      { type: "tab", id: "reportBuilder" },
    ],
  },

  // ── HR (static section header, salary moved here) ─────────────────────────
  {
    type: "section", label: "HR",
    items: [
      { type: "tab", id: "salary" },
      { type: "tab", id: "holidayShift" },
      { type: "tab", id: "leavePolicy" },
      { type: "tab", id: "performance" },
    ],
  },
];

function AdminDashboardInner() {
  const {
    users, tasks, clients, projects, proposals, reminders, dashboardStats, fetchDashboardStats,
    branches, departments, branchForm, setBranchForm, departmentForm, setDepartmentForm,
    tab, setTab, toast, setToast, showPw, setShowPw,
    userForm, setUserForm, taskForm, setTaskForm, projectForm, setProjectForm, projectFormTab, setProjectFormTab, projectListTab, setProjectListTab,
    editTask, setEditTask, editTaskForm, setEditTaskForm,
    editUser, setEditUser, editUserForm, setEditUserForm, editProject, showEditPw, setShowEditPw,
    editBranch, setEditBranch, editBranchForm, setEditBranchForm,
    editDepartment, setEditDepartment, editDepartmentForm, setEditDepartmentForm,
    deleteTask, setDeleteTask, deleteUser, setDeleteUser, deleteProject, setDeleteProject,
    deleteBranch, setDeleteBranch, deleteDepartment, setDeleteDepartment,
    payUser, setPayUser, payingSalary, salaryForm, setSalaryForm, salaryPreview,
    handleCreateUser, handleCreateTask, handleCreateProject, handleDownloadProjectsCsv,
    openCreateProject, openEditProject, cancelProjectForm,
    openEditTask, handleUpdateTask, handleDeleteTask,
    openEditUser, handleUpdateUser, handleDeleteUser,
    handleCreateBranch, openEditBranch, handleUpdateBranch, handleDeleteBranch,
    handleCreateDepartment, openEditDepartment, handleUpdateDepartment, handleDeleteDepartment,
    openPaySalary, handlePaySalary, handleDeleteProject, handleLogout,
    done, inProg, pend, completionRate, activeProjects, ongoingProjects,
    projectAssignChartData, projectPlatformChartData, projectDueChartData,
    statusPieData, priorityBarData,
    tasksByUser, admins, regularUsers, totalTaskCount, TABS, currentLabel,
    isTabLocked, lockedFeatureModal, setLockedFeatureModal,
    subscription, featureCatalog,
    attFilters, setAttFilter, setAttFilters, attUsers, handleExport, attError, attLoading,
    attRows, computeRunning, attPagination, attPage, setAttPage, selectedDayTotal, attSummary, attActiveNow,
    leaves, leaveActionId, handleLeaveDecision,
    attDashboard, attDashboardLoading, attDashboardError, attDashboardDate, setAttDashboardDate,
  } = useAdminDashboard();

  const { T, branding } = useTenantTheme();
  const { user, role } = useAuth();
  const [showRenewal, setShowRenewal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState(new Set());
  const [closedGroups, setClosedGroups] = useState(new Set());
  const toggleGroup = (key, currentlyOpen) => {
    if (currentlyOpen) {
      setClosedGroups(prev => new Set([...prev, key]));
      setOpenGroups(prev => { const n = new Set(prev); n.delete(key); return n; });
    } else {
      setClosedGroups(prev => { const n = new Set(prev); n.delete(key); return n; });
      setOpenGroups(prev => new Set([...prev, key]));
    }
  };

  const ROLE_LABELS = { admin: "Administrator", hr: "HR Manager", sales: "Sales Executive", user: "Team Member", tenant_admin: "Tenant Admin" };
  const roleLabel = ROLE_LABELS[role] || (role ? role.charAt(0).toUpperCase() + role.slice(1) : "User");

  // Unique icon color per sidebar tab — purely visual, no logic impact
  const ICON_COLORS = {
    dashboard:        "#f7931e",
    tasks:            "#3b82f6",
    users:            "#22c55e",
    attendance:       "#8b5cf6",
    meetings:         "#ef4444",
    clients:          "#f59e0b",
    projects:         "#6366f1",
    branches:         "#a855f7",
    departments:      "#14b8a6",
    salary:           "#10b981",
    createTask:       "#3b82f6",
    createProject:    "#8b5cf6",
    createUser:       "#22c55e",
    createBranch:     "#f59e0b",
    createDepartment: "#14b8a6",
    salesTargets:      "#16a34a",
    expenseDashboard:  "#0ea5e9",
    expenses:          "#ef4444",
    expenseCategories: "#f59e0b",
    vendors:           "#8b5cf6",
    budgets:           "#22c55e",
    expenseReports:    "#6366f1",
    collections:       "#10b981",
    emailSettings:     "#8b5cf6",
    gmbScraper:        "#f59e0b",
    mailAutomation:    "#a855f7",
    announcements:    "#2563eb",
    companyCalendar:  "#0891b2",
    teamChat:         "#7c3aed",
    reportBuilder:    "#16a34a",
    holidayShift:     "#16a34a",
    leavePolicy:      "#0891b2",
    performance:      "#7c3aed",
  };

  const tabMap = useMemo(() => Object.fromEntries(TABS.map(t => [t.id, t])), [TABS]);

  const renderNavBtn = ({ id, label, Icon, active, locked, isChild }) => {
    const iconColor = locked ? "rgba(255,255,255,0.22)" : (ICON_COLORS[id] || "rgba(255,255,255,0.55)");
    const textColor = locked ? "rgba(255,255,255,0.28)" : active ? "#ffffff" : "rgba(255,255,255,0.88)";
    return (
      <button
        key={id}
        className={`nav-btn${active ? " nav-active" : ""}`}
        onClick={() => {
          if (locked) return setLockedFeatureModal(label);
          setSidebarOpen(false);
          return id === "createProject" ? openCreateProject() : setTab(id);
        }}
        title={locked ? `${label} — not included in your subscription` : undefined}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          padding: isChild ? "8px 12px 8px 30px" : "10px 12px",
          borderRadius: 9, textAlign: "left",
          color: textColor,
          background: active && !locked ? "rgba(255,255,255,0.1)" : "transparent",
          fontWeight: active && !locked ? 600 : 500, fontSize: 13.5,
          borderLeft: `3px solid ${active && !locked ? "#60a5fa" : "transparent"}`,
          cursor: locked ? "not-allowed" : "pointer",
        }}
      >
        <Icon size={16} strokeWidth={active && !locked ? 2.2 : 2} color={iconColor} />
        {label}
        {locked ? (
          <Lock size={12} strokeWidth={2} color="rgba(255,255,255,0.22)" style={{ marginLeft: "auto", flexShrink: 0 }} />
        ) : active && (
          <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#60a5fa", flexShrink: 0 }} />
        )}
      </button>
    );
  };

  const renderSidebarEntry = (entry) => {
    if (entry.type === "tab") {
      const tabDef = tabMap[entry.id];
      if (!tabDef) return null;
      return renderNavBtn({ ...tabDef, active: tab === tabDef.id, locked: isTabLocked(tabDef.id) });
    }
    if (entry.type === "group") {
      const availIds = entry.children.filter(id => tabMap[id]);
      if (availIds.length === 0) return null;
      if (availIds.length === 1) {
        const tabDef = tabMap[availIds[0]];
        return renderNavBtn({ ...tabDef, active: tab === tabDef.id, locked: isTabLocked(tabDef.id) });
      }
      const GroupIcon = tabMap[entry.iconId]?.Icon || tabMap[availIds[0]]?.Icon;
      const hasActiveChild = availIds.includes(tab);
      const isOpen = !closedGroups.has(entry.key) && (openGroups.has(entry.key) || hasActiveChild);
      const groupColor = ICON_COLORS[entry.iconId] || "rgba(255,255,255,0.55)";
      return (
        <div key={entry.key}>
          <button
            onClick={() => toggleGroup(entry.key, isOpen)}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "10px 12px", borderRadius: 9, textAlign: "left",
              color: "rgba(255,255,255,0.88)",
              background: "transparent",
              fontWeight: 500, fontSize: 13.5,
              borderLeft: "3px solid transparent",
              cursor: "pointer",
            }}
          >
            {GroupIcon && <GroupIcon size={16} strokeWidth={2} color={groupColor} />}
            {entry.label}
            <ChevronDown size={13} strokeWidth={2} color="rgba(255,255,255,0.45)" style={{ marginLeft: "auto", flexShrink: 0, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
          </button>
          {isOpen && (
            <div>
              {availIds.map(childId => {
                const tabDef = tabMap[childId];
                if (!tabDef) return null;
                return renderNavBtn({ ...tabDef, active: tab === childId, locked: isTabLocked(childId), isChild: true });
              })}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const orgStatus = subscription?.organization?.status;

  // For trial orgs use trialEndsAt; for paid orgs use subscriptionExpiresAt
  const expiryDate = orgStatus === "trial"
    ? (subscription?.organization?.trialEndsAt || null)
    : (subscription?.organization?.subscriptionExpiresAt || null);

  const daysLeft = expiryDate
    ? Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  // Legacy aliases kept for status-badge display
  const trialExpiryDate = expiryDate;
  const trialDaysLeft   = daysLeft;
  const trialEndLabel   = expiryDate
    ? new Date(expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

  // Button label logic:
  //  trial            → "Upgrade"   (convert to a paid plan)
  //  active, >30 days → "Upgrade"   (change / upgrade plan, no urgency)
  //  active, ≤30 days → "Renew"     (subscription expiring soon)
  const renewBtnLabel = orgStatus === "trial"
    ? "Upgrade"
    : (daysLeft !== null && daysLeft <= 30 ? "Renew" : "Upgrade");

  // Expired orgs are blocked at authMiddleware — admin can never see that status.
  // Only trial, active, and suspended are reachable states for a logged-in admin.
  const STATUS_BADGE = {
    trial: { label: "Trial", color: T.yellow, bg: T.yellowBg },
    active: { label: "Active", color: T.green, bg: T.greenBg },
    suspended: { label: "Suspended", color: T.red, bg: T.redBg },
  };
  const statusBadge = STATUS_BADGE[orgStatus];

  const renderSection = () => {
    switch (tab) {
      case "dashboard":
        return (
          <DashboardSection
            users={users}
            tasks={tasks}
            totalTaskCount={totalTaskCount}
            done={done}
            inProg={inProg}
            pend={pend}
            dashboardStats={dashboardStats}
            fetchDashboardStats={fetchDashboardStats}
            attDashboard={attDashboard}
            setAttDashboardDate={setAttDashboardDate}
            setTab={setTab}
          />
        );
        case "attendance":
        return (
          <AttendanceSection
            attFilters={attFilters}
            setAttFilter={setAttFilter}
            setAttFilters={setAttFilters}
            attUsers={attUsers}
            handleExport={handleExport}
            attError={attError}
            attLoading={attLoading}
            attRows={attRows}
            computeRunning={computeRunning}
            attPagination={attPagination}
            attPage={attPage}
            setAttPage={setAttPage}
            selectedDayTotal={selectedDayTotal}
            attSummary={attSummary}
            attActiveNow={attActiveNow}
            leaves={leaves}
            leaveActionId={leaveActionId}
            handleLeaveDecision={handleLeaveDecision}
            attDashboard={attDashboard}
            attDashboardLoading={attDashboardLoading}
            attDashboardError={attDashboardError}
            attDashboardDate={attDashboardDate}
            setAttDashboardDate={setAttDashboardDate}
          />
        );
      case "tasks":
        return <TasksSection tasks={tasks} clients={clients} setTab={setTab} openEditTask={openEditTask} setDeleteTask={setDeleteTask} />;
      case "clients":
        return <ClientsSection clients={clients} proposals={proposals} reminders={reminders} dashboardStats={dashboardStats} fetchDashboardStats={fetchDashboardStats} />;
      case "projects":
        return (
          <ProjectsSection
            projects={projects}
            openCreateProject={openCreateProject}
            handleDownloadProjectsCsv={handleDownloadProjectsCsv}
            projectAssignChartData={projectAssignChartData}
            projectPlatformChartData={projectPlatformChartData}
            projectDueChartData={projectDueChartData}
            ongoingProjects={ongoingProjects}
            setDeleteProject={setDeleteProject}
            openEditProject={openEditProject}
            activeProjectTab={projectListTab}
            setActiveProjectTab={setProjectListTab}
          />
        );
      case "users":
        return <UsersSection users={users} tasks={tasks} clients={clients} setTab={setTab} openEditUser={openEditUser} setDeleteUser={setDeleteUser} />;
      case "branches":
        return <BranchesSection branches={branches} setTab={setTab} openEditBranch={openEditBranch} setDeleteBranch={setDeleteBranch} />;
      case "departments":
        return <DepartmentsSection departments={departments} setTab={setTab} openEditDepartment={openEditDepartment} setDeleteDepartment={setDeleteDepartment} />;
      case "salary":
        return <SalarySection users={users} openPaySalary={openPaySalary} />;
      case "createTask":
        return <CreateTaskSection users={users} taskForm={taskForm} setTaskForm={setTaskForm} handleCreateTask={handleCreateTask} />;
      case "createProject":
        return (
          <CreateProjectSection
            projectForm={projectForm}
            setProjectForm={setProjectForm}
            projectFormTab={projectFormTab}
            setProjectFormTab={setProjectFormTab}
            handleCreateProject={handleCreateProject}
            cancelProjectForm={cancelProjectForm}
            isEditing={Boolean(editProject)}
          />
        );
      case "createUser":
        return (
          <CreateUserSection
            userForm={userForm}
            setUserForm={setUserForm}
            handleCreateUser={handleCreateUser}
            showPw={showPw}
            setShowPw={setShowPw}
            branches={branches}
            departments={departments}
          />
        );
      case "createBranch":
        return <CreateBranchSection branchForm={branchForm} setBranchForm={setBranchForm} handleCreateBranch={handleCreateBranch} users={users} />;
      case "createDepartment":
        return <CreateDepartmentSection departmentForm={departmentForm} setDepartmentForm={setDepartmentForm} handleCreateDepartment={handleCreateDepartment} branches={branches} />;
      case "meetings":
        return <MeetingsSection users={users} clients={clients} />;
      case "myProfile":
        return <MyProfileSection subscription={subscription} featureCatalog={featureCatalog} setTab={setTab} onOpenSupport={() => setSupportOpen(true)} />;
      case "salesTargets":
        return <SalesTargetSection />;
      case "expenseDashboard":
        return <ExpenseDashboardSection setTab={setTab} />;
      case "expenses":
        return <ExpensesSection />;
      case "expenseCategories":
        return <ExpenseCategoriesSection />;
      case "vendors":
        return <VendorsSection />;
      case "budgets":
        return <BudgetsSection />;
      case "expenseReports":
        return <ExpenseReportsSection />;
      case "collections":
        return <CollectionsSection />;
      case "emailSettings":
        return <EmailSettingsSection />;
      case "gmbScraper":
        return <GmbScraperSection />;
      case "mailAutomation":
        return <MailAutomationSection />;
      case "announcements":
        return <AnnouncementSection />;
      case "companyCalendar":
        return <CompanyCalendarSection />;
      case "teamChat":
        return <ChatSection />;
      case "reportBuilder":
        return <ReportBuilderSection />;
      case "holidayShift":
        return <HolidayShiftSection />;
      case "leavePolicy":
        return <LeavePolicySection />;
      case "performance":
        return <PerformanceSection />;
      default:
        return null;
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: ${T.bg}; min-height: 100vh; }
        ::placeholder { color: ${T.textMuted}; font-size: 13px; }
        select option { background: #fff; color: ${T.textPrimary}; }
        input[type=date]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: .5; }

        .card { transition: border-color .2s, box-shadow .2s, transform .2s; }
        .card:hover { border-color: ${T.brandMid} !important; box-shadow: 0 4px 24px rgba(247, 147, 30,.08) !important; transform: translateY(-1px); }

        .inp { transition: border-color .18s, box-shadow .18s; }
        .inp:focus { border-color: ${T.brand} !important; box-shadow: 0 0 0 3px rgba(247, 147, 30,.1) !important; outline: none; background: #fff !important; }

        .data-row { transition: background .15s; }
        .data-row:hover { background: ${T.brandLight} !important; }

        .nav-btn { border: none; cursor: pointer; font-family: inherit; background: transparent; transition: all .16s; }
        .nav-btn:hover:not(.nav-active) { background: rgba(255,255,255,0.07) !important; color: #fff !important; }

        .pri-btn { transition: filter .18s, transform .15s, box-shadow .18s; cursor: pointer; border: none; font-family: inherit; }
        .pri-btn:hover { filter: brightness(1.07); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(247, 147, 30,.3); }
        .pri-btn:active { transform: translateY(0); filter: brightness(.97); }

        .logout-btn { transition: background .16s, color .16s; cursor: pointer; border: none; font-family: inherit; }
        .logout-btn:hover { background: rgba(239,68,68,0.18) !important; color: #fca5a5 !important; }

        @keyframes fadeUp  { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cardIn  { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes toastIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes pulse   { 0%,100% { opacity: 1; } 50% { opacity: .4; } }

        .fade-up { animation: fadeUp .32s cubic-bezier(.22,1,.36,1) both; }
        .card-in  { animation: cardIn  .36s cubic-bezier(.22,1,.36,1) both; }
        textarea.inp { resize: vertical; }
        select.inp { appearance: none; }
        .recharts-cartesian-axis-tick text { font-family: 'Inter', sans-serif; font-size: 12px; fill: ${T.textMuted}; }
        .recharts-legend-item-text { font-family: 'Inter', sans-serif !important; font-size: 12px !important; color: ${T.textSecondary} !important; }
        .recharts-wrapper:focus,
        .recharts-wrapper *:focus,
        .recharts-surface:focus {
          outline: none !important;
        }
        aside nav::-webkit-scrollbar { width: 3px; }
        aside nav::-webkit-scrollbar-track { background: transparent; }
        aside nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 2px; }
        aside nav::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.35); }
      `}</style>

      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Inter', sans-serif", color: T.textSecondary }}>

        {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
        {sidebarOpen && (
          <div className="crm-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={`crm-sidebar${sidebarOpen ? " sidebar-open" : ""}`} style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 238, background: "#08132f", borderRight: "none", display: "flex", flexDirection: "column", zIndex: 300, boxShadow: "4px 0 24px rgba(0,0,0,0.28)" }}>
          <div style={{ padding: "24px 22px 22px", borderBottom: "1px solid rgba(255,255,255,0.09)", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: "#fff", borderRadius: 10, padding: "5px 7px", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <TenantLogo logoUrl={branding.logoUrl} name={branding.name} primaryColor={branding.primaryColor} size={30} />
            </div>
            <div style={{ fontSize: 13.5, color: "#fff", fontWeight: 700, lineHeight: 1.3, letterSpacing: ".01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{branding.name || "Control Center"}</div>
          </div>
          <nav style={{ flex: 1, padding: "18px 12px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", overflowX: "hidden" }}>
            {SIDEBAR_GROUPS.map((entry, i) => {
              if (entry.type === "section") {
                const visibleItems = (entry.items || []).filter(item => {
                  if (item.type === "tab") return !!tabMap[item.id];
                  if (item.type === "group") return item.children.some(id => tabMap[id]);
                  return false;
                });
                if (visibleItems.length === 0) return null;
                return (
                  <div key={entry.label}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 800, padding: "18px 12px 8px" }}>
                      {entry.label}
                    </div>
                    {visibleItems.map(renderSidebarEntry)}
                  </div>
                );
              }
              return renderSidebarEntry(entry);
            })}
          </nav>
          <div style={{ padding: "14px 12px", borderTop: "1px solid rgba(255,255,255,0.09)", flexShrink: 0 }}>
            <button className="logout-btn" onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 9, color: "rgba(255,255,255,0.82)", background: "transparent", fontSize: 13.5, fontWeight: 500 }}>
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
                <p className="crm-header-date" style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3 }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {statusBadge && (
                <div className="crm-status-badge" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: statusBadge.color, background: statusBadge.bg, padding: "4px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
                      {statusBadge.label}
                      {orgStatus === "trial" && daysLeft !== null && (
                        <> · {daysLeft > 0 ? `${daysLeft}d left` : "Last day"}</>
                      )}
                      {orgStatus === "active" && daysLeft !== null && daysLeft <= 30 && (
                        <> · {daysLeft > 0 ? `${daysLeft}d left` : "Expires today"}</>
                      )}
                    </span>
                    {role === "admin" && (
                      <button
                        onClick={() => setShowRenewal(true)}
                        style={{ fontSize: 11.5, fontWeight: 700, background: "linear-gradient(135deg,#f7931e,#e8590c)", color: "#fff", border: "none", borderRadius: 16, padding: "4px 12px", cursor: "pointer", whiteSpace: "nowrap" }}
                      >
                        {renewBtnLabel}
                      </button>
                    )}
                  </div>
                  {orgStatus === "trial" && (
                    <span style={{ fontSize: 9.5, color: T.textMuted, fontWeight: 500, whiteSpace: "nowrap" }}>
                      {trialEndLabel ? `Trial ends ${trialEndLabel}` : "No trial end set"}
                    </span>
                  )}
                  {orgStatus === "active" && daysLeft !== null && daysLeft <= 30 && (
                    <span style={{ fontSize: 9.5, color: T.red, fontWeight: 600, whiteSpace: "nowrap" }}>
                      Expires {trialEndLabel}
                    </span>
                  )}
                </div>
              )}
              <NotificationBell />
              <ProfileDropdown
                user={user}
                roleLabel={roleLabel}
                subscription={subscription}
                onNavigate={(tabId) => setTab(tabId)}
                onLogout={handleLogout}
                onHelp={() => setSupportOpen(true)}
              />
            </div>
          </header>

          <main className="crm-main" style={{ padding: "30px 36px 64px", flex: 1 }}>
            {renderSection()}
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

        {lockedFeatureModal && (
          <LockedFeatureModal featureLabel={lockedFeatureModal} onClose={() => setLockedFeatureModal(null)} />
        )}

        {showRenewal && (
          <RenewalModal
            currentPlan={subscription?.organization?.planName}
            onClose={() => setShowRenewal(false)}
            onSuccess={(msg) => setToast({ msg, ok: true })}
          />
        )}

        <DashboardModals
          users={users}
          branches={branches}
          departments={departments}
          editTask={editTask}
          setEditTask={setEditTask}
          editTaskForm={editTaskForm}
          setEditTaskForm={setEditTaskForm}
          handleUpdateTask={handleUpdateTask}
          editUser={editUser}
          setEditUser={setEditUser}
          editUserForm={editUserForm}
          setEditUserForm={setEditUserForm}
          showEditPw={showEditPw}
          setShowEditPw={setShowEditPw}
          handleUpdateUser={handleUpdateUser}
          editBranch={editBranch}
          setEditBranch={setEditBranch}
          editBranchForm={editBranchForm}
          setEditBranchForm={setEditBranchForm}
          handleUpdateBranch={handleUpdateBranch}
          editDepartment={editDepartment}
          setEditDepartment={setEditDepartment}
          editDepartmentForm={editDepartmentForm}
          setEditDepartmentForm={setEditDepartmentForm}
          handleUpdateDepartment={handleUpdateDepartment}
          payUser={payUser}
          setPayUser={setPayUser}
          payingSalary={payingSalary}
          salaryForm={salaryForm}
          setSalaryForm={setSalaryForm}
          salaryPreview={salaryPreview}
          handlePaySalary={handlePaySalary}
          deleteTask={deleteTask}
          setDeleteTask={setDeleteTask}
          handleDeleteTask={handleDeleteTask}
          deleteUser={deleteUser}
          setDeleteUser={setDeleteUser}
          handleDeleteUser={handleDeleteUser}
          deleteProject={deleteProject}
          setDeleteProject={setDeleteProject}
          handleDeleteProject={handleDeleteProject}
          deleteBranch={deleteBranch}
          setDeleteBranch={setDeleteBranch}
          handleDeleteBranch={handleDeleteBranch}
          deleteDepartment={deleteDepartment}
          setDeleteDepartment={setDeleteDepartment}
          handleDeleteDepartment={handleDeleteDepartment}
        />

      </div>

      {/* AI Chat widget — only renders if AI is enabled for this tenant */}
      <AiChat />

      {/* Support chat — opened from Help & Support in profile dropdown or MyProfile */}
      <SupportChatBox
        open={supportOpen}
        onOpen={() => setSupportOpen(true)}
        onClose={() => setSupportOpen(false)}
      />
    </>
  );
}

// One TenantBrandingProvider per dashboard root — every descendant calling
// useTenantBranding()/useTenantTheme() (including AdminDashboardInner's own
// call above) shares a single GET /tenant/branding instead of one per
// component instance.
export default function AdminDashboard() {
  return (
    <TenantBrandingProvider>
      <AdminDashboardInner />
    </TenantBrandingProvider>
  );
}
