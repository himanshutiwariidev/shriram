import React from "react";
import { AlertCircle, Calendar, ClipboardList, Plus, User } from "lucide-react";
import { FieldIcon, FormField, baseInp, baseInpNoIcon } from "./shared";
import useTenantTheme from "../../hooks/useTenantTheme";

export default function CreateTaskSection({ users, taskForm, setTaskForm, handleCreateTask }) {
  const { T } = useTenantTheme();
  return (
    <div className="fade-up" style={{ maxWidth: 620 }}>
      <div style={{ marginBottom: 26 }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: T.textPrimary }}>Create New Task</h2>
        <p style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>Fill in the details below to assign a new task</p>
      </div>
      <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 18, padding: "30px", boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
        <form onSubmit={handleCreateTask}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <FormField label="Task Title" span2>
              <div style={{ position: "relative" }}><FieldIcon icon={ClipboardList} /><input className="inp" style={baseInp} type="text" placeholder="Enter task title" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required /></div>
            </FormField>
            <FormField label="Assign To">
              <div style={{ position: "relative" }}><FieldIcon icon={User} /><select className="inp" style={{ ...baseInp, appearance: "none" }} value={taskForm.assignedTo} onChange={e => setTaskForm({ ...taskForm, assignedTo: e.target.value })}><option value="">Select a user</option>{users.filter(u => u.role === "user").map(u => <option key={u._id} value={u._id}>{u.name}</option>)}</select></div>
            </FormField>
            <FormField label="Due Date">
              <div style={{ position: "relative" }}><FieldIcon icon={Calendar} /><input className="inp" style={baseInp} type="date" value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} /></div>
            </FormField>
            <FormField label="Priority" span2>
              <div style={{ position: "relative" }}><FieldIcon icon={AlertCircle} /><select className="inp" style={{ ...baseInp, appearance: "none" }} value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}><option value="low">Low Priority</option><option value="medium">Medium Priority</option><option value="high">High Priority</option></select></div>
            </FormField>
            <FormField label="Description" span2>
              <textarea className="inp" style={{ ...baseInpNoIcon, minHeight: 96 }} placeholder="Optional task description…" value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
            </FormField>
          </div>
          <button className="pri-btn" type="submit" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: `linear-gradient(135deg, ${T.brand}, ${T.brandDark})`, color: "#fff", borderRadius: 11, padding: "13px", fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", letterSpacing: ".03em" }}>
            <Plus size={16} strokeWidth={2.5} /> Create Task
          </button>
        </form>
      </div>
    </div>
  );
}
