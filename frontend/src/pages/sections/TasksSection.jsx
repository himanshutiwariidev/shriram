import React from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, ClipboardList, Pencil, Plus, Trash2, User, Briefcase, ChevronRight } from "lucide-react";
import { IconBtn, PRIORITY, STATUS } from "./shared";
import useTenantTheme from "../../hooks/useTenantTheme";

export default function TasksSection({ tasks, clients = [], setTab, openEditTask, setDeleteTask }) {
  const { T } = useTenantTheme();
  const navigate = useNavigate();
  // Clients assigned to a non-sales User via the Client Detail page's "Assign Task"
  // action are real work assigned to someone too — surface them here alongside
  // plain Task-model entries so Admin sees everything assigned, in one place.
  const assignedClientTasks = clients.filter((c) => c.assignedUser);
  const totalCount = tasks.length + assignedClientTasks.length;

  return (
    <div className="fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>All Tasks</h2>
          <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>{totalCount} task{totalCount !== 1 ? "s" : ""} total</p>
        </div>
        <button className="pri-btn" onClick={() => setTab("createTask")} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: `linear-gradient(135deg, ${T.brand}, ${T.brandDark})`, color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
          <Plus size={15} strokeWidth={2.5} /> New Task
        </button>
      </div>

      {totalCount === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <ClipboardList size={48} strokeWidth={1} color={T.textMuted} style={{ margin: "0 auto 16px", display: "block" }} />
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, color: T.textSecondary }}>No tasks yet</p>
          <p style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>Create your first task to get started</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tasks.map((task, i) => {
            const sm = STATUS[task.status] || STATUS.pending;
            const pm = PRIORITY[task.priority] || PRIORITY.medium;
            const StatusIcon = sm.Icon;
            return (
              <div key={task._id} className="card card-in" style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: "18px 20px", animationDelay: `${i * 35}ms`, display: "flex", alignItems: "flex-start", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
                <div style={{ width: 3, borderRadius: 99, background: pm.color, alignSelf: "stretch", marginRight: 16, flexShrink: 0, minHeight: 52 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: task.description ? 5 : 10 }}>
                    <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14.5, color: T.textPrimary }}>{task.title}</h3>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 5, color: pm.color, background: pm.bg, border: `1px solid ${pm.border}`, letterSpacing: ".07em", textTransform: "uppercase" }}>{pm.label}</span>
                  </div>
                  {task.description && <p style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.65, marginBottom: 12 }}>{task.description}</p>}
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12, color: T.textMuted, alignItems: "center" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}><User size={12} strokeWidth={1.8} />{task.assignedTo?.name || "Unassigned"}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Calendar size={12} strokeWidth={1.8} />{task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No due date"}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 14, flexShrink: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 8, color: sm.color, background: sm.bg, border: `1px solid ${sm.border}` }}>
                    <StatusIcon size={12} strokeWidth={2} />{sm.label}
                  </span>
                  <IconBtn icon={Pencil} color={T.brand} bg={T.brandLight} hoverBg={T.brandMid} onClick={() => openEditTask(task)} title="Edit task" />
                  <IconBtn icon={Trash2} color={T.red} bg={T.redBg} hoverBg={T.redBorder} onClick={() => setDeleteTask(task)} title="Delete task" />
                </div>
              </div>
            );
          })}

          {assignedClientTasks.map((client, i) => (
            <div
              key={client._id}
              className="card card-in"
              onClick={() => navigate(`/clients/${client._id}`)}
              style={{
                background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 14,
                padding: "18px 20px", animationDelay: `${(tasks.length + i) * 35}ms`,
                display: "flex", alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,.04)",
                cursor: "pointer",
              }}
            >
              <div style={{ width: 3, borderRadius: 99, background: T.brand, alignSelf: "stretch", marginRight: 16, flexShrink: 0, minHeight: 40 }} />
              <Briefcase size={18} color={T.brand} strokeWidth={2} style={{ marginRight: 14, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", marginBottom: 4 }}>
                  <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14.5, color: T.textPrimary }}>{client.clientName}</h3>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 5, color: T.brand, background: T.brandLight, border: `1px solid ${T.brandMid}`, letterSpacing: ".07em", textTransform: "uppercase" }}>Client Assignment</span>
                </div>
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12, color: T.textMuted, alignItems: "center" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}><User size={12} strokeWidth={1.8} />Assigned to {client.assignedUser?.name || "Unassigned"}</span>
                  {client.companyName && <span>{client.companyName}</span>}
                </div>
              </div>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: T.brand, marginLeft: 14, flexShrink: 0 }}>
                View Client <ChevronRight size={13} strokeWidth={2.4} />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
