import React, { useEffect, useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, LogOut, CheckCircle2,
  Clock, TrendingUp, Calendar, User, Shield, X,
  AlertCircle, CheckCheck, ListTodo, ChevronDown,
  CalendarDays, XCircle, Hourglass, FileText, Send,
  Briefcase, IndianRupee, Plus, Receipt, Award, Sun, Menu,
} from "lucide-react";
import TenantLogo from "../components/TenantLogo";
import NotificationBell from "../components/NotificationBell";
import useTenantTheme from "../hooks/useTenantTheme";
import { TenantBrandingProvider } from "../context/TenantBrandingContext";
import { T } from "./sections/shared";
import { getAllClients, getWorkProgress } from "../services/clientApi";
import ClientTaskDetail from "../components/ClientTaskDetail";
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { useAuth } from "../context/AuthContext";


const PRIORITY = {
  low:    { label: "Low",    color: T.green,  bg: T.greenBg,  border: T.greenBorder  },
  medium: { label: "Medium", color: T.yellow, bg: T.yellowBg, border: T.yellowBorder },
  high:   { label: "High",   color: T.red,    bg: T.redBg,    border: T.redBorder    },
};
const STATUS = {
  completed:     { label: "Completed",   color: T.green,  bg: T.greenBg,  border: T.greenBorder,  Icon: CheckCircle2 },
  "in-progress": { label: "In Progress", color: T.yellow, bg: T.yellowBg, border: T.yellowBorder, Icon: TrendingUp   },
  pending:       { label: "Pending",     color: T.slate,  bg: T.slateBg,  border: T.slateBorder,  Icon: Clock        },
};

// Maps a Client's latest Work Progress status onto the same 3-bucket model used by
// plain Tasks (pending/in-progress/completed), so assigned client work counts toward
// the same Total/Done/Active/Pending stats shown across the dashboard.
const mapProgressToTaskStatus = (progressStatus) => {
  if (progressStatus === "Completed") return "completed";
  if (progressStatus === "In Progress") return "in-progress";
  return "pending"; // covers Pending / On Hold / Waiting for Client / no progress yet
};

const LEAVE_STATUS = {
  pending:  { label: "Pending",  color: T.yellow, bg: T.yellowBg, border: T.yellowBorder, Icon: Hourglass    },
  approved: { label: "Approved", color: T.green,  bg: T.greenBg,  border: T.greenBorder,  Icon: CheckCircle2 },
  rejected: { label: "Rejected", color: T.red,    bg: T.redBg,    border: T.redBorder,    Icon: XCircle      },
};

const PIE_COLORS = ["#16a34a", "#d97706", "#64748b"];
const fmtCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

// ─── KpiCard ──────────────────────────────────────────────────────────────────
function KpiCard({ Icon, label, value, color, bgColor, sub }) {
  const { T } = useTenantTheme();
  return (
    <div style={{
      minWidth: 0, borderRadius: 18, padding: "18px 18px 20px",
      background: bgColor, border: "none",
      boxShadow: "0 1px 2px rgba(0,0,0,.02)",
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, background: `${color}26`, display: "grid", placeItems: "center", marginBottom: 14 }}>
        <Icon size={19} color={color} strokeWidth={2} />
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color, marginBottom: 5, whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.textPrimary, lineHeight: 1.1, fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap" }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color, marginTop: 5, fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

// ─── ChartCard ────────────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children, style = {} }) {
  const { T } = useTenantTheme();
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,.04)", ...style }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── CustomTooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  const { T } = useTenantTheme();
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 16px rgba(0,0,0,.1)", fontSize: 13 }}>
      {label && <div style={{ fontWeight: 600, color: T.textPrimary, marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || T.textSecondary, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, display: "inline-block" }} />
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

// ─── StatusSelect ─────────────────────────────────────────────────────────────
function StatusSelect({ value, onChange }) {
  const { T } = useTenantTheme();
  const s = STATUS[value] || STATUS.pending;
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <s.Icon size={13} color={s.color} strokeWidth={2} style={{ position: "absolute", left: 10, pointerEvents: "none", zIndex: 1 }} />
      <ChevronDown size={13} color={T.textMuted} strokeWidth={2} style={{ position: "absolute", right: 9, pointerEvents: "none", zIndex: 1 }} />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          appearance: "none", cursor: "pointer",
          padding: "7px 32px 7px 30px",
          fontSize: 12, fontWeight: 600, borderRadius: 8,
          color: s.color, background: s.bg,
          border: `1.5px solid ${s.border}`,
          fontFamily: "inherit", outline: "none",
          transition: "border-color .18s, box-shadow .18s",
        }}
      >
        <option value="pending">Pending</option>
        <option value="in-progress">In Progress</option>
        <option value="completed">Completed</option>
      </select>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function UserDashboardInner() {
  const navigate = useNavigate();
  const { token, user, logout } = useAuth();
  const { T, branding } = useTenantTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tasks, setTasks]       = useState([]);
  const [salarySlips, setSalarySlips] = useState([]);
  const [tab, setTab]           = useState("dashboard");
  const [myExpenses, setMyExpenses] = useState([]);
  const [expLoading, setExpLoading] = useState(false);
  const [expForm, setExpForm]   = useState({ title: "", categoryId: "", amount: "", tax: "0", paymentMethod: "Cash", expenseDate: new Date().toISOString().slice(0, 10), description: "", notes: "" });
  const [expCategories, setExpCategories] = useState([]);
  const [showExpForm, setShowExpForm] = useState(false);
  const [expSubmitting, setExpSubmitting] = useState(false);
  const [toast, setToast]   = useState(null);
  const [updating, setUpdating] = useState(null); // taskId being updated
  const [leaves, setLeaves] = useState([]);
  const [leaveForm, setLeaveForm] = useState({ fromDate: "", toDate: "", reason: "", leaveType: "casual" });
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [assignedClients, setAssignedClients] = useState([]);
  const [openClientTaskId, setOpenClientTaskId] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [myShift, setMyShift] = useState(null);
  const [myAppraisals, setMyAppraisals] = useState([]);
  const [appraisalLoading, setAppraisalLoading] = useState(false);
  const [selfAssessTarget, setSelfAssessTarget] = useState(null);
  const [saForm, setSaForm] = useState({ selfRating: 0, selfComment: "", goalResponses: [] });
  const [saSubmitting, setSaSubmitting] = useState(false);

  const userName = user?.name || "User";
  const userInitials = userName.trim().split(/\s+/).map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };

  const fetchTasks = async () => {
    try { const { data } = await API.get("/tasks/my-tasks"); setTasks(data); }
    catch { showToast("Failed to fetch tasks", false); }
  };

  const fetchSalarySlips = async () => {
    try { const { data } = await API.get("/salary/my-slips"); setSalarySlips(data); }
    catch { showToast("Failed to fetch salary slips", false); }
  };

  const fetchLeaves = async () => {
    try { const { data } = await API.get("/leaves/my"); setLeaves(Array.isArray(data) ? data : []); }
    catch { showToast("Failed to fetch leave requests", false); }
  };

  // Clients assigned to this user via the admin's "Assign Task" action on the Client
  // Detail page — the backend already scopes /clients to assignedUser === me for role "user".
  const fetchMyExpenses = async () => {
    setExpLoading(true);
    try {
      const { data } = await API.get("/expenses", { params: { employeeId: user?._id, limit: 50 } });
      setMyExpenses(data.expenses || []);
    } catch { /* keep */ } finally { setExpLoading(false); }
  };

  const fetchAssignedClients = async () => {
    try {
      const { data } = await getAllClients();
      const clients = data.clients || [];
      const withStatus = await Promise.all(
        clients.map(async (c) => {
          try {
            const progRes = await getWorkProgress(c._id);
            const latest = progRes.data?.workProgress?.[0];
            return { ...c, _taskStatus: mapProgressToTaskStatus(latest?.status) };
          } catch {
            return { ...c, _taskStatus: "pending" };
          }
        })
      );
      setAssignedClients(withStatus);
    } catch {
      setAssignedClients([]);
    }
  };

  const fetchLeaveBalance = async () => {
    try { const { data } = await API.get("/leave-policy/my-balance"); setLeaveBalance(data.balance || null); } catch {}
  };
  const fetchMyShift = async () => {
    try { const { data } = await API.get("/hr/my-shift"); setMyShift(data.shift || null); } catch {}
  };
  const fetchMyAppraisals = async () => {
    setAppraisalLoading(true);
    try { const { data } = await API.get("/performance/my-appraisals"); setMyAppraisals(data.appraisals || []); } catch {}
    finally { setAppraisalLoading(false); }
  };

  useEffect(() => {
    fetchTasks(); fetchSalarySlips(); fetchLeaves(); fetchAssignedClients(); fetchMyExpenses();
    fetchLeaveBalance(); fetchMyShift();
    API.get("/expense-categories").then(({ data }) => setExpCategories(data.categories || [])).catch(() => {});
  }, []);

  useEffect(() => { if (tab === "appraisal") fetchMyAppraisals(); }, [tab]);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setSubmittingLeave(true);
    try {
      await API.post("/leaves", leaveForm);
      showToast("Leave request submitted");
      setLeaveForm({ fromDate: "", toDate: "", reason: "", leaveType: "casual" });
      fetchLeaves();
      fetchLeaveBalance();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to submit leave request", false);
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    setUpdating(taskId);
    try {
await API.patch(
  `/tasks/update-status/${taskId}`,
  { status: newStatus },
  {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
);      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
      showToast("Status updated");
    } catch {
      showToast("Failed to update status", false);
    } finally {
      setUpdating(null);
    }
  };

  const handleLogout = async () => {
    try {
      await API.post("/users/logout");
    } catch {}
    logout();
    navigate("/");
  };

  // ── derived stats ──────────────────────────────────────────────────────────
  // "Total" spans both plain admin-created Tasks and clients assigned via the
  // Client Detail page's "Assign Task" action — both are real work assigned to
  // this user, so both must count toward Total/Done/Active/Pending everywhere.
  const total  = tasks.length + assignedClients.length;
  const done   = tasks.filter(t => t.status === "completed").length
    + assignedClients.filter(c => c._taskStatus === "completed").length;
  const inProg = tasks.filter(t => t.status === "in-progress").length
    + assignedClients.filter(c => c._taskStatus === "in-progress").length;
  const pend   = tasks.filter(t => !t.status || t.status === "pending").length
    + assignedClients.filter(c => c._taskStatus === "pending").length;
  const completionRate = total ? Math.round((done / total) * 100) : 0;

  const overdue = tasks.filter(t => {
    if (!t.dueDate || t.status === "completed") return false;
    return new Date(t.dueDate) < new Date();
  }).length;

  // ── chart data ─────────────────────────────────────────────────────────────
  const statusPieData = [
    { name: "Completed",   value: done   },
    { name: "In Progress", value: inProg },
    { name: "Pending",     value: pend   },
  ].filter(d => d.value > 0);

  const priorityBarData = [
    { name: "Low",    count: tasks.filter(t => t.priority === "low").length,    fill: T.green  },
    { name: "Medium", count: tasks.filter(t => t.priority === "medium").length, fill: T.yellow },
    { name: "High",   count: tasks.filter(t => t.priority === "high").length,   fill: T.red    },
  ];

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    setExpSubmitting(true);
    try {
      await API.post("/expenses", {
        ...expForm,
        employeeId: user?._id,
        status: "submitted",
      });
      showToast("Reimbursement request submitted");
      setExpForm({ title: "", categoryId: "", amount: "", tax: "0", paymentMethod: "Cash", expenseDate: new Date().toISOString().slice(0, 10), description: "", notes: "" });
      setShowExpForm(false);
      fetchMyExpenses();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to submit", false);
    } finally {
      setExpSubmitting(false);
    }
  };

  const EXPENSE_STATUS_COLOR = { draft: "#94a3b8", submitted: "#f59e0b", pending: "#f97316", approved: "#22c55e", rejected: "#ef4444", paid: "#10b981" };
  const EXPENSE_STATUS_LABEL = { draft: "Draft", submitted: "Submitted", pending: "Pending", approved: "Approved", rejected: "Rejected", paid: "Paid" };
  const PAYMENT_METHODS = ["Cash", "Bank Transfer", "UPI", "Cheque", "Card", "Other"];

  const TABS = [
    { id: "dashboard", label: "Dashboard",   Icon: LayoutDashboard },
    { id: "tasks",     label: "My Tasks",    Icon: ClipboardList   },
    { id: "leave",     label: "Leave",       Icon: CalendarDays    },
    { id: "expenses",  label: "My Expenses", Icon: Receipt         },
    { id: "salary",    label: "Salary",      Icon: Shield          },
    { id: "appraisal", label: "Appraisal",   Icon: Award           },
  ];

  const currentLabel = TABS.find(t => t.id === tab)?.label || "Dashboard";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: ${T.bg}; min-height: 100vh; }
        select option { background: #fff; color: ${T.textPrimary}; }

        .task-card { transition: border-color .2s, box-shadow .2s, transform .2s; }
        .task-card:hover {
          border-color: ${T.brandMid} !important;
          box-shadow: 0 4px 24px rgba(247, 147, 30,.08) !important;
          transform: translateY(-1px);
        }

        .nav-btn { border: none; cursor: pointer; font-family: inherit; background: transparent; transition: all .16s; }
        .nav-btn:hover:not(.nav-active) { background: rgba(255,255,255,0.07) !important; color: #fff !important; }

        .logout-btn { transition: background .16s, color .16s; cursor: pointer; border: none; font-family: inherit; }
        .logout-btn:hover { background: rgba(239,68,68,0.18) !important; color: #fca5a5 !important; }

        aside nav::-webkit-scrollbar { width: 3px; }
        aside nav::-webkit-scrollbar-track { background: transparent; }
        aside nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 2px; }
        aside nav::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.35); }

        .status-select:focus { border-color: ${T.brand}; box-shadow: 0 0 0 3px rgba(247, 147, 30,.1); outline: none; }

        @keyframes fadeUp  { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cardIn  { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes toastIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

        .fade-up { animation: fadeUp .32s cubic-bezier(.22,1,.36,1) both; }
        .card-in  { animation: cardIn  .36s cubic-bezier(.22,1,.36,1) both; }

        .recharts-cartesian-axis-tick text { font-family: 'Inter', sans-serif; font-size: 12px; fill: ${T.textMuted}; }
        .recharts-legend-item-text { font-family: 'Inter', sans-serif !important; font-size: 12px !important; color: ${T.textSecondary} !important; }
      `}</style>

      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Inter', sans-serif", color: T.textSecondary }}>

        {sidebarOpen && (
          <div className="crm-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
        <aside className={`crm-sidebar${sidebarOpen ? " sidebar-open" : ""}`} style={{
          position: "fixed", left: 0, top: 0, bottom: 0, width: 238,
          background: "#08132f", borderRight: "none",
          display: "flex", flexDirection: "column", zIndex: 300,
          boxShadow: "4px 0 24px rgba(0,0,0,0.28)",
        }}>
          {/* brand */}
          <div style={{ padding: "24px 22px 22px", borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
            <TenantLogo logoUrl={branding.logoUrl} name={branding.name} primaryColor={branding.primaryColor} size={34} />
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", letterSpacing: ".1em", marginTop: 9, textTransform: "uppercase", fontWeight: 600 }}>Task Portal</div>
          </div>

          {/* nav */}
          <nav style={{ flex: 1, padding: "18px 12px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", overflowX: "hidden" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 800, padding: "4px 12px 8px" }}>
              NAVIGATION
            </div>
            {TABS.map(({ id, label, Icon }) => {
              const active = tab === id;
              const iconColors = { dashboard: "#f7931e", tasks: "#3b82f6", leave: "#22c55e", expenses: "#ef4444", salary: "#10b981", appraisal: "#8b5cf6" };
              const iconColor = iconColors[id] || "rgba(255,255,255,0.55)";
              return (
                <button key={id} className={`nav-btn${active ? " nav-active" : ""}`} onClick={() => { setTab(id); setSidebarOpen(false); }} style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "10px 12px", borderRadius: 9, textAlign: "left",
                  color: active ? "#ffffff" : "rgba(255,255,255,0.88)",
                  background: active ? "rgba(255,255,255,0.1)" : "transparent",
                  fontWeight: active ? 600 : 500, fontSize: 13.5,
                  borderLeft: `3px solid ${active ? "#60a5fa" : "transparent"}`,
                }}>
                  <Icon size={16} strokeWidth={active ? 2.2 : 2} color={iconColor} />
                  {label}
                  {active && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#60a5fa", flexShrink: 0 }} />}
                </button>
              );
            })}

            {/* quick stats in sidebar */}
            <div style={{ marginTop: 24, padding: "0 4px" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: ".14em", textTransform: "uppercase", fontWeight: 800, padding: "4px 8px 12px" }}>QUICK STATS</div>
              {[
                { label: "Total Tasks",  value: total,  color: T.brand  },
                { label: "Completed",    value: done,   color: T.green  },
                { label: "In Progress",  value: inProg, color: T.yellow },
                { label: "Pending",      value: pend,   color: T.slate  },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 8px", borderRadius: 8 }}>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
                </div>
              ))}
              {/* progress bar */}
              <div style={{ margin: "14px 8px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
                  <span>Completion</span>
                  <span style={{ fontWeight: 700, color: T.green }}>{completionRate}%</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.12)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${completionRate}%`, borderRadius: 99, background: `linear-gradient(90deg, ${T.brand}, #16a34a)`, transition: "width .6s cubic-bezier(.22,1,.36,1)" }} />
                </div>
              </div>
            </div>
          </nav>

          {/* logout */}
          <div style={{ padding: "14px 12px", borderTop: "1px solid rgba(255,255,255,0.09)", flexShrink: 0 }}>
            <button className="logout-btn" onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 9, color: "rgba(255,255,255,0.82)", background: "transparent", fontSize: 13.5, fontWeight: 500 }}>
              <LogOut size={15} strokeWidth={2} color="#f87171" /> Sign Out
            </button>
          </div>
        </aside>

        {/* ── CONTENT ─────────────────────────────────────────────────────── */}
        <div className="crm-content" style={{ marginLeft: 238, minHeight: "100vh", display: "flex", flexDirection: "column" }}>

          {/* topbar */}
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

            {/* user avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <NotificationBell />
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${T.brand}, ${T.brandMid})`, display: "grid", placeItems: "center", boxShadow: `0 2px 10px ${T.brand}4d`, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: "#fff" }}>
                  {userInitials}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, lineHeight: 1 }}>{userName}</div>
                  <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>Team Member</div>
                </div>
              </div>
            </div>
          </header>

          <main className="crm-main" style={{ padding: "30px 36px 64px", flex: 1 }}>

            {/* ══ DASHBOARD ══════════════════════════════════════════════════ */}
            {tab === "dashboard" && (
              <div className="fade-up">

                {/* KPI row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 26 }}>
                  <KpiCard Icon={ListTodo}   label="Total Tasks"  value={total}  color={T.brand} bgColor={T.brandLight} />
                  <KpiCard Icon={CheckCheck} label="Completed"    value={done}   color={T.green}  bgColor={T.greenBg}  sub={`${completionRate}% rate`} />
                  <KpiCard Icon={TrendingUp} label="In Progress"  value={inProg} color={T.yellow} bgColor={T.yellowBg} />
                  <KpiCard Icon={Clock}      label="Pending"      value={pend}   color={T.slate}  bgColor={T.slateBg}  />
                  <KpiCard Icon={AlertCircle} label="Overdue"     value={overdue} color={T.red}   bgColor={T.redBg}    sub={overdue ? "Needs attention" : "All on track"} />
                </div>

                {/* charts row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>

                  {/* Status Pie */}
                  <ChartCard title="Task Status Breakdown" subtitle="Your tasks by current status">
                    {statusPieData.length === 0 ? (
                      <div style={{ height: 240, display: "grid", placeItems: "center", color: T.textMuted, fontSize: 13 }}>No task data yet</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                            {statusPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} strokeWidth={0} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend iconType="circle" iconSize={8} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                    <div style={{ textAlign: "center", marginTop: 8 }}>
                      <span style={{ fontSize: 13, color: T.textMuted }}>Completion rate: </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: T.green }}>{completionRate}%</span>
                    </div>
                  </ChartCard>

                  {/* Priority Bar */}
                  <ChartCard title="Tasks by Priority" subtitle="Distribution across priority levels">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={priorityBarData} barSize={36} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(247, 147, 30,.05)" }} />
                        <Bar dataKey="count" name="Tasks" radius={[8, 8, 0, 0]}>
                          {priorityBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>

                {/* recent tasks preview */}
                <ChartCard title="Recent Tasks" subtitle="Your latest 3 assigned tasks">
                  {tasks.length === 0 ? (
                    <div style={{ padding: "30px 0", textAlign: "center", color: T.textMuted, fontSize: 13 }}>No tasks assigned yet</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {tasks.slice(0, 3).map((task) => {
                        const sm = STATUS[task.status] || STATUS.pending;
                        const pm = PRIORITY[task.priority] || PRIORITY.medium;
                        const StatusIcon = sm.Icon;
                        return (
                          <div key={task._id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", background: T.bg, borderRadius: 12, border: `1px solid ${T.borderLight}` }}>
                            <div style={{ width: 3, alignSelf: "stretch", borderRadius: 99, background: pm.color, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 13.5, color: T.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.title}</div>
                              <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 3, display: "flex", alignItems: "center", gap: 5 }}>
                                <Calendar size={11} strokeWidth={1.8} />
                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No due date"}
                              </div>
                            </div>
                            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 7, color: sm.color, background: sm.bg, border: `1px solid ${sm.border}`, flexShrink: 0 }}>
                              <StatusIcon size={11} strokeWidth={2} />{sm.label}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 5, color: pm.color, background: pm.bg, border: `1px solid ${pm.border}`, letterSpacing: ".07em", textTransform: "uppercase", flexShrink: 0 }}>
                              {pm.label}
                            </span>
                          </div>
                        );
                      })}
                      {tasks.length > 3 && (
                        <button onClick={() => setTab("tasks")} style={{ background: "none", border: "none", cursor: "pointer", color: T.brand, fontSize: 13, fontWeight: 600, padding: "8px 0 0", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 5 }}>
                          View all {tasks.length} tasks →
                        </button>
                      )}
                    </div>
                  )}
                </ChartCard>
              </div>
            )}

            {/* ══ MY TASKS ═══════════════════════════════════════════════════ */}
            {tab === "tasks" && (
              <div className="fade-up">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>My Tasks</h2>
                    <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>{total} task{total !== 1 ? "s" : ""} assigned to you</p>
                  </div>
                  {/* filter chips */}
                  <div style={{ display: "flex", gap: 8 }}>
                    {[
                      { label: `All (${total})`,        color: T.brand,  bg: T.brandLight  },
                      { label: `Done (${done})`,        color: T.green,  bg: T.greenBg     },
                      { label: `Active (${inProg})`,    color: T.yellow, bg: T.yellowBg    },
                      { label: `Pending (${pend})`,     color: T.slate,  bg: T.slateBg     },
                    ].map(({ label, color, bg }) => (
                      <span key={label} style={{ fontSize: 11.5, fontWeight: 600, padding: "5px 12px", borderRadius: 20, color, background: bg, border: `1px solid ${color}30` }}>{label}</span>
                    ))}
                  </div>
                </div>

                {tasks.length === 0 && assignedClients.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "80px 0" }}>
                    <ClipboardList size={48} strokeWidth={1} color={T.textMuted} style={{ margin: "0 auto 16px", display: "block" }} />
                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, color: T.textSecondary }}>No tasks assigned</p>
                    <p style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>Check back later or contact your admin</p>
                  </div>
                ) : tasks.length === 0 ? null : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {tasks.map((task, i) => {
                      const sm = STATUS[task.status] || STATUS.pending;
                      const pm = PRIORITY[task.priority] || PRIORITY.medium;
                      const isOverdue = task.dueDate && task.status !== "completed" && new Date(task.dueDate) < new Date();

                      return (
                        <div key={task._id} className="task-card card-in" style={{
                          background: T.card, border: `1.5px solid ${T.border}`,
                          borderRadius: 16, padding: "20px 22px",
                          animationDelay: `${i * 35}ms`,
                          boxShadow: "0 1px 3px rgba(0,0,0,.04)",
                        }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
                            {/* priority accent bar */}
                            <div style={{ width: 3, borderRadius: 99, background: pm.color, alignSelf: "stretch", marginRight: 18, flexShrink: 0, minHeight: 52 }} />

                            <div style={{ flex: 1, minWidth: 0 }}>
                              {/* title row */}
                              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 6 }}>
                                <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 15, color: T.textPrimary }}>{task.title}</h3>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 5, color: pm.color, background: pm.bg, border: `1px solid ${pm.border}`, letterSpacing: ".07em", textTransform: "uppercase" }}>{pm.label}</span>
                                {isOverdue && (
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 5, color: T.red, background: T.redBg, border: `1px solid ${T.redBorder}`, letterSpacing: ".07em", textTransform: "uppercase" }}>Overdue</span>
                                )}
                              </div>

                              {/* description */}
                              {task.description && (
                                <p style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.65, marginBottom: 14 }}>{task.description}</p>
                              )}

                              {/* meta + status row */}
                              <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: isOverdue ? T.red : T.textMuted, fontWeight: isOverdue ? 600 : 400 }}>
                                  <Calendar size={12} strokeWidth={1.8} />
                                  {task.dueDate
                                    ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                    : "No due date"}
                                </span>
                                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: T.textMuted }}>
                                  <User size={12} strokeWidth={1.8} />
                                  Assigned to you
                                </span>

                                {/* spacer */}
                                <div style={{ flex: 1 }} />

                                {/* status dropdown */}
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 500 }}>Status:</span>
                                  <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                                    {updating === task._id ? (
                                      <span style={{ fontSize: 12, color: T.textMuted, padding: "7px 14px" }}>Saving…</span>
                                    ) : (
                                      <>
                                        <sm.Icon size={13} color={sm.color} strokeWidth={2} style={{ position: "absolute", left: 10, pointerEvents: "none", zIndex: 1 }} />
                                        <ChevronDown size={13} color={T.textMuted} strokeWidth={2} style={{ position: "absolute", right: 9, pointerEvents: "none", zIndex: 1 }} />
                                        <select
                                          value={task.status || "pending"}
                                          onChange={e => handleStatusChange(task._id, e.target.value)}
                                          style={{
                                            appearance: "none", cursor: "pointer",
                                            padding: "7px 30px 7px 30px",
                                            fontSize: 12, fontWeight: 600, borderRadius: 8,
                                            color: sm.color, background: sm.bg,
                                            border: `1.5px solid ${sm.border}`,
                                            fontFamily: "inherit", outline: "none",
                                            transition: "border-color .18s",
                                          }}
                                        >
                                          <option value="pending">Pending</option>
                                          <option value="in-progress">In Progress</option>
                                          <option value="completed">Completed</option>
                                        </select>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {assignedClients.length > 0 && (
                  <div style={{ marginTop: 36 }}>
                    <div style={{ marginBottom: 16 }}>
                      <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>Assigned Client Work</h2>
                      <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>Clients assigned to you — view scope of work, add remarks, and update progress.</p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {assignedClients.map((client) => (
                        <div
                          key={client._id}
                          className="task-card card-in"
                          onClick={() => setOpenClientTaskId(client._id)}
                          style={{
                            background: T.card, border: `1.5px solid ${T.border}`,
                            borderRadius: 16, padding: "18px 22px",
                            boxShadow: "0 1px 3px rgba(0,0,0,.04)", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 14,
                          }}
                        >
                          <Briefcase size={18} color={T.brand} strokeWidth={2} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14.5, color: T.textPrimary }}>{client.clientName}</h3>
                            <p style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                              {client.companyName || client.projectName || "Client project"}
                            </p>
                          </div>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: T.brand }}>View details →</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══ APPLY LEAVE ════════════════════════════════════════════════ */}
            {tab === "leave" && (
              <div className="fade-up">
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>Leave</h2>
                  <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>Check your balance and submit leave requests.</p>
                </div>

                {/* Leave balance strip */}
                {leaveBalance && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                    {[
                      { key: "casual", label: "Casual", color: "#2563eb", bg: "#eff6ff" },
                      { key: "sick",   label: "Sick",   color: "#d97706", bg: "#fffbeb" },
                      { key: "earned", label: "Earned", color: "#16a34a", bg: "#f0fdf4" },
                    ].map(({ key, label, color, bg }) => {
                      const b = leaveBalance[key] || { quota: 0, used: 0, carryForward: 0 };
                      const total = b.quota + b.carryForward;
                      const remaining = Math.max(0, total - b.used);
                      return (
                        <div key={key} style={{ background: bg, border: `1px solid ${color}33`, borderRadius: 12, padding: "14px 16px" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label} Leave</div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b" }}>{remaining}<span style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8", marginLeft: 4 }}>/ {total} days</span></div>
                          <div style={{ background: "#ffffff55", borderRadius: 99, height: 5, marginTop: 8 }}>
                            <div style={{ width: `${total > 0 ? Math.min(100, (b.used / total) * 100) : 0}%`, background: color, borderRadius: 99, height: 5 }} />
                          </div>
                          <div style={{ fontSize: 10, color, marginTop: 3, fontWeight: 600 }}>{b.used} used</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <form onSubmit={handleApplyLeave} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "22px", boxShadow: "0 1px 3px rgba(0,0,0,.04)", marginBottom: 26 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, letterSpacing: ".06em", textTransform: "uppercase" }}>Leave Type</label>
                      <select value={leaveForm.leaveType} onChange={e => setLeaveForm(p => ({ ...p, leaveType: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", background: T.inputBg, border: `1.5px solid ${T.inputBorder}`, borderRadius: 10, padding: "10px 14px", color: T.textPrimary, fontSize: 13.5, outline: "none", fontFamily: "inherit" }}>
                        <option value="casual">Casual</option>
                        <option value="sick">Sick</option>
                        <option value="earned">Earned</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, letterSpacing: ".06em", textTransform: "uppercase" }}>From Date</label>
                      <input type="date" required value={leaveForm.fromDate} onChange={e => setLeaveForm(p => ({ ...p, fromDate: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", background: T.inputBg, border: `1.5px solid ${T.inputBorder}`, borderRadius: 10, padding: "10px 14px", color: T.textPrimary, fontSize: 13.5, outline: "none", fontFamily: "inherit" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, letterSpacing: ".06em", textTransform: "uppercase" }}>To Date</label>
                      <input type="date" required value={leaveForm.toDate} onChange={e => setLeaveForm(p => ({ ...p, toDate: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", background: T.inputBg, border: `1.5px solid ${T.inputBorder}`, borderRadius: 10, padding: "10px 14px", color: T.textPrimary, fontSize: 13.5, outline: "none", fontFamily: "inherit" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, letterSpacing: ".06em", textTransform: "uppercase" }}>Reason</label>
                    <textarea required rows={3} value={leaveForm.reason} onChange={e => setLeaveForm(p => ({ ...p, reason: e.target.value }))} placeholder="Briefly explain the reason for leave" style={{ width: "100%", boxSizing: "border-box", resize: "vertical", background: T.inputBg, border: `1.5px solid ${T.inputBorder}`, borderRadius: 10, padding: "10px 14px", color: T.textPrimary, fontSize: 13.5, outline: "none", fontFamily: "inherit" }} />
                  </div>
                  <button type="submit" disabled={submittingLeave} style={{ display: "flex", alignItems: "center", gap: 8, background: `linear-gradient(135deg, ${T.brand}, ${T.brandMid})`, color: "#fff", border: "none", borderRadius: 10, padding: "11px 20px", fontSize: 13.5, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: submittingLeave ? "not-allowed" : "pointer", opacity: submittingLeave ? .7 : 1 }}>
                    <Send size={14} strokeWidth={2.2} /> {submittingLeave ? "Submitting…" : "Submit Request"}
                  </button>
                </form>

                <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary, marginBottom: 14 }}>Your Requests</h3>

                {leaves.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 0" }}>
                    <FileText size={40} strokeWidth={1} color={T.textMuted} style={{ margin: "0 auto 14px", display: "block" }} />
                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, color: T.textSecondary }}>No leave requests yet</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {leaves.map((leave) => {
                      const lm = LEAVE_STATUS[leave.status] || LEAVE_STATUS.pending;
                      return (
                        <div key={leave._id} className="task-card card-in" style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: T.textPrimary }}>
                                <Calendar size={13} strokeWidth={1.8} color={T.textMuted} />
                                {new Date(leave.fromDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                {" — "}
                                {new Date(leave.toDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </div>
                              <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 6 }}>{leave.reason}</p>
                              {leave.adminComment && (
                                <p style={{ fontSize: 12, color: T.textSecondary, marginTop: 6, fontStyle: "italic" }}>Admin: {leave.adminComment}</p>
                              )}
                            </div>
                            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 7, color: lm.color, background: lm.bg, border: `1px solid ${lm.border}`, flexShrink: 0 }}>
                              <lm.Icon size={11} strokeWidth={2} />{lm.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══ SALARY ═════════════════════════════════════════════════════ */}
            {tab === "salary" && (
              <div className="fade-up">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>Salary Slips</h2>
                    <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>View the salary slips emailed by your admin.</p>
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: T.brand, background: T.brandLight, border: `1px solid ${T.brandMid}`, borderRadius: 999, padding: "8px 12px" }}>
                    {salarySlips.length} slip{salarySlips.length !== 1 ? "s" : ""}
                  </div>
                </div>

                {salarySlips.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "80px 0" }}>
                    <Shield size={48} strokeWidth={1} color={T.textMuted} style={{ margin: "0 auto 16px", display: "block" }} />
                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, color: T.textSecondary }}>No salary slips yet</p>
                    <p style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>Your paid salary slips will appear here after admin sends them.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {salarySlips.map((slip, i) => {
                      const totalAllowances = (Number(slip.homeAllowance) || 0) + (Number(slip.travelAllowance) || 0) + (Number(slip.otherAllowance) || 0);
                      const totalDeductions = (Number(slip.pf) || 0) + (Number(slip.deductions) || 0);

                      return (
                        <div key={slip._id} className="task-card card-in" style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: "22px", animationDelay: `${i * 35}ms`, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
                            <div>
                              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: T.textPrimary }}>{slip.salaryMonth}</div>
                              <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 4 }}>Slip No: {slip.slipNumber}</div>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "6px 10px", borderRadius: 999, color: T.green, background: T.greenBg, border: `1px solid ${T.greenBorder}` }}>
                              Paid on {new Date(slip.paidAt || slip.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
                            <div style={{ background: T.bg, border: `1px solid ${T.borderLight}`, borderRadius: 12, padding: "14px 12px" }}>
                              <div style={{ fontSize: 10.5, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>Basic</div>
                              <div style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary, marginTop: 8, fontFamily: "'Syne', sans-serif" }}>{fmtCurrency(slip.basicSalary)}</div>
                            </div>
                            <div style={{ background: T.greenBg, border: `1px solid ${T.greenBorder}`, borderRadius: 12, padding: "14px 12px" }}>
                              <div style={{ fontSize: 10.5, color: T.green, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>Allowances</div>
                              <div style={{ fontSize: 18, fontWeight: 700, color: T.green, marginTop: 8, fontFamily: "'Syne', sans-serif" }}>{fmtCurrency(totalAllowances)}</div>
                            </div>
                            <div style={{ background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: 12, padding: "14px 12px" }}>
                              <div style={{ fontSize: 10.5, color: T.red, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>Deductions</div>
                              <div style={{ fontSize: 18, fontWeight: 700, color: T.red, marginTop: 8, fontFamily: "'Syne', sans-serif" }}>{fmtCurrency(totalDeductions)}</div>
                            </div>
                            <div style={{ background: T.brandLight, border: `1px solid ${T.brandMid}`, borderRadius: 12, padding: "14px 12px" }}>
                              <div style={{ fontSize: 10.5, color: T.brand, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>In Hand</div>
                              <div style={{ fontSize: 18, fontWeight: 700, color: T.brand, marginTop: 8, fontFamily: "'Syne', sans-serif" }}>{fmtCurrency(slip.inHand)}</div>
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
                            {[
                              { label: "Home", value: fmtCurrency(slip.homeAllowance) },
                              { label: "Travel", value: fmtCurrency(slip.travelAllowance) },
                              { label: "Other", value: fmtCurrency(slip.otherAllowance) },
                              { label: "PF", value: fmtCurrency(slip.pf) },
                              { label: "Leaves", value: Number(slip.leaves) || 0 },
                            ].map((item) => (
                              <div key={item.label} style={{ background: "#fff", border: `1px solid ${T.borderLight}`, borderRadius: 12, padding: "12px" }}>
                                <div style={{ fontSize: 10.5, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>{item.label}</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, marginTop: 7 }}>{item.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══ MY EXPENSES ════════════════════════════════════════════════ */}
            {tab === "expenses" && (
              <div className="fade-up">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>My Expenses</h2>
                    <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>Submit reimbursement requests and track their approval status.</p>
                  </div>
                  <button
                    onClick={() => setShowExpForm((v) => !v)}
                    style={{ display: "flex", alignItems: "center", gap: 7, background: `linear-gradient(135deg, ${T.brand}, ${T.brandMid})`, color: "#fff", border: "none", borderRadius: 11, padding: "10px 18px", fontSize: 13.5, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer" }}
                  >
                    <Plus size={15} strokeWidth={2.5} /> {showExpForm ? "Cancel" : "New Request"}
                  </button>
                </div>

                {/* Submit form */}
                {showExpForm && (
                  <form onSubmit={handleExpenseSubmit} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "22px", boxShadow: "0 1px 3px rgba(0,0,0,.04)", marginBottom: 24 }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary, marginBottom: 18 }}>Submit Reimbursement Request</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div style={{ gridColumn: "1/-1" }}>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, marginBottom: 5 }}>Title *</div>
                        <input required style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: T.inputBg, color: T.textPrimary, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                          value={expForm.title} onChange={(e) => setExpForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Travel to client office" />
                      </div>
                      <div>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, marginBottom: 5 }}>Category</div>
                        <select style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: T.inputBg, color: T.textPrimary, fontSize: 13, fontFamily: "inherit", outline: "none", appearance: "none" }}
                          value={expForm.categoryId} onChange={(e) => setExpForm((f) => ({ ...f, categoryId: e.target.value }))}>
                          <option value="">No category</option>
                          {expCategories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, marginBottom: 5 }}>Amount (₹) *</div>
                        <input required type="number" min="0" step="0.01" style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: T.inputBg, color: T.textPrimary, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                          value={expForm.amount} onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
                      </div>
                      <div>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, marginBottom: 5 }}>Expense Date *</div>
                        <input required type="date" style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: T.inputBg, color: T.textPrimary, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                          value={expForm.expenseDate} onChange={(e) => setExpForm((f) => ({ ...f, expenseDate: e.target.value }))} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, marginBottom: 5 }}>Payment Method</div>
                        <select style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: T.inputBg, color: T.textPrimary, fontSize: 13, fontFamily: "inherit", outline: "none", appearance: "none" }}
                          value={expForm.paymentMethod} onChange={(e) => setExpForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, marginBottom: 5 }}>Tax / GST (₹)</div>
                        <input type="number" min="0" step="0.01" style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: T.inputBg, color: T.textPrimary, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                          value={expForm.tax} onChange={(e) => setExpForm((f) => ({ ...f, tax: e.target.value }))} placeholder="0.00" />
                      </div>
                      <div style={{ gridColumn: "1/-1" }}>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, marginBottom: 5 }}>Description / Notes</div>
                        <textarea rows={2} style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: T.inputBg, color: T.textPrimary, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                          value={expForm.description} onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))} placeholder="Reason for expense or additional details" />
                      </div>
                    </div>
                    <button type="submit" disabled={expSubmitting} style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 8, background: `linear-gradient(135deg, ${T.brand}, ${T.brandMid})`, color: "#fff", border: "none", borderRadius: 10, padding: "11px 20px", fontSize: 13.5, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: expSubmitting ? "not-allowed" : "pointer", opacity: expSubmitting ? .7 : 1 }}>
                      <Send size={14} strokeWidth={2.2} /> {expSubmitting ? "Submitting…" : "Submit Request"}
                    </button>
                  </form>
                )}

                {/* Expense list */}
                {expLoading ? (
                  <div style={{ padding: 40, textAlign: "center", color: T.textMuted }}>Loading…</div>
                ) : myExpenses.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 0" }}>
                    <IndianRupee size={40} strokeWidth={1} color={T.textMuted} style={{ margin: "0 auto 14px", display: "block" }} />
                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, color: T.textSecondary }}>No expense requests yet</p>
                    <p style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>Click "New Request" to submit a reimbursement</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {myExpenses.map((exp) => {
                      const sc = EXPENSE_STATUS_COLOR[exp.status] || "#94a3b8";
                      const sl = EXPENSE_STATUS_LABEL[exp.status] || exp.status;
                      return (
                        <div key={exp._id} className="task-card card-in" style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${sc}18`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                            <Receipt size={18} color={sc} strokeWidth={2} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: T.textPrimary }}>{exp.title}</div>
                            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>
                              {new Date(exp.expenseDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              {exp.paymentMethod && <span> · {exp.paymentMethod}</span>}
                              {exp.categoryId?.name && <span> · {exp.categoryId.name}</span>}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary }}>₹{Number(exp.totalAmount).toLocaleString("en-IN")}</div>
                            <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 9px", borderRadius: 20, background: `${sc}18`, color: sc }}>
                              {sl}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══ MY CLIENTS ═════════════════════════════════════════════════ */}
            {tab === "clients" && (
              <div className="fade-up" style={{ margin: "-30px -36px -64px" }}>
                <ClientsPage />
              </div>
            )}

            {/* ══ MY APPRAISALS ══════════════════════════════════════════════ */}
            {tab === "appraisal" && (
              <div className="fade-up">
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>My Appraisals</h2>
                  <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>View your review cycles and submit self-assessments.</p>
                </div>

                {/* Shift info banner */}
                {myShift && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
                    <Sun size={18} color="#0891b2" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0891b2" }}>{myShift.name} Shift</div>
                      <div style={{ fontSize: 11, color: "#0369a1" }}>
                        {String(myShift.startHour).padStart(2,"0")}:{String(myShift.startMinute||0).padStart(2,"0")} – {String(myShift.endHour).padStart(2,"0")}:{String(myShift.endMinute||0).padStart(2,"0")} · Late if check-in after {String(myShift.startHour).padStart(2,"0")}:{String(myShift.startMinute||0).padStart(2,"0")}
                      </div>
                    </div>
                  </div>
                )}

                {appraisalLoading ? (
                  <div style={{ textAlign: "center", padding: 60, color: T.textMuted }}>Loading…</div>
                ) : myAppraisals.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px 0" }}>
                    <Award size={40} strokeWidth={1} color={T.textMuted} style={{ margin: "0 auto 14px", display: "block" }} />
                    <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, color: T.textSecondary }}>No review cycles yet</p>
                    <p style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>When your admin opens a review cycle, it will appear here.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {myAppraisals.map((a) => {
                      const cycle = a.cycleId;
                      const statusColor = { pending: "#94a3b8", self_assessed: "#d97706", reviewed: "#2563eb", finalized: "#16a34a" }[a.status] || "#94a3b8";
                      const statusLabel = { pending: "Pending Self-Assessment", self_assessed: "Awaiting Review", reviewed: "Reviewed", finalized: "Finalized" }[a.status] || a.status;
                      return (
                        <div key={a._id} style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: "18px 22px" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                                <div style={{ fontWeight: 700, fontSize: 15, color: T.textPrimary }}>{cycle?.title || "Review Cycle"}</div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: statusColor, background: statusColor + "18", borderRadius: 6, padding: "2px 9px" }}>{statusLabel}</span>
                              </div>
                              <div style={{ fontSize: 12, color: T.textMuted }}>
                                {cycle?.period} · {cycle?.year}{cycle?.quarter ? ` Q${cycle.quarter}` : ""}
                              </div>
                              {a.finalRating > 0 && (
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>{"⭐".repeat(a.finalRating)}</span>
                                  <span style={{ fontSize: 12, color: T.textMuted }}>Final: {a.finalRating}/5</span>
                                  {a.salaryRevisionFlag && <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", background: "#f0fdf4", borderRadius: 6, padding: "2px 8px" }}>Revision {a.salaryRevisionPercent}%</span>}
                                </div>
                              )}
                              {a.managerComment && (
                                <div style={{ marginTop: 8, padding: "8px 12px", background: "#f0fdf4", borderRadius: 9, fontSize: 12, color: T.textSecondary, borderLeft: "3px solid #bbf7d0" }}>
                                  <span style={{ fontWeight: 600, color: "#16a34a" }}>Manager: </span>{a.managerComment}
                                </div>
                              )}
                            </div>
                            {a.status === "pending" && cycle?.status === "open" && (
                              <button
                                onClick={() => {
                                  setSelfAssessTarget(a);
                                  setSaForm({ selfRating: a.selfRating || 0, selfComment: a.selfComment || "", goalResponses: (a.goalResponses || []).length ? a.goalResponses : (cycle.goals || []).map((g) => ({ goal: g, selfResponse: "" })) });
                                }}
                                style={{ background: T.brand, color: "#fff", border: "none", borderRadius: 9, padding: "9px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
                              >
                                Self Assess
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </main>
        </div>

        {/* ── ASSIGNED CLIENT TASK DETAIL ──────────────────────────────────────── */}
        {openClientTaskId && (
          <div className="modal-overlay" onClick={() => setOpenClientTaskId(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <ClientTaskDetail clientId={openClientTaskId} onClose={() => setOpenClientTaskId(null)} />
            </div>
          </div>
        )}

        {/* ── SELF-ASSESS MODAL ────────────────────────────────────────────── */}
        {selfAssessTarget && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>Self Assessment</div>
                <button onClick={() => setSelfAssessTarget(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={18} /></button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Overall Self Rating</label>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[1,2,3,4,5].map((n) => (
                      <button key={n} type="button" onClick={() => setSaForm((f) => ({ ...f, selfRating: n }))}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 24, color: n <= saForm.selfRating ? "#f59e0b" : "#e2e8f0" }}>
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                {saForm.goalResponses.map((gr, i) => (
                  <div key={i}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>{gr.goal}</label>
                    <textarea rows={2} value={gr.selfResponse} onChange={(e) => setSaForm((f) => ({ ...f, goalResponses: f.goalResponses.map((g, idx) => idx === i ? { ...g, selfResponse: e.target.value } : g) }))}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                  </div>
                ))}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Overall Comment</label>
                  <textarea rows={3} value={saForm.selfComment} onChange={(e) => setSaForm((f) => ({ ...f, selfComment: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => setSelfAssessTarget(null)} style={{ padding: "9px 18px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#64748b", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Cancel</button>
                  <button disabled={saSubmitting || !saForm.selfRating} onClick={async () => {
                    setSaSubmitting(true);
                    try {
                      await API.put(`/performance/appraisals/${selfAssessTarget._id}/self-assess`, saForm);
                      fetchMyAppraisals();
                      setSelfAssessTarget(null);
                      showToast("Self-assessment submitted!");
                    } catch { showToast("Failed to submit", false); }
                    finally { setSaSubmitting(false); }
                  }} style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13, opacity: (saSubmitting || !saForm.selfRating) ? 0.6 : 1 }}>
                    {saSubmitting ? "Submitting…" : "Submit"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TOAST ─────────────────────────────────────────────────────────── */}
        {toast && (
          <div style={{ position: "fixed", bottom: 26, right: 26, zIndex: 9999, background: "#fff", border: `1.5px solid ${toast.ok ? T.greenBorder : T.redBorder}`, borderRadius: 13, padding: "14px 18px", fontWeight: 500, fontSize: 13.5, animation: "toastIn .26s cubic-bezier(.22,1,.36,1) both", display: "flex", alignItems: "center", gap: 11, boxShadow: "0 8px 32px rgba(0,0,0,.12)", maxWidth: 340 }}>
            {toast.ok ? <CheckCircle2 size={17} strokeWidth={2} color={T.green} /> : <AlertCircle size={17} strokeWidth={2} color={T.red} />}
            <span style={{ flex: 1, color: T.textPrimary }}>{toast.msg}</span>
            <button onClick={() => setToast(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex", padding: 0 }}>
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        )}

      </div>
    </>
  );
}

export default function UserDashboard() {
  return (
    <TenantBrandingProvider>
      <UserDashboardInner />
    </TenantBrandingProvider>
  );
}
