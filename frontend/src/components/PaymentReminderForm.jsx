import React, { useState, useEffect } from "react";
import { createPaymentReminder, sendPaymentReminder, updatePaymentReminder } from "../services/clientApi";
import "./PaymentReminderForm.css";

const PaymentReminderForm = ({ clientId, reminder, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    clientId: clientId || "",
    proposalId: "",
    invoiceNumber: "",
    amountDue: "",
    currency: "INR",
    dueDate: "",
    reminderType: "first-reminder",
    customMessage: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (reminder) {
      setFormData(reminder);
    }
  }, [reminder]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (reminder?._id) {
        await updatePaymentReminder(reminder._id, formData);
        alert("Reminder updated successfully");
      } else {
        const response = await createPaymentReminder(formData);
        if (response.data.emailError) {
          alert(`Payment reminder created successfully, but failed to send email: ${response.data.emailError}`);
        } else {
          alert("Payment reminder created and sent successfully to client");
        }
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save reminder");
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async () => {
    if (!reminder?._id) {
      setError("Please save the reminder first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await sendPaymentReminder(reminder._id);
      alert("Payment reminder sent successfully to client");
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reminder");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reminder-form-container">
      <h2>{reminder?._id ? "Edit Payment Reminder" : "Create Payment Reminder"}</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="reminder-form">
        <div className="form-row">
          <div className="form-group">
            <label>Invoice Number *</label>
            <input
              type="text"
              name="invoiceNumber"
              value={formData.invoiceNumber}
              onChange={handleChange}
              required
              placeholder="Enter invoice number"
            />
          </div>
          <div className="form-group">
            <label>Amount Due *</label>
            <div className="amount-group">
              <input
                type="number"
                name="amountDue"
                value={formData.amountDue}
                onChange={handleChange}
                required
                placeholder="Enter amount"
                step="0.01"
              />
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="currency-select"
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Due Date</label>
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Reminder Type *</label>
            <select
              name="reminderType"
              value={formData.reminderType}
              onChange={handleChange}
              required
            >
              <option value="first-reminder">First Reminder</option>
              <option value="second-reminder">Second Reminder</option>
              <option value="final-reminder">Final Reminder</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Custom Message</label>
          <textarea
            name="customMessage"
            value={formData.customMessage}
            onChange={handleChange}
            placeholder="Add a custom message to include in the reminder email"
            rows="4"
          />
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Internal notes"
            rows="3"
          />
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? "Saving..." : reminder?._id ? "Update Reminder" : "Create Reminder"}
          </button>

          {reminder?.reminderStatus === "drafted" && (
            <button
              type="button"
              onClick={handleSendReminder}
              disabled={loading}
              className="btn-send"
            >
              {loading ? "Sending..." : "Send Reminder to Client"}
            </button>
          )}

          <button type="button" onClick={onCancel} className="btn-cancel">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentReminderForm;
