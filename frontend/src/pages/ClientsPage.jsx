import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Users, FileText, Wallet, Plus, Search,
  Package, Pencil, Trash2, X, CheckCircle2, UserCheck, BellRing,
  Inbox, Activity, XCircle, Calendar, ChevronRight,
  TrendingUp, TrendingDown, LayoutGrid, List, Download, Upload,
  BarChart3, KanbanSquare, GripVertical,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
  getAllClients,
  getAllProposals,
  deleteProposal,
  getAllReminders,
  deletePaymentReminder,
  updateClient,
} from "../services/clientApi";
import ClientForm from "../components/ClientForm";
import ProposalForm from "../components/ProposalForm";
import PaymentReminderForm from "../components/PaymentReminderForm";
import ProposalDetail from "./ProposalDetail";
import DateRangePicker, { computeRangeForPreset } from "../components/DateRangePicker";
import useTenantTheme from "../hooks/useTenantTheme";
import "./ClientsPage.css";

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const CLIENT_TYPE_OPTIONS = ["pvt ltd", "ltd", "llp", "hup", "other"];

const STATUS_DONUT_META = {
  converted: { label: "Converted", color: "#16a34a" },
  open: { label: "Open", color: "#2563eb" },
  cold: { label: "Cold", color: "#7c3aed" },
  ni: { label: "Ni", color: "#db2777" },
};

const KANBAN_COLS = [
  { key: "open",      label: "Open",           color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", countBg: "#dbeafe" },
  { key: "cold",      label: "Cold",           color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", countBg: "#ede9fe" },
  { key: "ni",        label: "Not Interested", color: "#db2777", bg: "#fdf2f8", border: "#fbcfe8", countBg: "#fce7f3" },
  { key: "converted", label: "Converted",      color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", countBg: "#dcfce7" },
];

const clientDate = (c) => new Date(c.onboardedAt || c.createdAt);

// "From last month" trend — counts clients (optionally matching a status predicate)
// onboarded in the current calendar month vs the previous one, using the same
// onboardedAt/createdAt field already used by the date-range filter on this page.
const monthOverMonthTrend = (clients, predicate = () => true) => {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonthCount = clients.filter((c) => predicate(c) && clientDate(c) >= thisMonthStart).length;
  const lastMonthCount = clients.filter((c) => predicate(c) && clientDate(c) >= lastMonthStart && clientDate(c) < thisMonthStart).length;

  if (lastMonthCount === 0) return thisMonthCount > 0 ? { percent: 100, up: true } : { percent: 0, up: true };
  const percent = Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100);
  return { percent: Math.abs(percent), up: percent >= 0 };
};

const exportClientsToCsv = (clients) => {
  const headers = ["Client Name", "Company", "Email", "Phone", "Status", "Sales Person", "Onboarded"];
  const rows = clients.map((c) => [
    c.clientName, c.companyName || "", c.email, c.phone, c.status,
    c.salesPerson?.name || "", c.onboardedAt || c.createdAt || "",
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const ClientsPage = () => {
  // Mounted purely for its CSS custom-property side effect (--tenant-brand
  // etc.) — this page's colors live in ClientsPage.css via var(), not T.
  useTenantTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("clients");
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [manageProposalId, setManageProposalId] = useState(null);

  const [clients, setClients] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [clientTypeFilter, setClientTypeFilter] = useState("all");
  const [salesPersonFilter, setSalesPersonFilter] = useState("all");
  const [dateFilterActive, setDateFilterActive] = useState(false);
  const [dateRange, setDateRange] = useState({ ...computeRangeForPreset("thisMonth"), presetKey: "thisMonth" });
  const [viewMode, setViewMode] = useState("grid");
  const [showAllSalesPersons, setShowAllSalesPersons] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  useEffect(() => {
    if (activeTab === "clients") {
      loadClients();
    } else if (activeTab === "proposals") {
      loadProposals();
    } else if (activeTab === "reminders") {
      loadReminders();
    }
  }, [activeTab]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const response = await getAllClients();
      setClients(response.data.clients || []);
    } catch (error) {
      console.error("Error loading clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProposals = async () => {
    setLoading(true);
    try {
      const response = await getAllProposals();
      setProposals(response.data.proposals || []);
    } catch (error) {
      console.error("Error loading proposals:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadReminders = async () => {
    setLoading(true);
    try {
      const response = await getAllReminders();
      setReminders(response.data.reminders || []);
    } catch (error) {
      console.error("Error loading reminders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusDrop = async (newStatus, clientId) => {
    const client = clients.find((c) => c._id === clientId);
    if (!client || client.status === newStatus) return;
    // Optimistic update so the card moves instantly
    setClients((prev) => prev.map((c) => c._id === clientId ? { ...c, status: newStatus } : c));
    try {
      await updateClient(clientId, { status: newStatus });
    } catch {
      // Revert on network failure
      setClients((prev) => prev.map((c) => c._id === clientId ? { ...c, status: client.status } : c));
    }
  };

  const handleAddClient = () => {
    setSelectedClient(null);
    setFormType("client");
    setShowForm(true);
  };


  const handleAddProposal = (clientId = null) => {
    setSelectedProposal(null);
    setSelectedClient(clientId ? { _id: clientId } : null);
    setFormType("proposal");
    setShowForm(true);
  };

  const handleEditProposal = (proposal) => {
    setSelectedProposal(proposal);
    setFormType("proposal");
    setShowForm(true);
  };

  const handleDeleteProposal = async (id) => {
    if (window.confirm("Are you sure you want to delete this proposal?")) {
      try {
        await deleteProposal(id);
        alert("Proposal deleted successfully");
        loadProposals();
      } catch (error) {
        alert("Error deleting proposal");
      }
    }
  };

  const handleAddReminder = (clientId = null) => {
    setSelectedReminder(null);
    setSelectedClient(clientId ? { _id: clientId } : null);
    setFormType("reminder");
    setShowForm(true);
  };

  const handleEditReminder = (reminder) => {
    setSelectedReminder(reminder);
    setFormType("reminder");
    setShowForm(true);
  };

  const handleDeleteReminder = async (id) => {
    if (window.confirm("Are you sure you want to delete this reminder?")) {
      try {
        await deletePaymentReminder(id);
        alert("Reminder deleted successfully");
        loadReminders();
      } catch (error) {
        alert("Error deleting reminder");
      }
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    if (formType === "client") {
      loadClients();
    } else if (formType === "proposal") {
      loadProposals();
    } else if (formType === "reminder") {
      loadReminders();
    }
  };

  const salesPersonOptions = Array.from(
    new Map(
      clients
        .map((c) => c.salesPerson)
        .filter(Boolean)
        .map((sp) => [sp._id, sp.name])
    ).entries()
  );

  const filteredClients = clients.filter((client) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = client.clientName.toLowerCase().includes(q) || client.email.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    const matchesClientType = clientTypeFilter === "all" || client.clientType === clientTypeFilter;
    const matchesSalesPerson = salesPersonFilter === "all" || client.salesPerson?._id === salesPersonFilter;
    const matchesDate = !dateFilterActive || (() => {
      const onboarded = new Date(client.onboardedAt || client.createdAt);
      return onboarded >= dateRange.start && onboarded <= dateRange.end;
    })();
    return matchesSearch && matchesStatus && matchesClientType && matchesSalesPerson && matchesDate;
  });

  const openLeadsCount = clients.filter((c) => c.status === "open").length;
  const convertedClientsCount = clients.filter((c) => c.status === "converted").length;
  const activeClientsCount = clients.filter((c) => c.status === "converted" && c.activeStatus === "active").length;
  const closedLeadsCount = clients.filter((c) =>  c.status === "ni").length;
  const coldLeadsCount = clients.filter((c)=> c.status ==="cold").length;
  const pendingRemindersCount = reminders.filter((r) => r.reminderStatus !== "paid").length;
  const portalAccessCount = clients.filter((c) => c.hasLoginAccess).length;

  const totalTrend = monthOverMonthTrend(clients);
  const openTrend = monthOverMonthTrend(clients, (c) => c.status === "open");
  const convertedTrend = monthOverMonthTrend(clients, (c) => c.status === "converted");
  const coldTrend = monthOverMonthTrend(clients, (c) => c.status === "cold");

  const statusBreakdown = Object.keys(STATUS_DONUT_META)
    .map((key) => ({
      key,
      ...STATUS_DONUT_META[key],
      count: clients.filter((c) => c.status === key).length,
    }))
    .filter((s) => s.count > 0);
  const statusBreakdownTotal = statusBreakdown.reduce((sum, s) => sum + s.count, 0);

  const salesPersonLeaderboard = Array.from(
    clients.reduce((map, c) => {
      if (!c.salesPerson) return map;
      const key = c.salesPerson._id;
      map.set(key, { name: c.salesPerson.name, count: (map.get(key)?.count || 0) + 1 });
      return map;
    }, new Map())
  )
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.count - a.count);
  const visibleSalesPersons = showAllSalesPersons ? salesPersonLeaderboard : salesPersonLeaderboard.slice(0, 3);

  const filteredProposals = proposals.filter(
    (proposal) =>
      proposal.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.clientId?.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReminders = reminders.filter(
    (reminder) =>
      reminder.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reminder.clientId?.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="clients-page">
      <div className="page-header">
        <Link to="/admin" className="back-link">
          <ArrowLeft size={15} strokeWidth={2.2} /> Back to Dashboard
        </Link>
        <h1>Clients Overview</h1>
        <p>Manage your clients, send proposals, and track payments</p>
      </div>

      <div className="overview-layout">
        <div className="overview-main">
          <div className="kpi-grid kpi-trend-grid">
            <div className="kpi-card kpi-orange">
              <div className="kpi-icon"><Users size={20} strokeWidth={2} /></div>
              <div className="kpi-value">{clients.length}</div>
              <div className="kpi-label">Total Clients</div>
              <div className={`kpi-trend ${totalTrend.up ? "trend-up" : "trend-down"}`}>
                {totalTrend.up ? <TrendingUp size={12} strokeWidth={2.4} /> : <TrendingDown size={12} strokeWidth={2.4} />}
                {totalTrend.percent}% from last month
              </div>
            </div>
            <div className="kpi-card kpi-blue">
              <div className="kpi-icon"><Inbox size={20} strokeWidth={2} /></div>
              <div className="kpi-value">{openLeadsCount}</div>
              <div className="kpi-label">Open Leads</div>
              <div className={`kpi-trend ${openTrend.up ? "trend-up" : "trend-down"}`}>
                {openTrend.up ? <TrendingUp size={12} strokeWidth={2.4} /> : <TrendingDown size={12} strokeWidth={2.4} />}
                {openTrend.percent}% from last month
              </div>
            </div>
            <div className="kpi-card kpi-green">
              <div className="kpi-icon"><UserCheck size={20} strokeWidth={2} /></div>
              <div className="kpi-value">{convertedClientsCount}</div>
              <div className="kpi-label">Converted Clients</div>
              <div className={`kpi-trend ${convertedTrend.up ? "trend-up" : "trend-down"}`}>
                {convertedTrend.up ? <TrendingUp size={12} strokeWidth={2.4} /> : <TrendingDown size={12} strokeWidth={2.4} />}
                {convertedTrend.percent}% from last month
              </div>
            </div>
            <div className="kpi-card kpi-pink">
              <div className="kpi-icon"><Activity size={20} strokeWidth={2} /></div>
              <div className="kpi-value">{coldLeadsCount}</div>
              <div className="kpi-label">Cold Clients</div>
              <div className={`kpi-trend ${coldTrend.up ? "trend-up" : "trend-down"}`}>
                {coldTrend.up ? <TrendingUp size={12} strokeWidth={2.4} /> : <TrendingDown size={12} strokeWidth={2.4} />}
                {coldTrend.percent}% from last month
              </div>
            </div>
          </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowForm(false)}>
              <X size={18} strokeWidth={2} />
            </button>
            {formType === "client" && (
              <ClientForm
                client={selectedClient}
                onSuccess={handleFormSuccess}
                onCancel={() => setShowForm(false)}
              />
            )}
            {formType === "proposal" && (
              <ProposalForm
                clientId={selectedClient?._id}
                proposal={selectedProposal}
                onSuccess={handleFormSuccess}
                onCancel={() => setShowForm(false)}
              />
            )}
            {formType === "reminder" && (
              <PaymentReminderForm
                clientId={selectedClient?._id}
                reminder={selectedReminder}
                onSuccess={handleFormSuccess}
                onCancel={() => setShowForm(false)}
              />
            )}
          </div>
        </div>
      )}

      {manageProposalId && (
        <div className="modal-overlay" onClick={() => setManageProposalId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setManageProposalId(null)}>
              <X size={18} strokeWidth={2} />
            </button>
            <ProposalDetail proposalId={manageProposalId} onClose={() => setManageProposalId(null)} />
          </div>
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab ${activeTab === "clients" ? "active" : ""}`}
          onClick={() => setActiveTab("clients")}
        >
          <Users size={15} strokeWidth={2.2} /> Clients <span className="tab-count">{clients.length}</span>
        </button>

      </div>

      <div className="tab-content">
        {/* CLIENTS TAB */}
        {activeTab === "clients" && (
          <div className="clients-section">
            <div className="section-header">
              <div className="search-box">
                <Search size={15} strokeWidth={2.2} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search clients by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="btn-primary" onClick={handleAddClient}>
                <Plus size={15} strokeWidth={2.4} /> Add New Client
              </button>
            </div>

            <div className="filter-bar">
              <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="converted">Converted</option>
                <option value="cold">Cold</option>
                <option value="ni">Not Interested</option>
              </select>
              <select className="filter-select" value={clientTypeFilter} onChange={(e) => setClientTypeFilter(e.target.value)}>
                <option value="all">All Client Types</option>
                {CLIENT_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select className="filter-select" value={salesPersonFilter} onChange={(e) => setSalesPersonFilter(e.target.value)}>
                <option value="all">All Sales Persons</option>
                {salesPersonOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
              <div className="filter-date">
                <DateRangePicker value={dateRange} onChange={(range) => { setDateRange(range); setDateFilterActive(true); }} />
                {dateFilterActive && (
                  <button className="filter-date-clear" onClick={() => setDateFilterActive(false)}>
                    <X size={12} strokeWidth={2.4} /> Clear date
                  </button>
                )}
              </div>
              <div className="view-toggle">
                <button
                  className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
                  title="Grid view"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid size={15} strokeWidth={2.2} />
                </button>
                <button
                  className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
                  title="List view"
                  onClick={() => setViewMode("list")}
                >
                  <List size={15} strokeWidth={2.2} />
                </button>
                <button
                  className={`view-toggle-btn ${viewMode === "kanban" ? "active" : ""}`}
                  title="Kanban view"
                  onClick={() => setViewMode("kanban")}
                >
                  <KanbanSquare size={15} strokeWidth={2.2} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="loading">Loading clients...</div>
            ) : filteredClients.length === 0 && viewMode !== "kanban" ? (
              <div className="empty-state">
                <p>No clients found. Start by adding a new client!</p>
              </div>
            ) : viewMode === "kanban" ? (
              /* ── KANBAN BOARD ──────────────────────────────────────── */
              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12, alignItems: "flex-start" }}>
                {KANBAN_COLS.map((col) => {
                  const colClients = filteredClients.filter((c) => c.status === col.key);
                  const isOver = dragOverCol === col.key;
                  return (
                    <div
                      key={col.key}
                      style={{ minWidth: 230, flex: "1 1 230px", display: "flex", flexDirection: "column", gap: 0 }}
                      onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key); }}
                      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverCol(null); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const id = e.dataTransfer.getData("clientId");
                        handleStatusDrop(col.key, id);
                        setDraggingId(null);
                        setDragOverCol(null);
                      }}
                    >
                      {/* Column header */}
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 12px", borderRadius: "8px 8px 0 0",
                        background: col.bg, border: `1px solid ${col.border}`, borderBottom: "none",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: col.color, letterSpacing: ".02em" }}>{col.label}</span>
                        </div>
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: col.color,
                          background: col.countBg, borderRadius: 99, padding: "1px 8px",
                          minWidth: 22, textAlign: "center",
                        }}>{colClients.length}</span>
                      </div>

                      {/* Drop zone body */}
                      <div style={{
                        flex: 1, minHeight: 480, maxHeight: 600, overflowY: "auto",
                        display: "flex", flexDirection: "column", gap: 8,
                        padding: "8px 8px 12px",
                        border: `1px solid ${isOver ? col.color : col.border}`,
                        borderTop: "none", borderRadius: "0 0 8px 8px",
                        background: isOver ? col.bg + "88" : "#f8fafc",
                        transition: "background .15s, border-color .15s",
                      }}>
                        {colClients.length === 0 && (
                          <div style={{
                            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                            justifyContent: "center", gap: 6, opacity: .45, padding: "32px 0",
                          }}>
                            <KanbanSquare size={22} strokeWidth={1.4} color={col.color} />
                            <span style={{ fontSize: 11.5, color: col.color }}>Drop here</span>
                          </div>
                        )}
                        {colClients.map((client) => (
                          <div
                            key={client._id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("clientId", client._id);
                              e.dataTransfer.effectAllowed = "move";
                              setDraggingId(client._id);
                            }}
                            onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                            style={{
                              background: "#fff", borderRadius: 8,
                              border: `1px solid ${draggingId === client._id ? col.color : "#e2e8f0"}`,
                              boxShadow: draggingId === client._id ? `0 4px 16px ${col.color}33` : "0 1px 3px rgba(0,0,0,.06)",
                              opacity: draggingId === client._id ? 0.5 : 1,
                              cursor: "grab", transition: "opacity .15s, box-shadow .15s",
                              userSelect: "none",
                            }}
                          >
                            {/* Drag handle row */}
                            <div style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              padding: "8px 10px 6px",
                              borderBottom: "1px solid #f1f5f9",
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{
                                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                  background: col.bg, display: "grid", placeItems: "center",
                                  fontSize: 11, fontWeight: 700, color: col.color,
                                }}>
                                  {initials(client.clientName)}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>
                                    {client.clientName}
                                  </div>
                                  {client.companyName && (
                                    <div style={{ fontSize: 10.5, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>
                                      {client.companyName}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <GripVertical size={13} strokeWidth={1.8} color="#cbd5e1" style={{ flexShrink: 0 }} />
                            </div>

                            {/* Card body */}
                            <div style={{ padding: "7px 10px 6px", display: "flex", flexDirection: "column", gap: 4 }}>
                              {client.phone && (
                                <div style={{ fontSize: 11, color: "#64748b" }}>{client.phone}</div>
                              )}
                              {client.salesPerson?.name && (
                                <div style={{ fontSize: 10.5, color: "#94a3b8" }}>
                                  Sales: {client.salesPerson.name}
                                </div>
                              )}
                              {client.leadSource && (
                                <span style={{
                                  fontSize: 10, fontWeight: 600, color: "#64748b",
                                  background: "#f1f5f9", border: "1px solid #e2e8f0",
                                  borderRadius: 4, padding: "1px 6px", alignSelf: "flex-start",
                                  textTransform: "capitalize",
                                }}>{client.leadSource}</span>
                              )}
                            </div>

                            {/* Footer */}
                            <div style={{
                              padding: "6px 10px 8px", borderTop: "1px solid #f1f5f9",
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                            }}>
                              <span style={{ fontSize: 10, color: "#94a3b8" }}>{fmtDate(client.updatedAt)}</span>
                              <button
                                onClick={() => navigate(`/clients/${client._id}`)}
                                style={{
                                  fontSize: 10.5, fontWeight: 600, color: col.color,
                                  background: col.bg, border: "none", cursor: "pointer",
                                  borderRadius: 4, padding: "3px 8px", display: "flex",
                                  alignItems: "center", gap: 3,
                                }}
                              >
                                Open <ChevronRight size={10} strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : viewMode === "grid" ? (
              <div className="clients-grid">
                {filteredClients.map((client) => (
                  <div key={client._id} className="client-card client-card-clickable" style={{backgroundColor:"white"}} onClick={() => navigate(`/clients/${client._id}`)}>
                    <div className="card-header">
                      <div className="client-identity">
                        <div className="client-avatar">{initials(client.clientName)}</div>
                        <div>
                          <h3>{client.clientName}</h3>
                          {client.companyName && <div className="client-company">{client.companyName}</div>}
                        </div>
                      </div>
                      <span className={`status ${client.status}`}>{client.status}</span>
                    </div>
                    <div className="card-body">
                      {client.contactPerson && (
                        <p>
                          <strong>Contact:</strong> {client.contactPerson}
                        </p>
                      )}
                      <p>
                        <strong>Email:</strong> {client.email}
                      </p>
                      <p>
                        <strong>Phone:</strong> {client.phone}
                      </p>
                      {client.hasLoginAccess && (
                        <p className="login-access-badge">
                          <CheckCircle2 size={13} strokeWidth={2.4} /> Portal access enabled
                        </p>
                      )}
                    </div>
                    <div className="card-footer card-footer-meta">
                      <span className="last-updated">Updated {fmtDate(client.updatedAt)}</span>
                      <span className="card-arrow">
                        View details <ChevronRight size={13} strokeWidth={2.4} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Contact</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Portal</th>
                      <th>Updated</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client) => (
                      <tr key={client._id} className="data-row" onClick={() => navigate(`/clients/${client._id}`)} style={{ cursor: "pointer" }}>
                        <td>
                          <div className="client-identity">
                            <div className="client-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{initials(client.clientName)}</div>
                            <div>
                              <div style={{ fontWeight: 700, color: "#0f172a" }}>{client.clientName}</div>
                              {client.companyName && <div className="client-company">{client.companyName}</div>}
                            </div>
                          </div>
                        </td>
                        <td>{client.contactPerson || "—"}</td>
                        <td>{client.email}</td>
                        <td>{client.phone}</td>
                        <td><span className={`status ${client.status}`}>{client.status}</span></td>
                        <td>{client.hasLoginAccess ? <CheckCircle2 size={15} strokeWidth={2.2} color="#16a34a" /> : "—"}</td>
                        <td>{fmtDate(client.updatedAt)}</td>
                        <td><span className="card-arrow">View details <ChevronRight size={13} strokeWidth={2.4} /></span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PROPOSALS TAB */}
        {activeTab === "proposals" && (
          <div className="proposals-section">
            <div className="section-header">
              <div className="search-box">
                <Search size={15} strokeWidth={2.2} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search proposals by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="btn-primary" onClick={() => handleAddProposal()}>
                <Plus size={15} strokeWidth={2.4} /> Create Proposal
              </button>
            </div>

            {loading ? (
              <div className="loading">Loading proposals...</div>
            ) : filteredProposals.length === 0 ? (
              <div className="empty-state">
                <p>No proposals found. Create one to get started!</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Proposal #</th>
                      <th>Project</th>
                      <th>Client</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Valid Until</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProposals.map((proposal) => (
                      <tr key={proposal._id}>
                        <td>{proposal.proposalNumber}</td>
                        <td>{proposal.projectName}</td>
                        <td>{proposal.clientId?.clientName || "N/A"}</td>
                        <td>
                          {proposal.projectAmount} {proposal.currency}
                        </td>
                        <td>
                          <span className={`status ${proposal.proposalStatus}`}>
                            {proposal.proposalStatus}
                          </span>
                        </td>
                        <td>
                          {proposal.validUntil
                            ? new Date(proposal.validUntil).toLocaleDateString("en-IN")
                            : "N/A"}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn-small"
                              onClick={() => setManageProposalId(proposal._id)}
                              title="Manage Deliverables & Payments"
                            >
                              <Package size={15} strokeWidth={2.1} />
                            </button>
                            <button
                              className="btn-small"
                              onClick={() => handleEditProposal(proposal)}
                              title="Edit"
                            >
                              <Pencil size={15} strokeWidth={2.1} />
                            </button>
                            <button
                              className="btn-small"
                              onClick={() => handleDeleteProposal(proposal._id)}
                              title="Delete"
                            >
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

        {/* REMINDERS TAB */}
        {activeTab === "reminders" && (
          <div className="reminders-section">
            <div className="section-header">
              <div className="search-box">
                <Search size={15} strokeWidth={2.2} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search reminders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="btn-primary" onClick={() => handleAddReminder()}>
                <Plus size={15} strokeWidth={2.4} /> Create Reminder
              </button>
            </div>

            {loading ? (
              <div className="loading">Loading reminders...</div>
            ) : filteredReminders.length === 0 ? (
              <div className="empty-state">
                <p>No payment reminders found. Create one to track payments!</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Reminder #</th>
                      <th>Invoice #</th>
                      <th>Client</th>
                      <th>Amount</th>
                      <th>Due Date</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReminders.map((reminder) => (
                      <tr key={reminder._id}>
                        <td>{reminder.reminderId}</td>
                        <td>{reminder.invoiceNumber}</td>
                        <td>{reminder.clientId?.clientName || "N/A"}</td>
                        <td>
                          {reminder.amountDue} {reminder.currency}
                        </td>
                        <td>
                          {reminder.dueDate
                            ? new Date(reminder.dueDate).toLocaleDateString("en-IN")
                            : "On Demand"}
                        </td>
                        <td>
                          <span className="reminder-type">
                            {reminder.reminderType.replace("-", " ")}
                          </span>
                        </td>
                        <td>
                          <span className={`status ${reminder.reminderStatus}`}>
                            {reminder.reminderStatus}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn-small"
                              onClick={() => handleEditReminder(reminder)}
                              title="Edit"
                            >
                              <Pencil size={15} strokeWidth={2.1} />
                            </button>
                            <button
                              className="btn-small"
                              onClick={() => handleDeleteReminder(reminder._id)}
                              title="Delete"
                            >
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
      </div>
        </div>

        <aside className="overview-sidebar">
          <div className="sidebar-panel">
            <h3 className="sidebar-panel-title">Clients by Status</h3>
            {statusBreakdownTotal === 0 ? (
              <div className="empty-state" style={{ padding: "28px 14px" }}>
                <p>No client data yet</p>
              </div>
            ) : (
              <div className="donut-wrap">
                <div className="donut-chart">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={2}
                        startAngle={90}
                        endAngle={-270}
                      >
                        {statusBreakdown.map((s) => <Cell key={s.key} fill={s.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center">
                    <span className="donut-center-value">{statusBreakdownTotal}</span>
                    <span className="donut-center-label">Total</span>
                  </div>
                </div>
                <div className="donut-legend">
                  {statusBreakdown.map((s) => (
                    <div key={s.key} className="donut-legend-row">
                      <span className="donut-legend-dot" style={{ background: s.color }} />
                      <span className="donut-legend-label">{s.label}</span>
                      <span className="donut-legend-count">
                        {s.count} ({Math.round((s.count / statusBreakdownTotal) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="sidebar-panel">
            <h3 className="sidebar-panel-title">Quick Actions</h3>
            <div className="quick-actions-list">
              <button className="quick-action-btn" onClick={handleAddClient}>
                <span className="quick-action-icon quick-action-orange"><Users size={16} strokeWidth={2.1} /></span>
                Add New Client
              </button>
              <button className="quick-action-btn" onClick={() => alert("Import Clients is coming soon")}>
                <span className="quick-action-icon quick-action-green"><Upload size={16} strokeWidth={2.1} /></span>
                Import Clients
              </button>
              <button className="quick-action-btn" onClick={() => exportClientsToCsv(clients)}>
                <span className="quick-action-icon quick-action-green"><Download size={16} strokeWidth={2.1} /></span>
                Export Clients
              </button>
              <button className="quick-action-btn" onClick={() => alert("Client Reports is coming soon")}>
                <span className="quick-action-icon quick-action-blue"><BarChart3 size={16} strokeWidth={2.1} /></span>
                Client Reports
              </button>
            </div>
          </div>

          <div className="sidebar-panel">
            <h3 className="sidebar-panel-title">Top Sales Persons</h3>
            {salesPersonLeaderboard.length === 0 ? (
              <div className="empty-state" style={{ padding: "28px 14px" }}>
                <p>No sales persons assigned yet</p>
              </div>
            ) : (
              <>
                <div className="leaderboard-list">
                  {visibleSalesPersons.map((sp, i) => (
                    <div key={sp.id} className="leaderboard-row">
                      <span className="leaderboard-rank">{i + 1}</span>
                      <div>
                        <div className="leaderboard-name">{sp.name}</div>
                        <div className="leaderboard-count">{sp.count} Client{sp.count !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {salesPersonLeaderboard.length > 3 && (
                  <button className="sidebar-view-all" onClick={() => setShowAllSalesPersons((v) => !v)}>
                    {showAllSalesPersons ? "Show less" : "View All"} <ChevronRight size={13} strokeWidth={2.4} />
                  </button>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ClientsPage;
