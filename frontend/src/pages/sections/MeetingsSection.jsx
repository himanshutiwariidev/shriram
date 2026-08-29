import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import { Plus, Trash2 } from "lucide-react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import API from "../../services/api";
import useTenantTheme from "../../hooks/useTenantTheme";
import { ConfirmModal } from "./shared";
import CreateMeetingModal from "./CreateMeetingModal";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const DnDCalendar = withDragAndDrop(Calendar);

// The shared team calendar (Month/Week/Day/Agenda, drag-and-drop reschedule)
// — any authenticated tenant staff role can view and create meetings, not
// just admins (a scheduler is inherently collaborative, unlike Task/Leave).
export default function MeetingsSection({ users = [], clients = [] }) {
  const { T } = useTenantTheme();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("month");
  const [date, setDate] = useState(new Date());
  const [modalMeeting, setModalMeeting] = useState(null); // { } for create, meeting object for edit
  const [deleteMeeting, setDeleteMeeting] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };

  const loadMeetings = useCallback(async () => {
    setLoading(true);
    try {
      // Widen the range a little past the visible view so month-view
      // overflow days from adjacent months still show their meetings.
      const rangeStart = new Date(date.getFullYear(), date.getMonth() - 1, 1);
      const rangeEnd = new Date(date.getFullYear(), date.getMonth() + 2, 0);
      const { data } = await API.get("/meetings", { params: { start: rangeStart.toISOString(), end: rangeEnd.toISOString() } });
      setMeetings(data.meetings || []);
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to load meetings", false);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { loadMeetings(); }, [loadMeetings]);

  const events = useMemo(() => meetings.map((m) => ({
    id: m._id,
    title: m.title,
    start: new Date(m.startTime),
    end: new Date(m.endTime),
    resource: m,
  })), [meetings]);

  const handleSelectSlot = ({ start, end }) => {
    setModalMeeting({ startTime: start.toISOString(), endTime: end.toISOString() });
  };

  const handleSelectEvent = (event) => {
    setModalMeeting(event.resource);
  };

  const handleEventDrop = async ({ event, start, end }) => {
    try {
      await API.put(`/meetings/${event.id}`, { startTime: start.toISOString(), endTime: end.toISOString() });
      showToast("Meeting rescheduled");
      loadMeetings();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to reschedule meeting", false);
    }
  };

  const handleSaved = () => {
    setModalMeeting(null);
    loadMeetings();
  };

  const handleDelete = async () => {
    try {
      await API.delete(`/meetings/${deleteMeeting._id}`);
      showToast("Meeting deleted");
      setDeleteMeeting(null);
      loadMeetings();
    } catch (error) {
      showToast(error?.response?.data?.message || "Failed to delete meeting", false);
    }
  };

  const eventPropGetter = () => ({
    style: { backgroundColor: T.brand, borderColor: T.brandDark, borderRadius: 6 },
  });

  return (
    <div className="fade-up">
      <style>{`
        .rbc-toolbar button { color: ${T.textSecondary}; border-color: ${T.inputBorder}; font-family: inherit; }
        .rbc-toolbar button:hover { background: ${T.brandLight}; color: ${T.brand}; }
        .rbc-toolbar button.rbc-active { background: ${T.brand}; color: #fff; border-color: ${T.brand}; }
        .rbc-toolbar-label { font-family: 'Syne', sans-serif; font-weight: 700; color: ${T.textPrimary}; }
        .rbc-today { background-color: ${T.brandLight}; }
        .rbc-off-range-bg { background: ${T.borderLight}; }
        .rbc-header, .rbc-time-header { color: ${T.textSecondary}; border-color: ${T.border}; }
        .rbc-month-view, .rbc-time-view, .rbc-agenda-view { border-color: ${T.border}; }
        .rbc-day-bg + .rbc-day-bg, .rbc-header + .rbc-header, .rbc-month-row + .rbc-month-row { border-color: ${T.borderLight}; }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>Meetings</h2>
          <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>Drag to reschedule, click a slot to create, click an event to edit</p>
        </div>
        <button
          onClick={() => setModalMeeting({})}
          className="pri-btn"
          style={{ display: "flex", alignItems: "center", gap: 8, background: `linear-gradient(135deg, ${T.brand}, ${T.brandMid})`, color: "#fff", borderRadius: 10, padding: "10px 18px", fontSize: 13.5, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}
        >
          <Plus size={15} strokeWidth={2} /> New Meeting
        </button>
      </div>

      <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 16, padding: 18, height: 680 }}>
        {loading && meetings.length === 0 ? (
          <p style={{ fontSize: 13, color: T.textMuted }}>Loading meetings…</p>
        ) : (
          <DnDCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            views={["month", "week", "day", "agenda"]}
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventDrop}
            selectable
            resizable
            eventPropGetter={eventPropGetter}
            style={{ height: "100%" }}
          />
        )}
      </div>

      {modalMeeting && (
        <CreateMeetingModal
          meeting={modalMeeting}
          users={users}
          clients={clients}
          onClose={() => setModalMeeting(null)}
          onSaved={handleSaved}
          onRequestDelete={(m) => { setModalMeeting(null); setDeleteMeeting(m); }}
          showToast={showToast}
        />
      )}

      {deleteMeeting && (
        <ConfirmModal
          title="Delete Meeting"
          message={`Delete "${deleteMeeting.title}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onClose={() => setDeleteMeeting(null)}
        />
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 26, right: 26, zIndex: 9999, background: "#fff", border: `1.5px solid ${toast.ok ? T.greenBorder : T.redBorder}`, borderRadius: 13, padding: "14px 18px", fontWeight: 500, fontSize: 13.5, display: "flex", alignItems: "center", gap: 11, boxShadow: "0 8px 32px rgba(0,0,0,.12)", maxWidth: 340 }}>
          <span style={{ flex: 1, color: T.textPrimary }}>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
