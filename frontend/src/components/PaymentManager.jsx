import React, { useState } from "react";
import { addPayment } from "../services/clientApi";
import "./PaymentManager.css";

const PAYMENT_METHODS = ["UPI", "Bank Transfer", "Cash", "Razorpay", "Other"];

// new Date().toISOString() reports the UTC calendar date, which lags a day behind
// local time (e.g. IST) for several hours after midnight — always build the
// default date input value from local Y/M/D so "today" actually means today.
const toLocalDateInput = (d) => {
  const x = new Date(d);
  const year = x.getFullYear();
  const month = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const PaymentManager = ({ proposal, onUpdated }) => {
  const [form, setForm] = useState({
    amount: "",
    paymentDate: toLocalDateInput(new Date()),
    method: "UPI",
    notes: "",
    nextDueDate: proposal?.nextDueDate ? proposal.nextDueDate.slice(0, 10) : "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = { ...form };
      if (!payload.nextDueDate) delete payload.nextDueDate;
      const response = await addPayment(proposal._id, payload);
      onUpdated(response.data.proposal);
      setForm((prev) => ({ ...prev, amount: "", notes: "" }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add payment");
    } finally {
      setLoading(false);
    }
  };

  const projectAmount = proposal?.projectAmount || 0;
  const receivedAmount = proposal?.receivedAmount || 0;
  const dueAmount = proposal?.dueAmount ?? projectAmount;
  const isOverdue = Boolean(
    proposal?.nextDueDate && dueAmount > 0 && new Date(proposal.nextDueDate) < new Date()
  );

  return (
    <div className="payment-manager">
      <div className="payment-summary-card">
        <div className="summary-item">
          <span className="summary-label">Total Payment</span>
          <span className="summary-value">₹{projectAmount.toLocaleString("en-IN")}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Received Payment</span>
          <span className="summary-value" style={{ color: "#22c55e" }}>₹{receivedAmount.toLocaleString("en-IN")}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Due Payment</span>
          <span className="summary-value" style={{ color: "#f59e0b" }}>₹{dueAmount.toLocaleString("en-IN")}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Due Date</span>
          <span className="summary-value">
            {proposal?.nextDueDate ? new Date(proposal.nextDueDate).toLocaleDateString("en-IN") : "N/A"}
          </span>
        </div>
        {isOverdue && <span className="overdue-badge">Payment Overdue</span>}
      </div>

      <form className="add-payment-form" onSubmit={handleSubmit}>
        <h4>Update Received Payment</h4>
        {error && <div className="error-message">{error}</div>}
        <div className="form-row">
          <div className="form-field">
            <label>Amount Received</label>
            <input
              type="number"
              name="amount"
              placeholder="e.g. 10000"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-field">
            <label>Payment Date</label>
            <input
              type="date"
              name="paymentDate"
              value={form.paymentDate}
              onChange={handleChange}
            />
          </div>
          <div className="form-field">
            <label>Payment Type</label>
            <select name="method" value={form.method} onChange={handleChange}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-field" style={{ flex: 2 }}>
            <label>Notes (optional)</label>
            <input
              type="text"
              name="notes"
              placeholder="e.g. Advance payment"
              value={form.notes}
              onChange={handleChange}
            />
          </div>
          <div className="form-field">
            <label>Next Due Date (optional)</label>
            <input
              type="date"
              name="nextDueDate"
              value={form.nextDueDate}
              onChange={handleChange}
            />
          </div>
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Add Payment"}
        </button>
        <p className="form-hint">Due payment is calculated automatically as Total Payment − Received Payment.</p>
      </form>

      <div className="payment-history">
        <h4>Payment History</h4>
        {!proposal?.payments?.length ? (
          <div className="empty-state">No payments recorded yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {proposal.payments.map((payment) => (
                <tr key={payment._id}>
                  <td>{new Date(payment.paymentDate).toLocaleDateString("en-IN")}</td>
                  <td>₹{Number(payment.amount).toLocaleString("en-IN")}</td>
                  <td>{payment.method}</td>
                  <td>{payment.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PaymentManager;
