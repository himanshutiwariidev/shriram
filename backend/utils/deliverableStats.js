const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_MS = { week: 7 * ONE_DAY_MS, month: 30 * ONE_DAY_MS };

function computeDeliverableStats(deliverable, sinceDate) {
  const quantity = deliverable.quantity || 0;
  const delivered = deliverable.delivered || 0;
  const frequency = deliverable.frequency || "one-time";

  if (frequency === "week" || frequency === "month") {
    const elapsedMs = Math.max(0, Date.now() - new Date(sinceDate).getTime());
    const periodsElapsed = Math.floor(elapsedMs / PERIOD_MS[frequency]) + 1;
    const due = quantity * periodsElapsed;
    const pending = Math.max(0, due - delivered);
    const status = delivered >= due ? "Completed" : delivered > 0 ? "In Progress" : "Pending";
    return { frequency, periodsElapsed, due, delivered, pending, status };
  }

  const due = quantity;
  const pending = Math.max(0, due - delivered);
  const status = delivered <= 0 ? "Pending" : delivered < quantity ? "In Progress" : "Completed";
  return { frequency, periodsElapsed: 1, due, delivered, pending, status };
}

function decorateProposal(proposalDoc) {
  const proposal = proposalDoc.toObject ? proposalDoc.toObject() : proposalDoc;
  const sinceDate = proposal.sentAt || proposal.createdAt || new Date();

  proposal.deliverables = (proposal.deliverables || []).map((deliverable) => ({
    ...deliverable,
    ...computeDeliverableStats(deliverable, sinceDate),
  }));

  return proposal;
}

module.exports = { computeDeliverableStats, decorateProposal };
