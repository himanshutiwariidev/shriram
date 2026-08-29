const Collection = require("../models/Collection");
const Proposal   = require("../models/Proposal");
const { withTenant, POPULATE_SKIP_TENANT } = require("../utils/tenantQuery");

exports.getAll = async (req, res) => {
  try {
    const now = new Date();
    let start = req.query.start ? new Date(req.query.start) : null;
    let end   = req.query.end   ? new Date(req.query.end)   : null;

    const dateFilter = {};
    if (start || end) {
      dateFilter.paymentDate = {};
      if (start) dateFilter.paymentDate.$gte = start;
      if (end)   dateFilter.paymentDate.$lte = end;
    }

    // ── 1. Standalone collections ────────────────────────────────────────
    const standalone = await Collection.find(withTenant(dateFilter, req))
      .sort({ paymentDate: -1 });

    const standaloneRows = standalone.map((c) => ({
      _id:         c._id,
      source:      "manual",
      title:       c.title,
      clientName:  c.clientName || "",
      amount:      c.amount,
      paymentDate: c.paymentDate,
      method:      c.method,
      reference:   c.reference || "",
      notes:       c.notes || "",
    }));

    // ── 2. Proposal payments ─────────────────────────────────────────────
    const proposals = await Proposal.find(withTenant({}, req))
      .populate({ path: "clientId", select: "clientName companyName", options: POPULATE_SKIP_TENANT });

    const proposalRows = [];
    proposals.forEach((proposal) => {
      proposal.payments.forEach((pmt) => {
        const paidOn = pmt.paymentDate ? new Date(pmt.paymentDate) : null;
        if (start && paidOn && paidOn < start) return;
        if (end   && paidOn && paidOn > end)   return;
        proposalRows.push({
          _id:         pmt._id,
          source:      "proposal",
          proposalId:  proposal._id,
          title:       proposal.projectName || `Proposal #${proposal.proposalNumber}`,
          clientName:  proposal.clientId?.clientName || proposal.clientId?.companyName || "",
          amount:      pmt.amount,
          paymentDate: pmt.paymentDate,
          method:      pmt.method,
          reference:   "",
          notes:       pmt.notes || "",
        });
      });
    });

    // ── 3. Merge, sort newest first ──────────────────────────────────────
    const all = [...standaloneRows, ...proposalRows].sort(
      (a, b) => new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0)
    );

    const total = all.reduce((s, c) => s + (c.amount || 0), 0);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = all
      .filter((c) => c.paymentDate && new Date(c.paymentDate) >= thisMonthStart)
      .reduce((s, c) => s + (c.amount || 0), 0);

    return res.json({ collections: all, total, thisMonth, count: all.length });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to fetch collections" });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, clientName, amount, paymentDate, method, reference, notes } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });
    if (!amount || Number(amount) <= 0) return res.status(400).json({ message: "Valid amount is required" });

    const collection = await Collection.create({
      tenantId:    req.tenantId,
      title,
      clientName:  clientName || "",
      amount:      Number(amount),
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      method:      method || "Other",
      reference:   reference || "",
      notes:       notes || "",
      recordedBy:  req.user?.id,
    });

    return res.status(201).json({ message: "Collection recorded", collection });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to record collection" });
  }
};

exports.update = async (req, res) => {
  try {
    const collection = await Collection.findOneAndUpdate(
      withTenant({ _id: req.params.id }, req),
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!collection) return res.status(404).json({ message: "Collection not found" });
    return res.json({ message: "Collection updated", collection });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update collection" });
  }
};

exports.remove = async (req, res) => {
  try {
    const collection = await Collection.findOneAndDelete(withTenant({ _id: req.params.id }, req));
    if (!collection) return res.status(404).json({ message: "Collection not found" });
    return res.json({ message: "Collection deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete collection" });
  }
};
