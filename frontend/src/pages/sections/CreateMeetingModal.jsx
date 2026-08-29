import React, { useState } from "react";
import { Clock, MapPin, Save, Trash2, Users as UsersIcon } from "lucide-react";
import API from "../../services/api";
import useTenantTheme from "../../hooks/useTenantTheme";
import { Modal, FormField, FieldIcon, baseInp, baseInpNoIcon } from "./shared";

// Local ISO datetime string -> value for an <input type="datetime-local">.
const toLocalInputValue = (isoOrDate) => {
  if (!isoOrDate) return "";
  const d = new Date(isoOrDate);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
};

// Same component for create and edit — `meeting` is either a partial
// { startTime, endTime } (new, from a calendar slot click) or a full
// existing meeting document (edit, from clicking an event).
export default function CreateMeetingModal({ meeting, users, clients, onClose, onSaved, onRequestDelete, showToast }) {
  const { T } = useTenantTheme();
  const isEditing = Boolean(meeting._id);
  const [form, setForm] = useState({
    title: meeting.title || "",
    description: meeting.description || "",
    startTime: toLocalInputValue(meeting.startTime),
    endTime: toLocalInputValue(meeting.endTime),
    location: meeting.location || "",
    participants: (meeting.participants || []).map((p) => (typeof p === "string" ? p : p._id)),
    clientId: meeting.clientId ? (typeof meeting.clientId === "string" ? meeting.clientId : meeting.clientId._id) : "",
  });
  const [saving, setSaving] = useState(false);

  const toggleParticipant = (userId) => {
    setForm((prev) => ({
      ...prev,
      participants: prev.participants.includes(userId)
        ? prev.participants.filter((id) => id !== userId)
        : [...prev.participants, userId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.startTime || !form.endTime) {
      showToast?.("Title, start time, and end time are required", false);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        location: form.location,
        participants: form.participants,
        clientId: form.clientId || undefined,
      };
      if (isEditing) {
        await API.put(`/meetings/${meeting._id}`, payload);
        showToast?.("Meeting updated");
      } else {
        await API.post("/meetings", payload);
        showToast?.("Meeting created");
      }
      onSaved();
    } catch (error) {
      showToast?.(error?.response?.data?.message || "Failed to save meeting", false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEditing ? "Edit Meeting" : "New Meeting"} onClose={onClose} width={560}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FormField label="Title" span2>
            <input className="inp" style={baseInpNoIcon} type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </FormField>
          <FormField label="Start">
            <div style={{ position: "relative" }}><FieldIcon icon={Clock} /><input className="inp" style={baseInp} type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required /></div>
          </FormField>
          <FormField label="End">
            <div style={{ position: "relative" }}><FieldIcon icon={Clock} /><input className="inp" style={baseInp} type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required /></div>
          </FormField>
          <FormField label="Location" span2>
            <div style={{ position: "relative" }}><FieldIcon icon={MapPin} /><input className="inp" style={baseInp} type="text" placeholder="Office, Zoom link, etc." value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          </FormField>
          <FormField label="Description" span2>
            <textarea className="inp" style={{ ...baseInpNoIcon, resize: "vertical" }} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>
          {clients && clients.length > 0 && (
            <FormField label="Client (optional)" span2>
              <select className="inp" style={{ ...baseInpNoIcon, appearance: "none" }} value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
                <option value="">No client</option>
                {clients.map((c) => <option key={c._id} value={c._id}>{c.clientName || c.companyName}</option>)}
              </select>
            </FormField>
          )}
          <FormField label="Participants" span2>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 11.5, color: T.textMuted }}>
              <UsersIcon size={13} strokeWidth={1.8} /> Select who should attend
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 140, overflowY: "auto" }}>
              {(users || []).map((u) => {
                const active = form.participants.includes(u._id);
                return (
                  <button
                    type="button"
                    key={u._id}
                    onClick={() => toggleParticipant(u._id)}
                    style={{
                      padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      border: `1.5px solid ${active ? T.brand : T.inputBorder}`,
                      background: active ? T.brandLight : "#fff",
                      color: active ? T.brand : T.textSecondary,
                    }}
                  >
                    {u.name}
                  </button>
                );
              })}
            </div>
          </FormField>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
          {isEditing ? (
            <button type="button" onClick={() => onRequestDelete(meeting)} style={{ display: "flex", alignItems: "center", gap: 6, background: T.redBg, color: T.red, border: `1.5px solid ${T.redBorder}`, borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <Trash2 size={14} strokeWidth={2} /> Delete
            </button>
          ) : <div />}
          <button className="pri-btn" type="submit" disabled={saving} style={{ display: "flex", alignItems: "center", gap: 8, background: `linear-gradient(135deg, ${T.brand}, ${T.brandMid})`, color: "#fff", borderRadius: 10, padding: "11px 22px", fontSize: 13.5, fontWeight: 700, fontFamily: "'Syne', sans-serif", opacity: saving ? 0.8 : 1 }}>
            <Save size={15} strokeWidth={2} /> {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Meeting"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
