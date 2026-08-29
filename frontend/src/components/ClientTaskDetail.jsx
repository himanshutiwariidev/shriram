import React, { useEffect, useState } from "react";
import { Package, MessageSquare, TrendingUp, X, Plus, Pencil } from "lucide-react";
import {
  getClientById, getClientRemarks, addClientRemark,
  getWorkProgress, addWorkProgress, updateWorkProgress,
} from "../services/clientApi";
import "../pages/ClientDetailPage.css";
import { useAuth } from "../context/AuthContext";

const WORK_PROGRESS_STATUS_META = {
  "Pending": { color: "#94a3b8", bg: "#f1f5f9" },
  "In Progress": { color: "#2563eb", bg: "#eff6ff" },
  "On Hold": { color: "#d97706", bg: "#fffbeb" },
  "Waiting for Client": { color: "#7c3aed", bg: "#f5f3ff" },
  "Completed": { color: "#16a34a", bg: "#f0fdf4" },
};

const fmtDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// A scoped-down view of a client's work, shown to the assigned non-sales User from
// "My Tasks" — read-only Scope of Work/Deliverables, plus Remarks and Work Progress.
// Deliberately does NOT expose proposals/payments/reminders/edit-client (that's the
// full /clients/:clientId workspace, which this role does not need).
export default function ClientTaskDetail({ clientId, onClose }) {
  const [client, setClient] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [remarks, setRemarks] = useState([]);
  const [workProgress, setWorkProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("scope");

  const [remarkText, setRemarkText] = useState("");
  const [remarkSaving, setRemarkSaving] = useState(false);

  const [progressForm, setProgressForm] = useState(null);
  const [progressSaving, setProgressSaving] = useState(false);

  const { user } = useAuth();
  const userId = user?.id;

  const loadAll = async () => {
    setLoading(true);
    try {
      const [clientRes, remarksRes, progressRes] = await Promise.all([
        getClientById(clientId),
        getClientRemarks(clientId).catch(() => ({ data: { remarks: [] } })),
        getWorkProgress(clientId).catch(() => ({ data: { workProgress: [] } })),
      ]);
      setClient(clientRes.data.client);
      setProposals(clientRes.data.proposals || []);
      setRemarks(remarksRes.data.remarks || []);
      setWorkProgress(progressRes.data.workProgress || []);
    } catch (error) {
      console.error("Error loading assigned client:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [clientId]);

  const handleAddRemark = async () => {
    if (!remarkText.trim()) return;
    setRemarkSaving(true);
    try {
      await addClientRemark(clientId, remarkText.trim());
      setRemarkText("");
      await loadAll();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add remark");
    } finally {
      setRemarkSaving(false);
    }
  };

  const latestProgressEntry = workProgress[0];

  const handleSaveProgress = async () => {
    if (!progressForm?.title?.trim()) return;
    setProgressSaving(true);
    try {
      const payload = {
        title: progressForm.title.trim(),
        description: progressForm.description,
        status: progressForm.status,
        percentage: Number(progressForm.percentage) || 0,
      };
      if (progressForm.editingId) {
        await updateWorkProgress(clientId, progressForm.editingId, payload);
      } else {
        await addWorkProgress(clientId, payload);
      }
      setProgressForm(null);
      await loadAll();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save work progress update");
    } finally {
      setProgressSaving(false);
    }
  };

  if (loading) {
    return <div className="cd-panel" style={{ minHeight: 200 }}>Loading...</div>;
  }

  if (!client) {
    return <div className="cd-panel">Client not found or access denied.</div>;
  }

  return (
    <div>
      <div className="cd-panel-header" style={{ marginBottom: 6 }}>
        <div>
          <h2>{client.clientName}</h2>
          {client.companyName && <span className="cd-panel-subtitle">{client.companyName}</span>}
        </div>
        <button className="close-btn" onClick={onClose}><X size={18} strokeWidth={2} /></button>
      </div>

      <div className="cd-tabs">
        <button className={`cd-tab ${activeTab === "scope" ? "active" : ""}`} onClick={() => setActiveTab("scope")}>
          <Package size={15} strokeWidth={2.2} /> Project Details
        </button>
        <button className={`cd-tab ${activeTab === "remarks" ? "active" : ""}`} onClick={() => setActiveTab("remarks")}>
          <MessageSquare size={15} strokeWidth={2.2} /> Remarks
        </button>
        <button className={`cd-tab ${activeTab === "progress" ? "active" : ""}`} onClick={() => setActiveTab("progress")}>
          <TrendingUp size={15} strokeWidth={2.2} /> Work Progress
        </button>
      </div>

      {activeTab === "scope" && (
        <div className="cd-panel">
          {proposals.length === 0 ? (
            <div className="cd-empty">No project information available yet</div>
          ) : (
            <div className="ctd-project-list">
              {proposals.map((p) => {
                const hasDeliverables = (p.deliverables || []).length > 0;
                return (
                  <div key={p._id} className="ctd-project-block">
                    <h4 className="ctd-project-name">{p.projectName}</h4>

                    {hasDeliverables ? (
                      <>
                        <div className="ctd-section-heading">Scope of Work</div>
                        <div className="table-container">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Title</th>
                                <th>Quantity</th>
                                <th>Delivered</th>
                                <th>Frequency</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {p.deliverables.map((d) => (
                                <tr key={d._id}>
                                  <td>{d.title}</td>
                                  <td>{d.quantity}</td>
                                  <td>{d.delivered || 0}</td>
                                  <td>{d.frequency || "one-time"}</td>
                                  <td><span className={`status ${(d.status || "pending").toLowerCase().replace(" ", "-")}`}>{d.status || "Pending"}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : p.projectDescription ? (
                      <>
                        <div className="ctd-section-heading">Project Description</div>
                        <div className="ctd-description-card">
                          <p className="detail-notes">{p.projectDescription}</p>
                        </div>
                      </>
                    ) : (
                      <div className="cd-empty">No scope of work or project description available for this project</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "remarks" && (
        <div className="cd-panel">
          <div className="cd-remark-composer">
            <textarea
              rows={3}
              placeholder="Add a remark..."
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
            />
            <button className="btn-primary" disabled={!remarkText.trim() || remarkSaving} onClick={handleAddRemark}>
              {remarkSaving ? "Posting..." : "Post Remark"}
            </button>
          </div>

          {remarks.length === 0 ? (
            <div className="cd-empty">No remarks yet</div>
          ) : (
            <div className="cd-remark-feed">
              {remarks.map((r) => (
                <div key={r._id} className="cd-remark-card">
                  <div className="cd-remark-card-header">
                    <span className="cd-remark-name">{r.user?.name || "Unknown"}</span>
                    <span className="cd-remark-role">{r.role}</span>
                    <span className="cd-remark-time">{fmtDateTime(r.createdAt)}</span>
                  </div>
                  <p className="cd-remark-message">{r.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "progress" && (
        <div className="cd-panel">
          {!progressForm && (
            <button
              className="btn-primary"
              style={{ marginBottom: 18 }}
              onClick={() => setProgressForm({ editingId: null, title: "", description: "", status: "Pending", percentage: 0 })}
            >
              <Plus size={14} strokeWidth={2.4} /> Add Progress Update
            </button>
          )}

          {progressForm && (
            <div className="cd-progress-form">
              <input
                type="text"
                placeholder="Progress Title *"
                value={progressForm.title}
                onChange={(e) => setProgressForm((p) => ({ ...p, title: e.target.value }))}
              />
              <textarea
                rows={2}
                placeholder="Description"
                value={progressForm.description}
                onChange={(e) => setProgressForm((p) => ({ ...p, description: e.target.value }))}
              />
              <div className="cd-progress-form-row">
                <select
                  value={progressForm.status}
                  onChange={(e) => setProgressForm((p) => ({ ...p, status: e.target.value }))}
                >
                  {Object.keys(WORK_PROGRESS_STATUS_META).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="Completion %"
                  value={progressForm.percentage}
                  onChange={(e) => setProgressForm((p) => ({ ...p, percentage: e.target.value }))}
                />
              </div>
              <div className="cd-progress-form-actions">
                <button className="btn-primary" disabled={!progressForm.title.trim() || progressSaving} onClick={handleSaveProgress}>
                  {progressSaving ? "Saving..." : "Save Update"}
                </button>
                <button className="cd-action-btn" onClick={() => setProgressForm(null)}>Cancel</button>
              </div>
            </div>
          )}

          {workProgress.length === 0 ? (
            <div className="cd-empty">No work progress updates yet</div>
          ) : (
            <div className="cd-timeline">
              {workProgress.map((entry) => {
                const meta = WORK_PROGRESS_STATUS_META[entry.status] || WORK_PROGRESS_STATUS_META.Pending;
                const isLatest = latestProgressEntry && entry._id === latestProgressEntry._id;
                const canEditThis = isLatest && String(entry.updatedBy?._id) === userId;
                return (
                  <div key={entry._id} className="cd-progress-entry">
                    <div className="cd-progress-entry-header">
                      <span className="cd-progress-title">{entry.title}</span>
                      <span className="cd-status-pill" style={{ background: meta.bg, color: meta.color }}>{entry.status}</span>
                      {canEditThis && (
                        <button
                          className="btn-small"
                          title="Edit latest update"
                          onClick={() => setProgressForm({
                            editingId: entry._id,
                            title: entry.title,
                            description: entry.description || "",
                            status: entry.status,
                            percentage: entry.percentage,
                          })}
                        >
                          <Pencil size={14} strokeWidth={2.1} />
                        </button>
                      )}
                    </div>
                    {entry.description && <p className="cd-progress-description">{entry.description}</p>}
                    <div className="cd-progress-bar-track">
                      <div className="cd-progress-bar-fill" style={{ width: `${entry.percentage || 0}%`, background: meta.color }} />
                    </div>
                    <div className="cd-timeline-time">
                      {entry.percentage || 0}% complete · {entry.updatedBy?.name || "—"} ({entry.role}) · {fmtDateTime(entry.createdAt)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
