import React, { useState } from "react";
import { addDeliverable, updateDeliverable } from "../services/clientApi";
import "./DeliverablesTracker.css";

const STATUS_COLORS = {
  Pending: "#94a3b8",
  "In Progress": "#f59e0b",
  Completed: "#22c55e",
};

const FREQUENCY_LABELS = {
  "one-time": "One-time",
  week: "Per Week",
  month: "Per Month",
};

const DeliverablesTracker = ({ proposal, onUpdated }) => {
  const [editValues, setEditValues] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [newDeliverable, setNewDeliverable] = useState({ title: "", quantity: "", frequency: "one-time" });
  const [addingDeliverable, setAddingDeliverable] = useState(false);

  const deliverables = proposal?.deliverables || [];

  const handleEditChange = (id, value) => {
    setEditValues((prev) => ({ ...prev, [id]: value }));
  };

  const saveDelivered = async (deliverableId, delivered) => {
    setSavingId(deliverableId);
    try {
      const response = await updateDeliverable(proposal._id, deliverableId, { delivered });
      onUpdated(response.data.proposal);
      setEditValues((prev) => ({ ...prev, [deliverableId]: "" }));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update deliverable");
    } finally {
      setSavingId(null);
    }
  };

  const handleManualUpdate = (deliverable) => {
    const newValue = editValues[deliverable._id];
    if (newValue === undefined || newValue === "") return;
    saveDelivered(deliverable._id, Number(newValue));
  };

  const handleMarkPeriodDelivered = (deliverable) => {
    saveDelivered(deliverable._id, (deliverable.delivered || 0) + (deliverable.quantity || 0));
  };

  const handleMarkComplete = (deliverable) => {
    const isRecurring = deliverable.frequency === "week" || deliverable.frequency === "month";
    saveDelivered(deliverable._id, isRecurring ? deliverable.due : deliverable.quantity);
  };

  const handleAddDeliverable = async (e) => {
    e.preventDefault();
    if (!newDeliverable.title.trim() || !newDeliverable.quantity) return;

    setAddingDeliverable(true);
    try {
      const response = await addDeliverable(proposal._id, {
        title: newDeliverable.title.trim(),
        quantity: Number(newDeliverable.quantity),
        frequency: newDeliverable.frequency,
      });
      onUpdated(response.data.proposal);
      setNewDeliverable({ title: "", quantity: "", frequency: "one-time" });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add deliverable");
    } finally {
      setAddingDeliverable(false);
    }
  };

  const addDeliverableForm = (
    <form className="add-deliverable-form" onSubmit={handleAddDeliverable}>
      <input
        type="text"
        placeholder="Deliverable name (e.g., Instagram Posts)"
        value={newDeliverable.title}
        onChange={(e) => setNewDeliverable((prev) => ({ ...prev, title: e.target.value }))}
      />
      <input
        type="number"
        min="1"
        placeholder="Quantity"
        value={newDeliverable.quantity}
        onChange={(e) => setNewDeliverable((prev) => ({ ...prev, quantity: e.target.value }))}
      />
      <select
        value={newDeliverable.frequency}
        onChange={(e) => setNewDeliverable((prev) => ({ ...prev, frequency: e.target.value }))}
      >
        <option value="one-time">One-time</option>
        <option value="week">Per Week</option>
        <option value="month">Per Month</option>
      </select>
      <button type="submit" disabled={addingDeliverable}>
        {addingDeliverable ? "Adding..." : "+ Add Deliverable"}
      </button>
    </form>
  );

  if (!deliverables.length) {
    return (
      <div className="deliverables-tracker">
        <div className="empty-state">No deliverables added for this proposal yet.</div>
        {addDeliverableForm}
      </div>
    );
  }

  return (
    <div className="deliverables-tracker">
      {deliverables.map((item) => {
        const isRecurring = item.frequency === "week" || item.frequency === "month";
        const due = item.due ?? item.quantity;
        const delivered = item.delivered || 0;
        const pending = item.pending ?? Math.max(0, due - delivered);
        const status = item.status || "Pending";
        const progress = due > 0 ? Math.min(100, Math.round((delivered / due) * 100)) : 0;

        return (
          <div className="deliverable-row" key={item._id}>
            <div className="deliverable-header">
              <span className="deliverable-title">
                {item.title}
                {isRecurring && (
                  <span className="frequency-badge">
                    {item.quantity}/{item.frequency === "week" ? "week" : "month"}
                  </span>
                )}
              </span>
              <span className="deliverable-status" style={{ color: STATUS_COLORS[status], borderColor: STATUS_COLORS[status] }}>
                {status}
              </span>
            </div>

            <div className="deliverable-progress-bar">
              <div className="deliverable-progress-fill" style={{ width: `${progress}%`, background: STATUS_COLORS[status] }} />
            </div>

            <div className="deliverable-stats-grid">
              <div className="deliverable-stat">
                <span className="stat-label">{isRecurring ? `Due (period ${item.periodsElapsed})` : "Total"}</span>
                <span className="stat-value">{due}</span>
              </div>
              <div className="deliverable-stat">
                <span className="stat-label">Completed</span>
                <span className="stat-value" style={{ color: "#22c55e" }}>{delivered}</span>
              </div>
              <div className="deliverable-stat">
                <span className="stat-label">Pending</span>
                <span className="stat-value" style={{ color: "#f59e0b" }}>{pending}</span>
              </div>
              <div className="deliverable-stat">
                <span className="stat-label">Progress</span>
                <span className="stat-value">{progress}%</span>
              </div>
            </div>

            <div className="deliverable-actions">
              {isRecurring ? (
                <button type="button" onClick={() => handleMarkPeriodDelivered(item)} disabled={savingId === item._id}>
                  {savingId === item._id ? "Saving..." : `+ Mark This ${item.frequency === "week" ? "Week" : "Month"} Delivered`}
                </button>
              ) : (
                <button type="button" onClick={() => handleMarkComplete(item)} disabled={savingId === item._id || pending === 0}>
                  {savingId === item._id ? "Saving..." : "Mark as Complete"}
                </button>
              )}
              {isRecurring && pending > 0 && (
                <button type="button" onClick={() => handleMarkComplete(item)} disabled={savingId === item._id}>
                  Mark Fully Caught Up
                </button>
              )}
              <div className="deliverable-manual-update">
                <input
                  type="number"
                  min="0"
                  placeholder="Set exact delivered count"
                  value={editValues[item._id] ?? ""}
                  onChange={(e) => handleEditChange(item._id, e.target.value)}
                />
                <button type="button" onClick={() => handleManualUpdate(item)} disabled={savingId === item._id}>
                  Update
                </button>
              </div>
            </div>
          </div>
        );
      })}
      {addDeliverableForm}
    </div>
  );
};

export default DeliverablesTracker;
