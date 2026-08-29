import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Pencil, Trash2, Mail, Download, FileText, Wallet, Package,
  CreditCard, History, Plus, X, Building2, User, CheckCircle2,
  Activity, Inbox, IndianRupee,
  UserPlus, Send, RefreshCw, Edit3, ShieldCheck, FilePlus,
  MessageSquare, TrendingUp, UserCog, Paperclip, UploadCloud, File, Image, FileSpreadsheet,
} from "lucide-react";
import {
  getClientById, updateClient, deleteClient, getClientActivity,
  sendProposal, downloadInvoice, deleteProposal, deletePaymentReminder,
  getUsersByRole, assignUserToClient, getClientRemarks, addClientRemark,
  getWorkProgress, addWorkProgress, updateWorkProgress,
  uploadPiAttachment, deletePiAttachment,
} from "../services/clientApi";
import ClientForm from "../components/ClientForm";
import ProposalForm from "../components/ProposalForm";
import PaymentReminderForm from "../components/PaymentReminderForm";
import ProposalDetail from "./ProposalDetail";
import SearchableSelect from "../components/SearchableSelect";
import "./ClientDetailPage.css";
import { useAuth } from "../context/AuthContext";
import useTenantTheme from "../hooks/useTenantTheme";

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const fmtDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const fmtINR = (value) => `₹${(value || 0).toLocaleString("en-IN")}`;

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "converted", label: "Converted" },
  { value: "cold", label: "Cold" },
  { value: "ni", label: "Not Interested" },
];

// Anything saved on a client that's NOT in this set automatically surfaces under
// "Custom Information" below — so newly added onboarding fields show up with no code changes.
const KNOWN_CLIENT_FIELDS = new Set([
  "_id", "__v", "clientName", "email", "phone", "companyName", "gstNo", "tanNo",
  "salesPerson", "leadSource", "clientType", "projectType", "projectName",
  "address", "city", "state", "country", "zipCode", "contactPerson", "designation",
  "status", "activeStatus", "totalProjects", "totalAmount", "notes", "onboardedAt",
  "createdAt", "updatedAt", "hasLoginAccess",
  "assignedUser", "assignedBy", "assignedDate", "remarks", "workProgress", "piAttachments",
]);

const TABS = [
  { id: "overview", label: "Overview", Icon: User },
  { id: "proposals", label: "Proposals", Icon: FileText },
  { id: "reminders", label: "Payment Reminders", Icon: Wallet },
  { id: "deliverables", label: "Deliverables", Icon: Package },
  { id: "payments", label: "Payments", Icon: CreditCard },
  { id: "remarks", label: "Remarks", Icon: MessageSquare },
  { id: "progress", label: "Work Progress", Icon: TrendingUp },
  { id: "activity", label: "Activity Timeline", Icon: History },
];

const WORK_PROGRESS_STATUS_META = {
  "Pending": { color: "#94a3b8", bg: "#f1f5f9" },
  "In Progress": { color: "#2563eb", bg: "#eff6ff" },
  "On Hold": { color: "#d97706", bg: "#fffbeb" },
  "Waiting for Client": { color: "#7c3aed", bg: "#f5f3ff" },
  "Completed": { color: "#16a34a", bg: "#f0fdf4" },
};

const ACTIVITY_META = {
  client_created: { Icon: UserPlus, color: "#16a34a" },
  client_updated: { Icon: Edit3, color: "#2563eb" },
  status_changed: { Icon: RefreshCw, color: "var(--tenant-brand)" },
  proposal_created: { Icon: FileText, color: "#2563eb" },
  proposal_sent: { Icon: Send, color: "#16a34a" },
  deliverable_added: { Icon: Package, color: "var(--tenant-brand)" },
  deliverable_updated: { Icon: Package, color: "#2563eb" },
  payment_added: { Icon: IndianRupee, color: "#16a34a" },
  reminder_created: { Icon: Wallet, color: "var(--tenant-brand)" },
  reminder_sent: { Icon: Send, color: "#16a34a" },
  portal_enabled: { Icon: ShieldCheck, color: "#7c3aed" },
  invoice_generated: { Icon: FilePlus, color: "#2563eb" },
};

function Skeleton({ height = 16, width = "100%", radius = 8, style = {} }) {
  return (
    <div
      style={{
        height, width, borderRadius: radius,
        background: "linear-gradient(90deg,#eef0f4 25%,#f6f7fa 37%,#eef0f4 63%)",
        backgroundSize: "400% 100%", animation: "shimmer 1.4s ease infinite", ...style,
      }}
    />
  );
}

function EmptyState({ message }) {
  return (
    <div className="cd-empty">
      <Inbox size={28} strokeWidth={1.6} />
      {message}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="detail-section">
      <h3>{title}</h3>
      <div className="detail-grid">{children}</div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="detail-field">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value || value === 0 ? value : "—"}</span>
    </div>
  );
}

export default function ClientDetailPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [activity, setActivity] = useState([]);
  const [remarks, setRemarks] = useState([]);
  const [workProgress, setWorkProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [statusSaving, setStatusSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState(null);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [manageProposalId, setManageProposalId] = useState(null);
  const [manageProposalTab, setManageProposalTab] = useState(null);

  const [assignableUsers, setAssignableUsers] = useState([]);
  const [assigningOpen, setAssigningOpen] = useState(false);
  const [assigningUserId, setAssigningUserId] = useState("");
  const [assignSaving, setAssignSaving] = useState(false);

  const [remarkText, setRemarkText] = useState("");
  const [remarkSaving, setRemarkSaving] = useState(false);

  const [progressForm, setProgressForm] = useState(null); // null | { editingId, title, description, status, percentage }
  const [progressSaving, setProgressSaving] = useState(false);

  const [piUploading, setPiUploading] = useState(false);
  const [piError, setPiError] = useState("");

  const { role: userRole, user } = useAuth();
  const userId = user?.id;
  const isAdmin = userRole === "admin";

  useTenantTheme();

  const loadAll = async () => {
    setLoading(true);
    try {
      const [clientRes, activityRes, remarksRes, progressRes] = await Promise.all([
        getClientById(clientId),
        getClientActivity(clientId).catch(() => ({ data: { activity: [] } })),
        getClientRemarks(clientId).catch(() => ({ data: { remarks: [] } })),
        getWorkProgress(clientId).catch(() => ({ data: { workProgress: [] } })),
      ]);
      setClient(clientRes.data.client);
      setProposals(clientRes.data.proposals || []);
      setReminders(clientRes.data.reminders || []);
      setActivity(activityRes.data.activity || []);
      setRemarks(remarksRes.data.remarks || []);
      setWorkProgress(progressRes.data.workProgress || []);
    } catch (error) {
      console.error("Error loading client:", error);
      setClient(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [clientId]);

  useEffect(() => {
    if (!isAdmin) return;
    getUsersByRole("user").then((res) => setAssignableUsers(res.data || [])).catch(() => setAssignableUsers([]));
  }, [isAdmin]);

  const canManageRemarksOrProgress = isAdmin
    || (client?.salesPerson?._id && String(client.salesPerson._id) === userId)
    || (client?.assignedUser?._id && String(client.assignedUser._id) === userId);

  const canAddWorkProgress = isAdmin || (client?.assignedUser?._id && String(client.assignedUser._id) === userId);

  const handleAssignUser = async () => {
    if (!assigningUserId) return;
    setAssignSaving(true);
    try {
      await assignUserToClient(clientId, assigningUserId);
      setAssigningOpen(false);
      setAssigningUserId("");
      await loadAll();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to assign user");
    } finally {
      setAssignSaving(false);
    }
  };

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

  const latestProgressEntry = workProgress[0]; // backend returns newest-first

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

  const handlePiUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPiError("");
    setPiUploading(true);
    try {
      await uploadPiAttachment(clientId, file);
      await loadAll();
    } catch (err) {
      setPiError(err.response?.data?.message || "Upload failed");
    } finally {
      setPiUploading(false);
      e.target.value = "";
    }
  };

  const handlePiDelete = async (attachmentId, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await deletePiAttachment(clientId, attachmentId);
      await loadAll();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete attachment");
    }
  };

  const handleStatusChange = async (newStatus) => {
    setStatusSaving(true);
    try {
      await updateClient(clientId, { status: newStatus });
      await loadAll();
    } catch {
      alert("Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  };

  const handleActiveStatusToggle = async () => {
    setStatusSaving(true);
    try {
      await updateClient(clientId, { activeStatus: client.activeStatus === "active" ? "inactive" : "active" });
      await loadAll();
    } catch {
      alert("Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!window.confirm("Are you sure you want to delete this client and all related data?")) return;
    try {
      await deleteClient(clientId);
      navigate("/clients");
    } catch {
      alert("Error deleting client");
    }
  };

  const handleDeleteProposal = async (id) => {
    if (!window.confirm("Are you sure you want to delete this proposal?")) return;
    try {
      await deleteProposal(id);
      loadAll();
    } catch {
      alert("Error deleting proposal");
    }
  };

  const handleDeleteReminder = async (id) => {
    if (!window.confirm("Are you sure you want to delete this reminder?")) return;
    try {
      await deletePaymentReminder(id);
      loadAll();
    } catch {
      alert("Error deleting reminder");
    }
  };

  const latestProposal = proposals[0]; // backend sorts proposals desc by createdAt

  const handleSendEmail = async () => {
    if (!latestProposal) return;
    try {
      await sendProposal(latestProposal._id);
      alert("Email sent to client");
      loadAll();
    } catch {
      alert("Failed to send email");
    }
  };

  const handleGenerateInvoice = async () => {
    if (!latestProposal) return;
    try {
      await downloadInvoice(latestProposal._id, `invoice-${latestProposal.proposalNumber}.pdf`);
    } catch {
      alert("Failed to generate invoice");
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    loadAll();
  };

  if (loading) {
    return (
      <div className="client-detail-page">
        <style>{`@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }`}</style>
        <Skeleton height={150} radius={18} />
        <div style={{ marginTop: 18 }}><Skeleton height={40} radius={12} /></div>
        <div style={{ marginTop: 18 }}><Skeleton height={320} radius={18} /></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="client-detail-page">
        <button className="cd-back" onClick={() => navigate("/clients")}>
          <ArrowLeft size={15} strokeWidth={2.2} /> Back to Clients
        </button>
        <EmptyState message="Client not found" />
      </div>
    );
  }

  const allDeliverables = proposals.flatMap((p) =>
    (p.deliverables || []).map((d) => ({ ...d, _proposalId: p._id, _proposalName: p.projectName }))
  );
  const allPayments = proposals
    .flatMap((p) => (p.payments || []).map((pay) => ({ ...pay, _proposalId: p._id, _proposalName: p.projectName })))
    .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

  const totalProjectValue = proposals.reduce((sum, p) => sum + (p.projectAmount || 0), 0);
  const totalReceived = proposals.reduce((sum, p) => sum + (p.receivedAmount || 0), 0);
  const totalDue = proposals.reduce((sum, p) => sum + (p.dueAmount || 0), 0);
  const now = new Date();
  const overdueCount = proposals.filter((p) => p.nextDueDate && p.dueAmount > 0 && new Date(p.nextDueDate) < now).length;

  const customFields = Object.entries(client).filter(
    ([key, value]) => !KNOWN_CLIENT_FIELDS.has(key) && value !== null && value !== undefined && value !== ""
  );

  return (
    <div className="client-detail-page">
      <style>{`@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }`}</style>

      <button className="cd-back" onClick={() => navigate("/clients")}>
        <ArrowLeft size={15} strokeWidth={2.2} /> Back to Clients
      </button>

      <div className="cd-header">
        <div className="cd-header-row">
          <div className="cd-identity">
            <div className="cd-avatar">{initials(client.clientName)}</div>
            <div>
              <h1>{client.clientName}</h1>
              {client.companyName && <p className="cd-company"><Building2 size={13} strokeWidth={2} /> {client.companyName}</p>}
              <div className="cd-meta-row">
                <span>Sales Person: <strong>{client.salesPerson?.name || "Unassigned"}</strong></span>
                <span>Assigned User: <strong>{client.assignedUser?.name || "Unassigned"}</strong></span>
                <span>Created: {fmtDate(client.createdAt)}</span>
                <span>Updated: {fmtDate(client.updatedAt)}</span>
              </div>
            </div>
          </div>

          <div className="cd-status-block">
            <select
              className={`status status-select ${client.status}`}
              value={client.status}
              disabled={statusSaving}
              onChange={(e) => handleStatusChange(e.target.value)}
              title="Update lead status"
            >
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {client.status === "converted" && (
              <button
                className={`cd-active-toggle ${client.activeStatus}`}
                disabled={statusSaving}
                onClick={handleActiveStatusToggle}
                title="Toggle whether this client's work is ongoing"
              >
                <Activity size={13} strokeWidth={2.2} /> {client.activeStatus === "active" ? "Active" : "Inactive"}
              </button>
            )}
            {client.hasLoginAccess && (
              <span className="login-access-badge">
                <CheckCircle2 size={13} strokeWidth={2.4} /> Portal access enabled
              </span>
            )}
          </div>
        </div>

        <div className="cd-actions">
          <button className="cd-action-btn" onClick={() => { setFormType("client"); setShowForm(true); }}>
            <Pencil size={14} strokeWidth={2.2} /> Edit Client
          </button>
          <button className="cd-action-btn cd-action-danger" onClick={handleDeleteClient}>
            <Trash2 size={14} strokeWidth={2.2} /> Delete Client
          </button>
          <button className="cd-action-btn" disabled={!latestProposal} title={!latestProposal ? "No proposal to email yet" : "Resend the latest proposal email"} onClick={handleSendEmail}>
            <Mail size={14} strokeWidth={2.2} /> Send Email
          </button>
          <button className="cd-action-btn" disabled={!latestProposal} title={!latestProposal ? "No proposal to invoice yet" : "Download invoice PDF"} onClick={handleGenerateInvoice}>
            <Download size={14} strokeWidth={2.2} /> Generate Invoice
          </button>
          <button className="cd-action-btn cd-action-primary" onClick={() => { setSelectedProposal(null); setFormType("proposal"); setShowForm(true); }}>
            <Plus size={14} strokeWidth={2.4} /> Create Proposal
          </button>
          <button className="cd-action-btn cd-action-primary" onClick={() => { setSelectedReminder(null); setFormType("reminder"); setShowForm(true); }}>
            <Plus size={14} strokeWidth={2.4} /> Add Reminder
          </button>
          {isAdmin && (
            <button className="cd-action-btn" onClick={() => { setAssigningOpen((o) => !o); setAssigningUserId(client.assignedUser?._id || ""); }}>
              <UserCog size={14} strokeWidth={2.2} /> {client.assignedUser ? "Reassign Task" : "Assign Task"}
            </button>
          )}
        </div>

        {isAdmin && assigningOpen && (
          <div className="cd-assign-block">
            <div className="cd-assign-row">
              <SearchableSelect
                options={assignableUsers.map((u) => ({ value: u._id, label: u.name }))}
                value={assigningUserId}
                onChange={setAssigningUserId}
                placeholder="Select a user to assign"
                emptyLabel="No Users Found"
              />
              <button className="cd-action-btn cd-action-primary" disabled={!assigningUserId || assignSaving} onClick={handleAssignUser}>
                {assignSaving ? "Saving..." : "Save Assignment"}
              </button>
              <button className="cd-action-btn" onClick={() => setAssigningOpen(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="cd-tabs">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className={`cd-tab ${activeTab === id ? "active" : ""}`} onClick={() => setActiveTab(id)}>
            <Icon size={15} strokeWidth={2.2} /> {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === "overview" && (
        <div className="cd-panel">
          <Section title="Basic Information">
            <Field label="Client Name" value={client.clientName} />
            <Field label="Company Name" value={client.companyName} />
            <Field label="Contact Person" value={client.contactPerson} />
            <Field label="Designation" value={client.designation} />
            <Field label="Email" value={client.email} />
            <Field label="Phone" value={client.phone} />
          </Section>

          <Section title="Business Information">
            <Field label="GST Number" value={client.gstNo} />
            <Field label="TAN Number" value={client.tanNo} />
            <Field label="Client Type" value={client.clientType} />
          </Section>

          <Section title="Address">
            <Field label="Address" value={client.address} />
            <Field label="City" value={client.city} />
            <Field label="State" value={client.state} />
            <Field label="Country" value={client.country} />
            <Field label="Zip Code" value={client.zipCode} />
          </Section>

          <Section title="Lead Information">
            <Field label="Lead Source" value={client.leadSource} />
            <Field label="Sales Person" value={client.salesPerson?.name} />
            <Field label="Assigned User" value={client.assignedUser?.name} />
            <Field label="Status" value={client.status} />
          </Section>

          <Section title="Project Information">
            <Field label="Project Name" value={client.projectName} />
            <Field label="Project Type" value={client.projectType} />
            <Field label="Total Amount" value={fmtINR(client.totalAmount)} />
          </Section>

          <Section title="Portal Information">
            <Field label="Portal Enabled" value={client.hasLoginAccess ? "Yes" : "No"} />
            <Field label="Login Email" value={client.hasLoginAccess ? client.email : "—"} />
            <Field label="Account Created" value={fmtDate(client.onboardedAt)} />
          </Section>

          {client.notes && (
            <Section title="Notes">
              <p className="detail-notes">{client.notes}</p>
            </Section>
          )}

          {customFields.length > 0 && (
            <Section title="Custom Information">
              {customFields.map(([key, value]) => (
                <Field key={key} label={key} value={typeof value === "object" ? JSON.stringify(value) : String(value)} />
              ))}
            </Section>
          )}
        </div>
      )}

      {/* ── PROPOSALS ── */}
      {activeTab === "proposals" && (
        <div className="cd-panel">
          <div className="cd-panel-header">
            <h2>Proposals</h2>
            <button className="btn-primary" onClick={() => { setSelectedProposal(null); setFormType("proposal"); setShowForm(true); }}>
              <Plus size={14} strokeWidth={2.4} /> Create Proposal
            </button>
          </div>
          {proposals.length === 0 ? (
            <EmptyState message="No proposals yet" />
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Proposal #</th>
                    <th>Project</th>
                    <th>Amount</th>
                    <th>Created</th>
                    <th>Sent</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((proposal) => (
                    <tr key={proposal._id}>
                      <td>{proposal.proposalNumber}</td>
                      <td>{proposal.projectName}</td>
                      <td>{proposal.projectAmount} {proposal.currency}</td>
                      <td>{fmtDate(proposal.createdAt)}</td>
                      <td>{proposal.sentAt ? fmtDate(proposal.sentAt) : "—"}</td>
                      <td><span className={`status ${proposal.proposalStatus}`}>{proposal.proposalStatus}</span></td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-small" title="Manage Deliverables & Payments" onClick={() => { setManageProposalId(proposal._id); setManageProposalTab(null); }}>
                            <Package size={15} strokeWidth={2.1} />
                          </button>
                          <button className="btn-small" title="Edit" onClick={() => { setSelectedProposal(proposal); setFormType("proposal"); setShowForm(true); }}>
                            <Pencil size={15} strokeWidth={2.1} />
                          </button>
                          <button className="btn-small" title="Delete" onClick={() => handleDeleteProposal(proposal._id)}>
                            <Trash2 size={15} strokeWidth={2.1} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PAYMENT REMINDERS ── */}
      {activeTab === "reminders" && (
        <div className="cd-panel">
          <div className="cd-panel-header">
            <h2>Payment Reminders</h2>
            <button className="btn-primary" onClick={() => { setSelectedReminder(null); setFormType("reminder"); setShowForm(true); }}>
              <Plus size={14} strokeWidth={2.4} /> Add Reminder
            </button>
          </div>
          {reminders.length === 0 ? (
            <EmptyState message="No payment reminders yet" />
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reminder #</th>
                    <th>Invoice #</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Sent</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reminders.map((reminder) => (
                    <tr key={reminder._id}>
                      <td>{reminder.reminderId}</td>
                      <td>{reminder.invoiceNumber || "—"}</td>
                      <td>{reminder.amountDue} {reminder.currency}</td>
                      <td>{reminder.dueDate ? fmtDate(reminder.dueDate) : "On Demand"}</td>
                      <td><span className={`status ${reminder.reminderStatus}`}>{reminder.reminderStatus}</span></td>
                      <td>{reminder.sentAt ? fmtDate(reminder.sentAt) : "—"}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-small" title="Edit" onClick={() => { setSelectedReminder(reminder); setFormType("reminder"); setShowForm(true); }}>
                            <Pencil size={15} strokeWidth={2.1} />
                          </button>
                          <button className="btn-small" title="Delete" onClick={() => handleDeleteReminder(reminder._id)}>
                            <Trash2 size={15} strokeWidth={2.1} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── DELIVERABLES ── */}
      {activeTab === "deliverables" && (
        <div className="cd-panel">
          <div className="cd-panel-header">
            <h2>Deliverables</h2>
            <span className="cd-panel-subtitle">Across all proposals — click a row to manage it</span>
          </div>
          {allDeliverables.length === 0 ? (
            <EmptyState message="No deliverables defined yet" />
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Proposal</th>
                    <th>Quantity</th>
                    <th>Delivered</th>
                    <th>Frequency</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allDeliverables.map((d) => (
                    <tr key={d._id} className="data-row" onClick={() => { setManageProposalId(d._proposalId); setManageProposalTab("deliverables"); }} style={{ cursor: "pointer" }}>
                      <td>{d.title}</td>
                      <td>{d._proposalName}</td>
                      <td>{d.quantity}</td>
                      <td>{d.delivered || 0}</td>
                      <td>{d.frequency || "one-time"}</td>
                      <td><span className={`status ${(d.status || "pending").toLowerCase().replace(" ", "-")}`}>{d.status || "Pending"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PAYMENTS ── */}
      {activeTab === "payments" && (
        <div className="cd-panel">
          <div className="cd-panel-header">
            <h2>Payments</h2>
            <button
              className="btn-primary"
              disabled={!latestProposal}
              title={!latestProposal ? "Create a proposal first" : ""}
              onClick={() => { if (latestProposal) { setManageProposalId(latestProposal._id); setManageProposalTab("payments"); } }}
            >
              <Plus size={14} strokeWidth={2.4} /> Add Payment
            </button>
          </div>

          <div className="cd-payment-summary">
            <div className="cd-summary-card">
              <span className="detail-label">Total Project Value</span>
              <span className="cd-summary-value">{fmtINR(totalProjectValue)}</span>
            </div>
            <div className="cd-summary-card cd-summary-green">
              <span className="detail-label">Amount Received</span>
              <span className="cd-summary-value">{fmtINR(totalReceived)}</span>
            </div>
            <div className="cd-summary-card cd-summary-amber">
              <span className="detail-label">Due Amount</span>
              <span className="cd-summary-value">{fmtINR(totalDue)}</span>
            </div>
            <div className="cd-summary-card cd-summary-red">
              <span className="detail-label">Overdue</span>
              <span className="cd-summary-value">{overdueCount}</span>
            </div>
          </div>

          <h3 className="cd-subheading">Payment History</h3>
          {allPayments.length === 0 ? (
            <EmptyState message="No payments recorded yet" />
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Proposal</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {allPayments.map((p) => (
                    <tr key={p._id} className="data-row" onClick={() => { setManageProposalId(p._proposalId); setManageProposalTab("payments"); }} style={{ cursor: "pointer" }}>
                      <td>{fmtDate(p.paymentDate)}</td>
                      <td>{p._proposalName}</td>
                      <td>{fmtINR(p.amount)}</td>
                      <td>{p.method || "—"}</td>
                      <td>{p.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PI Attachments */}
          <div className="cd-pi-section">
            <div className="cd-pi-header">
              <div className="cd-pi-header-left">
                <Paperclip size={16} strokeWidth={2} color="var(--tenant-brand)" />
                <h3>PI Attachments</h3>
                <span className="cd-pi-count">{(client.piAttachments || []).length}</span>
              </div>
              {isAdmin && (
                <label className={`cd-pi-upload-btn${piUploading ? " disabled" : ""}`}>
                  <UploadCloud size={14} strokeWidth={2.2} />
                  {piUploading ? "Uploading..." : "Attach PI"}
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                    disabled={piUploading}
                    onChange={handlePiUpload}
                  />
                </label>
              )}
            </div>
            {piError && <p className="cd-pi-error">{piError}</p>}
            {(client.piAttachments || []).length === 0 ? (
              <div className="cd-pi-empty">
                <Paperclip size={22} strokeWidth={1.5} />
                <span>No PI attachments yet</span>
              </div>
            ) : (
              <div className="cd-pi-list">
                {[...(client.piAttachments || [])].reverse().map((att) => {
                  const ext = att.originalname?.split(".").pop()?.toLowerCase() || "";
                  const isImage = ["png", "jpg", "jpeg"].includes(ext);
                  const isPdf = ext === "pdf";
                  const isSheet = ["xls", "xlsx"].includes(ext);
                  const FileIcon = isImage ? Image : isSheet ? FileSpreadsheet : File;
                  const iconColor = isPdf ? "var(--tenant-brand-dark)" : isImage ? "#2563eb" : isSheet ? "#16a34a" : "#7c3aed";
                  const sizeKb = att.size ? (att.size / 1024).toFixed(1) : "—";
                  const baseUrl = import.meta.env.VITE_API_BASE_URL
                    ? import.meta.env.VITE_API_BASE_URL.replace("/api", "")
                    : "http://localhost:4050";
                  const fileUrl = `${baseUrl}/uploads/${att.filename}`;

                  return (
                    <div key={att._id} className="cd-pi-item">
                      <div className="cd-pi-icon" style={{ background: `${iconColor}18`, color: iconColor }}>
                        <FileIcon size={18} strokeWidth={1.8} />
                      </div>
                      <div className="cd-pi-info">
                        <span className="cd-pi-name" title={att.originalname}>{att.originalname}</span>
                        <span className="cd-pi-meta">
                          {sizeKb} KB · {att.uploadedBy?.name || "—"} · {fmtDate(att.uploadedAt)}
                        </span>
                      </div>
                      <div className="cd-pi-actions">
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={att.originalname}
                          className="btn-small"
                          title="Download"
                        >
                          <Download size={14} strokeWidth={2.1} />
                        </a>
                        {isAdmin && (
                          <button
                            className="btn-small btn-small-danger"
                            title="Delete attachment"
                            onClick={() => handlePiDelete(att._id, att.originalname)}
                          >
                            <Trash2 size={14} strokeWidth={2.1} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── REMARKS ── */}
      {activeTab === "remarks" && (
        <div className="cd-panel">
          <div className="cd-panel-header">
            <h2>Remarks</h2>
            <span className="cd-panel-subtitle">Visible to Admin, the Sales Person, and the Assigned User</span>
          </div>

          {canManageRemarksOrProgress && (
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
          )}

          {remarks.length === 0 ? (
            <EmptyState message="No remarks yet" />
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

      {/* ── WORK PROGRESS ── */}
      {activeTab === "progress" && (
        <div className="cd-panel">
          <div className="cd-panel-header">
            <h2>Work Progress</h2>
            <span className="cd-panel-subtitle">Newest update first — only the latest entry can be edited</span>
          </div>

          {canAddWorkProgress && !progressForm && (
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
            <EmptyState message="No work progress updates yet" />
          ) : (
            <div className="cd-timeline">
              {workProgress.map((entry) => {
                const meta = WORK_PROGRESS_STATUS_META[entry.status] || WORK_PROGRESS_STATUS_META.Pending;
                const isLatest = latestProgressEntry && entry._id === latestProgressEntry._id;
                const canEditThis = isLatest && (isAdmin || String(entry.updatedBy?._id) === userId);
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

      {/* ── ACTIVITY TIMELINE ── */}
      {activeTab === "activity" && (
        <div className="cd-panel">
          <div className="cd-panel-header">
            <h2>Activity Timeline</h2>
          </div>
          {activity.length === 0 ? (
            <EmptyState message="No activity recorded yet" />
          ) : (
            <div className="cd-timeline">
              {activity.map((entry) => {
                const meta = ACTIVITY_META[entry.type] || { Icon: Activity, color: "#94a3b8" };
                return (
                  <div key={entry._id} className="cd-timeline-row">
                    <div className="cd-timeline-icon" style={{ background: `${meta.color}1a`, color: meta.color }}>
                      <meta.Icon size={15} strokeWidth={2.2} />
                    </div>
                    <div>
                      <div className="cd-timeline-message">{entry.message}</div>
                      <div className="cd-timeline-time">{fmtDateTime(entry.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── modals ── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowForm(false)}>
              <X size={18} strokeWidth={2} />
            </button>
            {formType === "client" && (
              <ClientForm client={client} onSuccess={handleFormSuccess} onCancel={() => setShowForm(false)} />
            )}
            {formType === "proposal" && (
              <ProposalForm clientId={clientId} proposal={selectedProposal} onSuccess={handleFormSuccess} onCancel={() => setShowForm(false)} />
            )}
            {formType === "reminder" && (
              <PaymentReminderForm clientId={clientId} reminder={selectedReminder} onSuccess={handleFormSuccess} onCancel={() => setShowForm(false)} />
            )}
          </div>
        </div>
      )}

      {manageProposalId && (
        <div className="modal-overlay" onClick={() => { setManageProposalId(null); setManageProposalTab(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => { setManageProposalId(null); setManageProposalTab(null); }}>
              <X size={18} strokeWidth={2} />
            </button>
            <ProposalDetail
              proposalId={manageProposalId}
              onlyTab={manageProposalTab}
              onClose={() => { setManageProposalId(null); setManageProposalTab(null); loadAll(); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
