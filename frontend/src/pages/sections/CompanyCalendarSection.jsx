import React, { useEffect, useState, useMemo } from "react";
import API from "../../services/api";
import {
  ChevronLeft, ChevronRight, Calendar, Filter,
  Video, ClipboardList, Briefcase, Plane, DollarSign,
} from "lucide-react";

const EVENT_TYPES = {
  meeting:  { label: "Meeting",  color: "#2563eb", bg: "#eff6ff", icon: Video },
  task:     { label: "Task Due", color: "#7c3aed", bg: "#f5f3ff", icon: ClipboardList },
  project:  { label: "Project",  color: "#0891b2", bg: "#ecfeff", icon: Briefcase },
  leave:    { label: "Leave",    color: "#d97706", bg: "#fffbeb", icon: Plane },
  salary:   { label: "Salary",   color: "#16a34a", bg: "#f0fdf4", icon: DollarSign },
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export default function CompanyCalendarSection() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTypes, setActiveTypes] = useState(new Set(Object.keys(EVENT_TYPES)));
  const [selectedDay, setSelectedDay] = useState(null);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setSelectedDay(null);
  };

  useEffect(() => {
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    setLoading(true);

    const fetches = [];

    if (activeTypes.has("meeting")) {
      fetches.push(
        API.get(`/meetings?start=${start}&end=${end}`)
          .then(({ data }) => (data.meetings || []).map((m) => ({
            id: `meeting-${m._id}`, type: "meeting",
            label: m.title,
            date: new Date(m.startTime),
            sub: m.location || "",
          })))
          .catch(() => [])
      );
    }

    if (activeTypes.has("task")) {
      fetches.push(
        API.get("/tasks")
          .then(({ data }) => (data.tasks || data || [])
            .filter((t) => t.dueDate)
            .map((t) => ({
              id: `task-${t._id}`, type: "task",
              label: t.title,
              date: new Date(t.dueDate),
              sub: t.assignedTo?.name || "",
            }))
          )
          .catch(() => [])
      );
    }

    if (activeTypes.has("project")) {
      fetches.push(
        API.get("/projects")
          .then(({ data }) => {
            const projects = data.projects || data || [];
            const evts = [];
            projects.forEach((p) => {
              if (p.deadline) evts.push({ id: `proj-${p._id}`, type: "project", label: p.name + " deadline", date: new Date(p.deadline), sub: p.status || "" });
            });
            return evts;
          })
          .catch(() => [])
      );
    }

    if (activeTypes.has("leave")) {
      fetches.push(
        API.get("/leaves")
          .then(({ data }) => (data.leaves || data || [])
            .filter((l) => l.status === "approved")
            .map((l) => ({
              id: `leave-${l._id}`, type: "leave",
              label: (l.userId?.name || "Employee") + " on leave",
              date: new Date(l.startDate),
              sub: l.leaveType || l.type || "",
            }))
          )
          .catch(() => [])
      );
    }

    Promise.all(fetches).then((results) => {
      const all = results.flat();
      // Filter to current month
      const filtered = all.filter((e) => e.date.getFullYear() === year && e.date.getMonth() === month);
      setEvents(filtered);
      setLoading(false);
    });
  }, [year, month, activeTypes]);

  // Build grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      const key = e.date.getDate();
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [events]);

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];

  const toggleType = (type) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Calendar size={20} color="#2563eb" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: "#1e293b" }}>Company Calendar</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>All meetings, tasks, projects, and leaves in one view</div>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {Object.entries(EVENT_TYPES).map(([key, meta]) => {
          const IIcon = meta.icon;
          const active = activeTypes.has(key);
          return (
            <button key={key} onClick={() => toggleType(key)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "1px solid",
                background: active ? meta.bg : "#f8fafc",
                color: active ? meta.color : "#94a3b8",
                borderColor: active ? meta.color + "66" : "#e2e8f0",
              }}>
              <IIcon size={12} /> {meta.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
        {/* Calendar grid */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8eaf0", overflow: "hidden" }}>
          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
            <button onClick={prevMonth} style={navBtn}><ChevronLeft size={16} /></button>
            <span style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} style={navBtn}><ChevronRight size={16} /></button>
          </div>

          {/* DOW headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#f8fafc" }}>
            {DOW.map((d) => (
              <div key={d} style={{ textAlign: "center", padding: "8px 0", fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.05em" }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} style={{ borderTop: "1px solid #f1f5f9", minHeight: 72 }} />;
              const isToday = isSameDay(new Date(year, month, day), today);
              const dayEvts = eventsByDay[day] || [];
              const isSelected = selectedDay === day;
              return (
                <div key={day} onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  style={{
                    borderTop: "1px solid #f1f5f9", borderLeft: idx % 7 !== 0 ? "1px solid #f1f5f9" : "none",
                    minHeight: 72, padding: "6px 8px", cursor: "pointer",
                    background: isSelected ? "#eff6ff" : isToday ? "#f0fdf4" : "transparent",
                    transition: "background .1s",
                  }}>
                  <div style={{
                    fontWeight: isToday ? 800 : 500, fontSize: 13,
                    color: isToday ? "#16a34a" : "#1e293b",
                    background: isToday ? "#dcfce7" : "transparent",
                    width: 24, height: 24, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 3,
                  }}>{day}</div>
                  {dayEvts.slice(0, 3).map((e) => {
                    const meta = EVENT_TYPES[e.type];
                    return (
                      <div key={e.id} style={{
                        background: meta.bg, color: meta.color,
                        fontSize: 10, fontWeight: 600,
                        borderRadius: 4, padding: "1px 5px",
                        marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>{e.label}</div>
                    );
                  })}
                  {dayEvts.length > 3 && (
                    <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>+{dayEvts.length - 3} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8eaf0", padding: 18, display: "flex", flexDirection: "column", gap: 12, minHeight: 300, maxHeight: 600, overflowY: "auto" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>
            {selectedDay ? `${MONTHS[month]} ${selectedDay}, ${year}` : "Select a day"}
          </div>
          {loading && <div style={{ color: "#94a3b8", fontSize: 13 }}>Loading…</div>}
          {!loading && selectedDay && selectedEvents.length === 0 && (
            <div style={{ color: "#94a3b8", fontSize: 13 }}>No events on this day.</div>
          )}
          {!selectedDay && !loading && (
            <div style={{ color: "#94a3b8", fontSize: 13 }}>Click a date to see events.</div>
          )}
          {selectedEvents.map((e) => {
            const meta = EVENT_TYPES[e.type];
            const EIcon = meta.icon;
            return (
              <div key={e.id} style={{ background: meta.bg, borderRadius: 10, padding: "10px 12px", borderLeft: `3px solid ${meta.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <EIcon size={13} color={meta.color} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{meta.label}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>{e.label}</div>
                {e.sub && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{e.sub}</div>}
              </div>
            );
          })}

          {/* Month summary */}
          <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>This Month</div>
            {Object.entries(EVENT_TYPES).map(([key, meta]) => {
              const count = events.filter((e) => e.type === key).length;
              if (!count) return null;
              const EIcon = meta.icon;
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <EIcon size={12} color={meta.color} />
                  <span style={{ fontSize: 12, color: "#475569", flex: 1 }}>{meta.label}s</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: meta.color }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const navBtn = {
  background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8,
  padding: "6px 10px", cursor: "pointer", color: "#475569",
  display: "flex", alignItems: "center",
};
