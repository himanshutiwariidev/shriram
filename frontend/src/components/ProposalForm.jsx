import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, Download, Printer, Upload } from "lucide-react";
import { createProposal, sendProposal, updateProposal } from "../services/clientApi";
import useTenantTheme from "../hooks/useTenantTheme";
import API from "../services/api";
import { FormField, baseInpNoIcon } from "../pages/sections/shared";
import ServiceSelector from "./services/ServiceSelector";
import ProposalSummary from "./services/ProposalSummary";
import ProposalTemplateControls from "./services/ProposalTemplateControls";
import ProposalPrintPreview from "./services/ProposalPrintPreview";
import { exportServicesJson, importServicesJson } from "../utils/servicesExportImport";

const toDateInput = (value) => (value ? String(value).slice(0, 10) : "");

const EMPTY_PROJECT = {
  projectName: "",
  projectAmount: "",
  currency: "INR",
  timeline: "",
  startDate: "",
  endDate: "",
  validUntil: "",
  priority: "Medium",
  proposalStatus: "draft",
  paymentTerms: "",
  notes: "",
};

// Rebuilt around the config-driven Services Builder (ServiceSelector) in
// place of the old free-text Project Description + manual Deliverables
// list. Prop contract kept identical to the previous version
// ({clientId, proposal, onSuccess, onCancel}) so both call sites
// (ClientsPage.jsx, ClientDetailPage.jsx) need zero changes.
const ProposalForm = ({ clientId, proposal, onSuccess, onCancel }) => {
  const { T } = useTenantTheme();
  const [project, setProject] = useState(EMPTY_PROJECT);
  const [services, setServices] = useState([]);
  const [legacyDeliverables, setLegacyDeliverables] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [showPrint, setShowPrint] = useState(false);
  const importInputRef = useRef(null);

  const [catalog, setCatalog] = useState([]);
  const isEditing = Boolean(proposal?._id);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3200); };

  useEffect(() => {
    API.get("/tenant/services")
      .then(({ data }) => setCatalog(Array.isArray(data.services) ? data.services : []))
      .catch(() => setCatalog([]));
  }, []);

  useEffect(() => {
    if (!proposal) {
      setProject(EMPTY_PROJECT);
      setServices([]);
      setLegacyDeliverables(null);
      return;
    }
    setProject({
      projectName: proposal.projectName || "",
      projectAmount: proposal.projectAmount ?? "",
      currency: proposal.currency || "INR",
      timeline: proposal.timeline || "",
      startDate: toDateInput(proposal.startDate),
      endDate: toDateInput(proposal.endDate),
      validUntil: toDateInput(proposal.validUntil),
      priority: proposal.priority || "Medium",
      proposalStatus: proposal.proposalStatus || "draft",
      paymentTerms: proposal.paymentTerms || "",
      notes: proposal.notes || "",
    });
    setServices(Array.isArray(proposal.services) ? proposal.services : []);
    // Legacy proposal: has old-style deliverables but no structured
    // services yet — surfaced as a read-only notice, never auto-migrated
    // (freeform deliverable titles can't be reliably reverse-mapped into
    // structured config).
    setLegacyDeliverables(
      (!proposal.services || proposal.services.length === 0) && proposal.deliverables?.length
        ? proposal.deliverables
        : null
    );
  }, [proposal]);

  const setField = (key) => (e) => setProject((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload = { clientId, ...project, services };

    try {
      if (isEditing) {
        await updateProposal(proposal._id, payload);
        showToast("Proposal updated successfully");
      } else {
        const response = await createProposal(payload);
        if (response.data.emailError) {
          showToast(`Proposal created, but failed to send email: ${response.data.emailError}`, false);
        } else {
          showToast("Proposal created and sent to client's email");
        }
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save proposal");
    } finally {
      setLoading(false);
    }
  };

  const handleSendProposal = async () => {
    if (!proposal?._id) {
      setError("Please save the proposal first");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await sendProposal(proposal._id);
      showToast("Proposal sent to client's email");
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send proposal");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    exportServicesJson({ project, services }, `${project.projectName || "proposal"}-services.json`);
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = await importServicesJson(file);
      setServices(parsed.services);
      if (parsed.project) setProject((p) => ({ ...p, ...parsed.project }));
      showToast("Services imported");
    } catch (err) {
      showToast(err.message, false);
    }
  };

  return (
    <div className="fade-up" style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>
          {isEditing ? "Edit Proposal" : "Create Project Proposal"}
        </h2>
      </div>

      {error && (
        <div style={{ background: T.redBg, border: `1.5px solid ${T.redBorder}`, color: T.red, borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ── Project Information ─────────────────────────────────────── */}
        <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 16, padding: 22, marginBottom: 20 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: T.textPrimary, marginBottom: 16 }}>Project Information</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Project Name">
              <input className="inp" style={baseInpNoIcon} type="text" value={project.projectName} onChange={setField("projectName")} required placeholder="Enter project name" />
            </FormField>
            <FormField label="Project Amount">
              <div style={{ display: "flex", gap: 8 }}>
                <input className="inp" style={{ ...baseInpNoIcon, flex: 1 }} type="number" step="0.01" min="0" value={project.projectAmount} onChange={setField("projectAmount")} required placeholder="Amount" />
                <select className="inp" style={{ ...baseInpNoIcon, width: 90, appearance: "none" }} value={project.currency} onChange={setField("currency")}>
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </FormField>
            <FormField label="Timeline">
              <input className="inp" style={baseInpNoIcon} type="text" value={project.timeline} onChange={setField("timeline")} placeholder="e.g., 2-4 weeks, 1 month" />
            </FormField>
            <FormField label="Priority">
              <select className="inp" style={{ ...baseInpNoIcon, appearance: "none" }} value={project.priority} onChange={setField("priority")}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </FormField>
            <FormField label="Start Date">
              <input className="inp" style={baseInpNoIcon} type="date" value={project.startDate} onChange={setField("startDate")} />
            </FormField>
            <FormField label="End Date">
              <input className="inp" style={baseInpNoIcon} type="date" value={project.endDate} onChange={setField("endDate")} />
            </FormField>
            <FormField label="Proposal Valid Till">
              <input className="inp" style={baseInpNoIcon} type="date" value={project.validUntil} onChange={setField("validUntil")} />
            </FormField>
            <FormField label="Status">
              <select className="inp" style={{ ...baseInpNoIcon, appearance: "none" }} value={project.proposalStatus} onChange={setField("proposalStatus")}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </select>
            </FormField>
            <FormField label="Payment Terms" span2>
              <input className="inp" style={baseInpNoIcon} type="text" value={project.paymentTerms} onChange={setField("paymentTerms")} placeholder="e.g., 50% upfront, 50% on completion" />
            </FormField>
            <FormField label="Notes" span2>
              <textarea className="inp" style={{ ...baseInpNoIcon, resize: "vertical", minHeight: 60 }} rows={2} value={project.notes} onChange={setField("notes")} placeholder="Any additional information" />
            </FormField>
          </div>
        </div>

        {/* ── Legacy deliverables notice ──────────────────────────────── */}
        {legacyDeliverables && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
            <AlertTriangle size={16} strokeWidth={2} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12.5, color: "#92400e" }}>
              <strong>This proposal was created before the Services Builder.</strong> Its existing scope of work ({legacyDeliverables.length} item{legacyDeliverables.length !== 1 ? "s" : ""}) will remain as-is unless you configure Services below and save — doing so will replace it.
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {legacyDeliverables.slice(0, 5).map((d, i) => <li key={i}>{d.title} — {d.quantity}/{d.frequency}</li>)}
                {legacyDeliverables.length > 5 && <li>…and {legacyDeliverables.length - 5} more</li>}
              </ul>
            </div>
          </div>
        )}

        {/* ── Services Builder ────────────────────────────────────────── */}
        <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 16, padding: 22, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: T.textPrimary }}>Services</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <ProposalTemplateControls services={services} onLoadTemplate={setServices} showToast={showToast} />
              <button type="button" onClick={handleExport} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: "#fff", color: T.textSecondary, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                <Download size={14} strokeWidth={2} /> Export
              </button>
              <button type="button" onClick={() => importInputRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: "#fff", color: T.textSecondary, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                <Upload size={14} strokeWidth={2} /> Import
              </button>
              <input ref={importInputRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleImportFile} />
              <button type="button" onClick={() => setShowPrint(true)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: "#fff", color: T.textSecondary, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                <Printer size={14} strokeWidth={2} /> Preview
              </button>
            </div>
          </div>
          <ServiceSelector services={services} onChange={setServices} catalog={catalog} />
        </div>

        {/* ── Summary ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <ProposalSummary services={services} catalog={catalog} projectAmount={project.projectAmount} currency={project.currency} />
        </div>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="submit" disabled={loading} style={{ background: `linear-gradient(135deg, ${T.brand}, ${T.brandMid})`, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 13.5, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer", opacity: loading ? .8 : 1 }}>
            {loading ? "Saving…" : isEditing ? "Update Proposal" : "Create Proposal"}
          </button>

          {isEditing && proposal?.proposalStatus === "draft" && (
            <button type="button" onClick={handleSendProposal} disabled={loading} style={{ background: T.green, color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 13.5, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: "pointer", opacity: loading ? .8 : 1 }}>
              {loading ? "Sending…" : "Save & Send to Client"}
            </button>
          )}

          <button type="button" onClick={onCancel} style={{ background: "none", border: `1.5px solid ${T.inputBorder}`, color: T.textSecondary, borderRadius: 10, padding: "12px 24px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </form>

      {showPrint && (
        <ProposalPrintPreview project={project} services={services} catalog={catalog} onClose={() => setShowPrint(false)} />
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 26, right: 26, zIndex: 9999, background: "#fff", border: `1.5px solid ${toast.ok ? T.greenBorder : T.redBorder}`, borderRadius: 13, padding: "14px 18px", fontWeight: 500, fontSize: 13.5, boxShadow: "0 8px 32px rgba(0,0,0,.12)", maxWidth: 340 }}>
          <span style={{ color: T.textPrimary }}>{toast.msg}</span>
        </div>
      )}
    </div>
  );
};

export default ProposalForm;
