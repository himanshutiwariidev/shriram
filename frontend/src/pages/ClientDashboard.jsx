import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Package, Wallet, LogOut, AlertTriangle, Building2, TrendingUp, CalendarClock } from "lucide-react";
import { getMyProject, getWorkProgress } from "../services/clientApi";
import TenantLogo from "../components/TenantLogo";
import NotificationBell from "../components/NotificationBell";
import useTenantTheme from "../hooks/useTenantTheme";
import { TenantBrandingProvider } from "../context/TenantBrandingContext";
import API from "../services/api";
import "./ClientDashboard.css";
import { useAuth } from "../context/AuthContext";

const STATUS_COLORS = {
  Pending: "#94a3b8",
  "In Progress": "#d97706",
  Completed: "#16a34a",
};

const PROGRESS_STATUS_COLORS = {
  "Pending": "#94a3b8",
  "In Progress": "#2563eb",
  "On Hold": "#d97706",
  "Waiting for Client": "#7c3aed",
  "Completed": "#16a34a",
};

function ClientDashboardInner() {
  const [data, setData] = useState(null);
  const [latestProgress, setLatestProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // null = still loading or the Meeting Scheduler isn't enabled for this
  // tenant (e.g. a 403) — in either case the section below renders nothing,
  // matching how the rest of this read-only portal degrades gracefully.
  const [meetings, setMeetings] = useState(null);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { T, branding } = useTenantTheme();

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getMyProject();
        setData(response.data);
        const clientId = response.data?.client?.id;
        if (clientId) {
          try {
            const progressRes = await getWorkProgress(clientId);
            setLatestProgress(progressRes.data?.workProgress?.[0] || null);
          } catch {
            setLatestProgress(null);
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    let cancelled = false;
    API.get("/meetings/mine")
      .then(({ data: res }) => { if (!cancelled) setMeetings(res.meetings || []); })
      .catch(() => { if (!cancelled) setMeetings(null); });
    return () => { cancelled = true; };
  }, []);

  const upcomingMeetings = (meetings || []).filter((m) => new Date(m.startTime) >= new Date());

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (loading) {
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap');`}</style>
        <div className="client-dashboard-loading">Loading your dashboard...</div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap');`}</style>
        <div className="client-dashboard-loading">{error}</div>
      </>
    );
  }

  const projects = data?.projects || [];

  return (
    <>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap'); .client-dashboard { font-family: 'Inter', sans-serif; }`}</style>
    <div className="client-dashboard">
      <header style={{ position: "sticky", top: 0, zIndex: 50, height: 64, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.96)", borderBottom: "1px solid #e8eaf0", backdropFilter: "blur(16px)", boxShadow: "0 1px 0 0 #e8eaf0", marginBottom: 30, marginLeft: -40, marginRight: -40, marginTop: -32, paddingLeft: 40, paddingRight: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <TenantLogo logoUrl={branding.logoUrl} name={branding.name} primaryColor={branding.primaryColor} size={34} />
          <div style={{ width: 1, height: 32, background: "#e2e8f0" }} />
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: "#1e293b", lineHeight: 1 }}>Welcome, {data?.client?.clientName}</h1>
            <p style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}><Building2 size={11} strokeWidth={2} /> {data?.client?.companyName}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <NotificationBell />
          <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 9, border: "1px solid rgba(220,38,38,0.3)", background: "rgba(220,38,38,0.06)", color: "#dc2626", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>
            <LogOut size={14} strokeWidth={2} /> Sign Out
          </button>
        </div>
      </header>

      {meetings && meetings.length > 0 && (
        <div className="client-project-card">
          <div className="client-card">
            <h3><CalendarClock size={15} strokeWidth={2} color={T.brand} /> Upcoming Meetings</h3>
            <div className="client-deliverables">
              {upcomingMeetings.length === 0 ? (
                <p className="client-dashboard-muted">No upcoming meetings.</p>
              ) : (
                upcomingMeetings.map((m) => (
                  <div className="client-deliverable-row" key={m._id}>
                    <div className="client-deliverable-top">
                      <span>{m.title}</span>
                    </div>
                    <div className="client-deliverable-meta">
                      {format(new Date(m.startTime), "MMM d, yyyy · h:mm a")}
                      {m.location ? ` · ${m.location}` : ""}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {latestProgress && (
        <div className="client-project-card">
          <div className="client-card">
            <h3><TrendingUp size={15} strokeWidth={2} color={T.brand} /> Latest Update</h3>
            <div className="client-deliverable-row">
              <div className="client-deliverable-top">
                <span>{latestProgress.title}</span>
                <span
                  className="client-status-pill"
                  style={{
                    color: PROGRESS_STATUS_COLORS[latestProgress.status] || "#94a3b8",
                    background: `${PROGRESS_STATUS_COLORS[latestProgress.status] || "#94a3b8"}1a`,
                  }}
                >
                  {latestProgress.status}
                </span>
              </div>
              {latestProgress.description && (
                <p className="client-dashboard-muted" style={{ margin: "4px 0 8px" }}>{latestProgress.description}</p>
              )}
              <div className="client-progress-bar">
                <div
                  className="client-progress-fill"
                  style={{ width: `${latestProgress.percentage || 0}%`, background: PROGRESS_STATUS_COLORS[latestProgress.status] || "#94a3b8" }}
                />
              </div>
              <div className="client-deliverable-meta">
                {latestProgress.percentage || 0}% complete · {new Date(latestProgress.createdAt).toLocaleDateString("en-IN")}
              </div>
            </div>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="client-dashboard-empty">No active projects yet.</div>
      ) : (
        projects.map((project) => {
          const isOverdue = project.isOverdue;
          const paidPercent = project.projectAmount > 0
            ? Math.min(100, Math.round((project.receivedAmount / project.projectAmount) * 100))
            : 0;

          return (
            <div className="client-project-card" key={project.id}>
              <h2>{project.projectName}</h2>

              <div className="client-card">
                <h3><Package size={15} strokeWidth={2} color={T.brand} /> Scope of Work</h3>
                {!project.deliverables?.length ? (
                  <p className="client-dashboard-muted">No deliverables defined yet.</p>
                ) : (
                  <div className="client-deliverables">
                    {project.deliverables.map((item) => {
                      const isRecurring = item.frequency === "week" || item.frequency === "month";
                      const due = item.due ?? item.quantity;
                      const delivered = item.delivered || 0;
                      const pending = item.pending ?? Math.max(0, due - delivered);
                      const progress = due > 0 ? Math.min(100, Math.round((delivered / due) * 100)) : 0;

                      return (
                        <div className="client-deliverable-row" key={item._id}>
                          <div className="client-deliverable-top">
                            <span>
                              {item.title}
                              {isRecurring && <span className="client-frequency-badge">{item.quantity}/{item.frequency}</span>}
                            </span>
                            <span className="client-status-pill" style={{ color: STATUS_COLORS[item.status], background: `${STATUS_COLORS[item.status]}1a` }}>{item.status}</span>
                          </div>
                          <div className="client-progress-bar">
                            <div className="client-progress-fill" style={{ width: `${progress}%`, background: STATUS_COLORS[item.status] }} />
                          </div>
                          <div className="client-deliverable-meta">
                            Completed: {delivered} / {due} · Pending: {pending} ({progress}%)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="client-card">
                <h3><Wallet size={15} strokeWidth={2} color={T.brand} /> Payment Overview</h3>
                <div className="client-payment-grid">
                  <div>
                    <span className="client-payment-label">Project Amount</span>
                    <span className="client-payment-value">₹{(project.projectAmount || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div>
                    <span className="client-payment-label">Paid</span>
                    <span className="client-payment-value" style={{ color: "#16a34a" }}>₹{(project.receivedAmount || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div>
                    <span className="client-payment-label">Pending</span>
                    <span className="client-payment-value" style={{ color: "#d97706" }}>₹{(project.dueAmount || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div>
                    <span className="client-payment-label">Due Date</span>
                    <span className="client-payment-value">
                      {project.nextDueDate ? new Date(project.nextDueDate).toLocaleDateString("en-IN") : "N/A"}
                    </span>
                  </div>
                </div>
                <div className="client-progress-bar" style={{ marginTop: 14 }}>
                  <div className="client-progress-fill" style={{ width: `${paidPercent}%`, background: `linear-gradient(135deg, ${T.brand}, ${T.brandMid})` }} />
                </div>
                <div className="client-deliverable-meta">{paidPercent}% Paid</div>
                {isOverdue && <span className="client-overdue-badge"><AlertTriangle size={12} strokeWidth={2.2} /> Payment Overdue</span>}
              </div>
            </div>
          );
        })
      )}
    </div>
    </>
  );
}

export default function ClientDashboard() {
  return (
    <TenantBrandingProvider>
      <ClientDashboardInner />
    </TenantBrandingProvider>
  );
}
