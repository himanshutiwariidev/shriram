import React, { useEffect, useState } from "react";
import { getProposalById } from "../services/clientApi";
import DeliverablesTracker from "../components/DeliverablesTracker";
import PaymentManager from "../components/PaymentManager";
import "./ProposalDetail.css";

// onlyTab ("deliverables" | "payments") restricts the modal to a single tab — no
// switcher shown — for contexts that already know which one the user wants
// (e.g. clicking a row in the Deliverables-only or Payments-only list elsewhere).
// Leave it unset to show both tabs, as the general-purpose "manage this proposal" view.
const ProposalDetail = ({ proposalId, onClose, onlyTab }) => {
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(onlyTab || "deliverables");

  const loadProposal = async () => {
    setLoading(true);
    try {
      const response = await getProposalById(proposalId);
      setProposal(response.data);
    } catch (error) {
      console.error("Error loading proposal:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProposal();
  }, [proposalId]);

  if (loading) {
    return <div className="loading">Loading proposal...</div>;
  }

  if (!proposal) {
    return <div className="empty-state">Proposal not found.</div>;
  }

  return (
    <div className="proposal-detail">
      <div className="proposal-detail-header">
        <div>
          <h2>{proposal.projectName}</h2>
          <p>{proposal.clientId?.clientName} · {proposal.proposalNumber}</p>
        </div>
        <button type="button" className="btn-cancel" onClick={onClose}>Close</button>
      </div>

      {!onlyTab && (
        <div className="proposal-detail-tabs">
          <button
            type="button"
            className={`proposal-detail-tab ${activeTab === "deliverables" ? "active" : ""}`}
            onClick={() => setActiveTab("deliverables")}
          >
            📦 Deliverables
          </button>
          <button
            type="button"
            className={`proposal-detail-tab ${activeTab === "payments" ? "active" : ""}`}
            onClick={() => setActiveTab("payments")}
          >
            💳 Payments
          </button>
        </div>
      )}

      {(onlyTab || activeTab) === "deliverables" && (
        <div className="proposal-detail-section">
          <h3>Scope of Work</h3>
          <DeliverablesTracker proposal={proposal} onUpdated={setProposal} />
        </div>
      )}

      {(onlyTab || activeTab) === "payments" && (
        <div className="proposal-detail-section">
          <h3>Payments</h3>
          <PaymentManager proposal={proposal} onUpdated={setProposal} />
        </div>
      )}
    </div>
  );
};

export default ProposalDetail;
