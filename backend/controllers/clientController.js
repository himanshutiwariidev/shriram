const bcrypt = require("bcryptjs");
const Client = require("../models/Client");
const Proposal = require("../models/Proposal");
const PaymentReminder = require("../models/PaymentReminder");
const Collection = require("../models/Collection");
const Expense = require("../models/Expense");
const User = require("../models/User");
const clientService = require("../services/clientService");
const { computeDeliverableStats, decorateProposal } = require("../utils/deliverableStats");
const { logActivity } = require("../utils/activityLogger");
const ActivityLog = require("../models/ActivityLog");
const { withTenant, POPULATE_SKIP_TENANT } = require("../utils/tenantQuery");
const { servicesToDeliverables } = require("../utils/servicesToDeliverables");

// ============= CLIENT OPERATIONS =============

exports.createClient = async (req, res) => {
  try {
    const { clientName, email, phone, companyName, gstNo,tanNo,salesPerson,leadSource,clientType,projectType, projectName, address, city, state, country, zipCode, contactPerson, designation, status, activeStatus, notes, password } = req.body;

    if (!clientName || !email || !phone) {
      return res.status(400).json({ message: "Client name, email, and phone are required" });
    }

    if (password && password.length < 6) {
      return res.status(400).json({ message: "Login password must be at least 6 characters" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingClient = await Client.findOne(withTenant({ email: normalizedEmail }, req));
    if (existingClient) {
      return res.status(400).json({ message: "Client with this email already exists" });
    }

    if (password) {
      const existingUser = await User.findOne(withTenant({ email: normalizedEmail }, req));
      if (existingUser) {
        return res.status(400).json({ message: "A user with this email already exists" });
      }
    }

    const client = await Client.create({
      tenantId: req.tenantId,
      clientName,
      email: normalizedEmail,
      phone,
      companyName,
      gstNo,
      tanNo,
      salesPerson,
      leadSource,
      clientType,
      projectType,
      projectName,
      address,
      city,
      state,
      country,
      zipCode,
      contactPerson,
      designation,
      status: status || undefined,
      activeStatus: activeStatus || undefined,
      notes,
      onboardedAt: new Date(),
    });

    await logActivity(req.tenantId, client._id, "client_created", `Client "${clientName}" was onboarded`, { salesPerson, leadSource, status: client.status });

    if (password) {
      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({
          tenantId: req.tenantId,
          name: clientName,
          email: normalizedEmail,
          password: hashedPassword,
          role: "client",
          clientId: client._id,
        });
        await logActivity(req.tenantId, client._id, "portal_enabled", "Client portal access was enabled");
      } catch (userError) {
        // Roll back the client so we never leave an orphan client without its requested login account
        await Client.findOneAndDelete(withTenant({ _id: client._id }, req));
        console.error("Error creating linked client-login user:", userError);
        return res.status(500).json({ message: userError.message || "Failed to create client login account" });
      }
    }

    return res.status(201).json({ message: "Client onboarded successfully", client });
  } catch (error) {
    console.error("Error creating client:", error);
    if (error?.code === 11000) {
      return res.status(400).json({ message: "Client with this email already exists" });
    }
    return res.status(500).json({ message: error.message || "Failed to create client" });
  }
};

exports.getAllClients = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === "sales") {
      filter.salesPerson = req.user.id;
    } else if (req.user.role === "user") {
      filter.assignedUser = req.user.id;
    }

    const clients = await Client.find(withTenant(filter, req))
      .populate({ path: "salesPerson", select: "name email", options: POPULATE_SKIP_TENANT })
      .populate({ path: "assignedUser", select: "name email", options: POPULATE_SKIP_TENANT })
      .sort({ createdAt: -1 });
    const linkedUserClientIds = new Set(
      (await User.find(withTenant({ role: "client" }, req)).select("clientId")).map((u) => String(u.clientId))
    );
    const clientsWithLoginInfo = clients.map((client) => ({
      ...client.toObject(),
      hasLoginAccess: linkedUserClientIds.has(String(client._id)),
    }));

    return res.json({ clients: clientsWithLoginInfo, total: clients.length });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch clients" });
  }
};

exports.getClientById = async (req, res) => {
  try {
    const client = await Client.findOne(withTenant({ _id: req.params.id }, req))
      .populate({ path: "salesPerson", select: "name email", options: POPULATE_SKIP_TENANT })
      .populate({ path: "assignedUser", select: "name email", options: POPULATE_SKIP_TENANT })
      .populate({ path: "assignedBy", select: "name email", options: POPULATE_SKIP_TENANT })
      .populate({ path: "remarks.user", select: "name", options: POPULATE_SKIP_TENANT })
      .populate({ path: "workProgress.updatedBy", select: "name", options: POPULATE_SKIP_TENANT })
      .populate({ path: "piAttachments.uploadedBy", select: "name", options: POPULATE_SKIP_TENANT });
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    if (req.user.role === "sales" && String(client.salesPerson?._id) !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }
    if (req.user.role === "user" && String(client.assignedUser?._id) !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const proposals = await Proposal.find(withTenant({ clientId: req.params.id }, req)).sort({ createdAt: -1 });
    const reminders = await PaymentReminder.find(withTenant({ clientId: req.params.id }, req)).sort({ createdAt: -1 });
    const linkedUser = await User.findOne(withTenant({ clientId: req.params.id }, req));

    return res.json({
      client: { ...client.toObject(), hasLoginAccess: Boolean(linkedUser) },
      proposals,
      reminders,
    });
  } catch (error) {
    console.error("Error fetching client:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch client" });
  }
};

exports.assignUserToClient = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const assignedUser = await User.findOne(withTenant({ _id: userId, role: "user" }, req));
    if (!assignedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const client = await Client.findOneAndUpdate(
      withTenant({ _id: req.params.id }, req),
      { assignedUser: userId, assignedBy: req.user.id, assignedDate: new Date() },
      { new: true, runValidators: true }
    ).populate({ path: "assignedUser", select: "name email", options: POPULATE_SKIP_TENANT });

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    await logActivity(req.tenantId, client._id, "user_assigned", `${assignedUser.name} was assigned to this client`);

    return res.json({ message: "User assigned successfully", client });
  } catch (error) {
    console.error("Error assigning user to client:", error);
    return res.status(500).json({ message: error.message || "Failed to assign user" });
  }
};

const canAccessClientRemarksOrProgress = (client, user) => {
  if (user.role === "admin") return true;
  if (client.salesPerson && String(client.salesPerson._id || client.salesPerson) === user.id) return true;
  if (client.assignedUser && String(client.assignedUser._id || client.assignedUser) === user.id) return true;
  return false;
};

exports.getRemarks = async (req, res) => {
  try {
    const client = await Client.findOne(withTenant({ _id: req.params.id }, req)).populate({ path: "remarks.user", select: "name", options: POPULATE_SKIP_TENANT });
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    if (!canAccessClientRemarksOrProgress(client, req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const remarks = [...client.remarks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({ remarks, total: remarks.length });
  } catch (error) {
    console.error("Error fetching remarks:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch remarks" });
  }
};

exports.addRemark = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Remark message is required" });
    }

    const client = await Client.findOne(withTenant({ _id: req.params.id }, req));
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    if (!canAccessClientRemarksOrProgress(client, req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    client.remarks.push({ user: req.user.id, role: req.user.role, message: message.trim() });
    await client.save();
    await client.populate({ path: "remarks.user", select: "name", options: POPULATE_SKIP_TENANT });

    await logActivity(req.tenantId, client._id, "remark_added", "A new remark was added");

    const remarks = [...client.remarks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.status(201).json({ message: "Remark added successfully", remarks });
  } catch (error) {
    console.error("Error adding remark:", error);
    return res.status(500).json({ message: error.message || "Failed to add remark" });
  }
};

exports.getWorkProgress = async (req, res) => {
  try {
    const client = await Client.findOne(withTenant({ _id: req.params.id }, req)).populate({ path: "workProgress.updatedBy", select: "name", options: POPULATE_SKIP_TENANT });
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const sorted = [...client.workProgress].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (req.user.role === "client") {
      const linkedUser = await User.findOne(withTenant({ _id: req.user.id }, req));
      if (!linkedUser || String(linkedUser.clientId) !== String(client._id)) {
        return res.status(403).json({ message: "Access denied" });
      }
      return res.json({ workProgress: sorted.slice(0, 1), total: Math.min(sorted.length, 1) });
    }

    if (!canAccessClientRemarksOrProgress(client, req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.json({ workProgress: sorted, total: sorted.length });
  } catch (error) {
    console.error("Error fetching work progress:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch work progress" });
  }
};

exports.addWorkProgress = async (req, res) => {
  try {
    const { title, description, status, percentage } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const client = await Client.findOne(withTenant({ _id: req.params.id }, req));
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const isAssignedUser = client.assignedUser && String(client.assignedUser) === req.user.id;
    if (req.user.role !== "admin" && !isAssignedUser) {
      return res.status(403).json({ message: "Access denied" });
    }

    client.workProgress.push({
      title: title.trim(),
      description,
      status: status || "Pending",
      percentage: percentage ?? 0,
      updatedBy: req.user.id,
      role: req.user.role,
    });
    await client.save();
    await client.populate({ path: "workProgress.updatedBy", select: "name", options: POPULATE_SKIP_TENANT });

    await logActivity(req.tenantId, client._id, "progress_updated", `Work progress update: "${title.trim()}"`);

    const sorted = [...client.workProgress].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.status(201).json({ message: "Work progress added successfully", workProgress: sorted });
  } catch (error) {
    console.error("Error adding work progress:", error);
    return res.status(500).json({ message: error.message || "Failed to add work progress" });
  }
};

exports.updateWorkProgress = async (req, res) => {
  try {
    const { title, description, status, percentage } = req.body;

    const client = await Client.findOne(withTenant({ _id: req.params.id }, req));
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const latestEntry = client.workProgress[client.workProgress.length - 1];
    if (!latestEntry || String(latestEntry._id) !== req.params.entryId) {
      return res.status(403).json({ message: "Only the latest work progress entry can be edited" });
    }

    const isOwner = latestEntry.updatedBy && String(latestEntry.updatedBy) === req.user.id;
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (title !== undefined) latestEntry.title = title;
    if (description !== undefined) latestEntry.description = description;
    if (status !== undefined) latestEntry.status = status;
    if (percentage !== undefined) latestEntry.percentage = percentage;

    await client.save();
    await client.populate({ path: "workProgress.updatedBy", select: "name", options: POPULATE_SKIP_TENANT });

    await logActivity(req.tenantId, client._id, "progress_updated", `Work progress update edited: "${latestEntry.title}"`);

    const sorted = [...client.workProgress].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({ message: "Work progress updated successfully", workProgress: sorted });
  } catch (error) {
    console.error("Error updating work progress:", error);
    return res.status(500).json({ message: error.message || "Failed to update work progress" });
  }
};

exports.updateClient = async (req, res) => {
  try {
    const updatePayload = { ...req.body };

    const password = updatePayload.password;
    delete updatePayload.password;

    if (password && password.length < 6) {
      return res.status(400).json({ message: "Login password must be at least 6 characters" });
    }

    if (updatePayload.email) {
      updatePayload.email = updatePayload.email.toLowerCase().trim();

      const existingClient = await Client.findOne(withTenant({
        email: updatePayload.email,
        _id: { $ne: req.params.id },
      }, req));
      if (existingClient) {
        return res.status(400).json({ message: "Email is already in use by another client" });
      }
    }

    const previousClient = await Client.findOne(withTenant({ _id: req.params.id }, req)).select("status activeStatus");

    const client = await Client.findOneAndUpdate(withTenant({ _id: req.params.id }, req), updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    if (updatePayload.status && previousClient && updatePayload.status !== previousClient.status) {
      await logActivity(req.tenantId, client._id, "status_changed", `Status changed from "${previousClient.status}" to "${client.status}"`);
    }
    if (updatePayload.activeStatus && previousClient && updatePayload.activeStatus !== previousClient.activeStatus) {
      await logActivity(req.tenantId, client._id, "status_changed", `Marked as ${client.activeStatus}`);
    }
    if (!updatePayload.status && !updatePayload.activeStatus) {
      await logActivity(req.tenantId, client._id, "client_updated", "Client details were updated");
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const linkedUser = await User.findOne(withTenant({ clientId: client._id }, req));

      if (linkedUser) {
        linkedUser.password = hashedPassword;
        linkedUser.email = client.email;
        linkedUser.name = client.clientName;
        await linkedUser.save();
        await logActivity(req.tenantId, client._id, "portal_enabled", "Client portal password was reset");
      } else {
        const existingUser = await User.findOne(withTenant({ email: client.email }, req));
        if (existingUser) {
          return res.status(400).json({ message: "A user with this email already exists" });
        }
        await User.create({
          tenantId: req.tenantId,
          name: client.clientName,
          email: client.email,
          password: hashedPassword,
          role: "client",
          clientId: client._id,
        });
        await logActivity(req.tenantId, client._id, "portal_enabled", "Client portal access was enabled");
      }
    }

    return res.json({ message: "Client updated successfully", client });
  } catch (error) {
    console.error("Error updating client:", error);
    return res.status(500).json({ message: error.message || "Failed to update client" });
  }
};

exports.deleteClient = async (req, res) => {
  try {
    const client = await Client.findOneAndDelete(withTenant({ _id: req.params.id }, req));
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // Delete related proposals, reminders, activity log, and the linked client-login user
    await Proposal.deleteMany(withTenant({ clientId: req.params.id }, req));
    await PaymentReminder.deleteMany(withTenant({ clientId: req.params.id }, req));
    await ActivityLog.deleteMany(withTenant({ clientId: req.params.id }, req));
    await User.deleteOne(withTenant({ clientId: req.params.id }, req));

    return res.json({ message: "Client and related data deleted successfully" });
  } catch (error) {
    console.error("Error deleting client:", error);
    return res.status(500).json({ message: error.message || "Failed to delete client" });
  }
};

exports.getClientActivity = async (req, res) => {
  try {
    const activity = await ActivityLog.find(withTenant({ clientId: req.params.id }, req)).sort({ createdAt: -1 });
    return res.json({ activity, total: activity.length });
  } catch (error) {
    console.error("Error fetching client activity:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch client activity" });
  }
};

// ============= PROPOSAL OPERATIONS =============

exports.createProposal = async (req, res) => {
  try {
    const { clientId, projectName, projectDescription, projectScope, timeline, startDate, endDate, priority, projectAmount, currency, paymentTerms, validUntil, notes, deliverables, services, nextDueDate } = req.body;

    if (!clientId || !projectName || !projectAmount) {
      return res.status(400).json({ message: "Missing required fields: clientId, projectName, projectAmount" });
    }

    const client = await Client.findOne(withTenant({ _id: clientId }, req));
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const proposalNumber = clientService.buildProposalNumber();

    // The Services Builder replaces manual deliverables — when present,
    // it's the single source of truth and deliverables[] is derived from
    // it server-side so DeliverablesTracker/PDF/client-dashboard/KPIs all
    // keep working unchanged. Falls back to any raw `deliverables` sent
    // directly (legacy/back-compat path) when `services` is absent.
    const resolvedDeliverables = Array.isArray(services) && services.length > 0
      ? servicesToDeliverables(services)
      : (deliverables || []);

    const proposal = await Proposal.create({
      tenantId: req.tenantId,
      proposalNumber,
      clientId,
      projectName,
      projectDescription,
      projectScope,
      timeline,
      startDate,
      endDate,
      priority,
      projectAmount,
      currency: currency || "INR",
      paymentTerms,
      validUntil,
      notes,
      services,
      deliverables: resolvedDeliverables,
      nextDueDate,
      proposalStatus: "draft",
    });

    // Automatically send the proposal email
    try {
      const emailResult = await clientService.sendProposalEmail({ client, proposal, tenantId: req.tenantId });

      proposal.proposalStatus = "sent";
      proposal.sentAt = new Date();
      proposal.sentTo = client.email;
      await proposal.save();

      await logActivity(req.tenantId, clientId, "proposal_sent", `Proposal "${projectName}" created and sent`, { proposalId: proposal._id, projectAmount });

      return res.status(201).json({
        message: "Proposal created and sent successfully",
        proposal: decorateProposal(proposal),
        emailInfo: emailResult
      });
    } catch (emailError) {
      console.error("Error sending proposal email:", emailError);
      await logActivity(req.tenantId, clientId, "proposal_created", `Proposal "${projectName}" created (email failed to send)`, { proposalId: proposal._id, projectAmount });
      // Still return success for proposal creation, but note the email failure
      return res.status(201).json({
        message: "Proposal created successfully, but failed to send email",
        proposal: decorateProposal(proposal),
        emailError: emailError.message
      });
    }
  } catch (error) {
    console.error("Error creating proposal:", error);
    return res.status(500).json({ message: error.message || "Failed to create proposal" });
  }
};

exports.getAllProposals = async (req, res) => {
  try {
    const { clientId } = req.query;
    const filter = clientId ? { clientId } : {};
    const proposals = await Proposal.find(withTenant(filter, req)).populate({ path: "clientId", select: "clientName email", options: POPULATE_SKIP_TENANT }).sort({ createdAt: -1 });

    return res.json({ proposals: proposals.map(decorateProposal), total: proposals.length });
  } catch (error) {
    console.error("Error fetching proposals:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch proposals" });
  }
};

exports.getProposalById = async (req, res) => {
  try {
    const proposal = await Proposal.findOne(withTenant({ _id: req.params.id }, req)).populate({ path: "clientId", options: POPULATE_SKIP_TENANT });
    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }
    return res.json(decorateProposal(proposal));
  } catch (error) {
    console.error("Error fetching proposal:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch proposal" });
  }
};

exports.generateInvoice = async (req, res) => {
  try {
    const proposal = await Proposal.findOne(withTenant({ _id: req.params.id }, req));
    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }

    const client = await Client.findOne(withTenant({ _id: proposal.clientId }, req));
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const fileData = await clientService.generateInvoicePdf({ client, proposal });
    await logActivity(req.tenantId, client._id, "invoice_generated", `Invoice generated for "${proposal.projectName}"`, { proposalId: proposal._id });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${proposal.proposalNumber}.pdf`);
    return res.send(fileData);
  } catch (error) {
    console.error("Error generating invoice:", error);
    return res.status(500).json({ message: error.message || "Failed to generate invoice" });
  }
};

exports.sendProposal = async (req, res) => {
  try {
    const proposal = await Proposal.findOne(withTenant({ _id: req.params.id }, req));
    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }

    const client = await Client.findOne(withTenant({ _id: proposal.clientId }, req));
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const emailResult = await clientService.sendProposalEmail({ client, proposal, tenantId: req.tenantId });

    proposal.proposalStatus = "sent";
    proposal.sentAt = new Date();
    proposal.sentTo = client.email;
    await proposal.save();

    await logActivity(req.tenantId, client._id, "proposal_sent", `Proposal "${proposal.projectName}" sent`, { proposalId: proposal._id });

    return res.json({
      message: "Proposal sent successfully",
      proposal: decorateProposal(proposal),
      emailInfo: emailResult,
    });
  } catch (error) {
    console.error("Error sending proposal:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message || "Failed to send proposal" });
  }
};

exports.updateProposal = async (req, res) => {
  try {
    const updatePayload = { ...req.body };

    // Only recompute deliverables when the Services Builder actually sent
    // new services data — an unrelated edit (e.g. a status change) must
    // never silently wipe an existing proposal's deliverables.
    if (Array.isArray(updatePayload.services) && updatePayload.services.length > 0) {
      updatePayload.deliverables = servicesToDeliverables(updatePayload.services);
    } else {
      delete updatePayload.services;
    }

    const proposal = await Proposal.findOneAndUpdate(withTenant({ _id: req.params.id }, req), updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }

    return res.json({ message: "Proposal updated successfully", proposal: decorateProposal(proposal) });
  } catch (error) {
    console.error("Error updating proposal:", error);
    return res.status(500).json({ message: error.message || "Failed to update proposal" });
  }
};

exports.deleteProposal = async (req, res) => {
  try {
    const proposal = await Proposal.findOneAndDelete(withTenant({ _id: req.params.id }, req));
    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }

    return res.json({ message: "Proposal deleted successfully" });
  } catch (error) {
    console.error("Error deleting proposal:", error);
    return res.status(500).json({ message: error.message || "Failed to delete proposal" });
  }
};

// ============= DELIVERABLES OPERATIONS =============

exports.addDeliverable = async (req, res) => {
  try {
    const { title, quantity, frequency } = req.body;
    if (!title || quantity === undefined) {
      return res.status(400).json({ message: "Title and quantity are required" });
    }

    const proposal = await Proposal.findOne(withTenant({ _id: req.params.id }, req));
    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }

    proposal.deliverables.push({ title, quantity, delivered: 0, frequency: frequency || "one-time" });
    await proposal.save();

    await logActivity(req.tenantId, proposal.clientId, "deliverable_added", `Deliverable "${title}" added to "${proposal.projectName}"`, { proposalId: proposal._id });

    return res.status(201).json({ message: "Deliverable added successfully", proposal: decorateProposal(proposal) });
  } catch (error) {
    console.error("Error adding deliverable:", error);
    return res.status(500).json({ message: error.message || "Failed to add deliverable" });
  }
};

exports.updateDeliverable = async (req, res) => {
  try {
    const { delivered, title, quantity, frequency } = req.body;

    const proposal = await Proposal.findOne(withTenant({ _id: req.params.id }, req));
    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }

    const deliverable = proposal.deliverables.id(req.params.deliverableId);
    if (!deliverable) {
      return res.status(404).json({ message: "Deliverable not found" });
    }

    if (delivered !== undefined) deliverable.delivered = delivered;
    if (title !== undefined) deliverable.title = title;
    if (quantity !== undefined) deliverable.quantity = quantity;
    if (frequency !== undefined) deliverable.frequency = frequency;

    await proposal.save();

    await logActivity(req.tenantId, proposal.clientId, "deliverable_updated", `Deliverable "${deliverable.title}" updated on "${proposal.projectName}"`, { proposalId: proposal._id });

    return res.json({ message: "Deliverable updated successfully", proposal: decorateProposal(proposal) });
  } catch (error) {
    console.error("Error updating deliverable:", error);
    return res.status(500).json({ message: error.message || "Failed to update deliverable" });
  }
};

exports.deleteDeliverable = async (req, res) => {
  try {
    const proposal = await Proposal.findOne(withTenant({ _id: req.params.id }, req));
    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }

    const deliverable = proposal.deliverables.id(req.params.deliverableId);
    if (!deliverable) {
      return res.status(404).json({ message: "Deliverable not found" });
    }

    deliverable.deleteOne();
    await proposal.save();

    return res.json({ message: "Deliverable deleted successfully", proposal: decorateProposal(proposal) });
  } catch (error) {
    console.error("Error deleting deliverable:", error);
    return res.status(500).json({ message: error.message || "Failed to delete deliverable" });
  }
};

// ============= PAYMENT OPERATIONS =============

exports.addPayment = async (req, res) => {
  try {
    const { amount, paymentDate, method, notes, nextDueDate } = req.body;
    if (!amount) {
      return res.status(400).json({ message: "Amount is required" });
    }

    const proposal = await Proposal.findOne(withTenant({ _id: req.params.id }, req));
    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }

    proposal.payments.push({ amount, paymentDate, method, notes });
    if (nextDueDate) {
      proposal.nextDueDate = nextDueDate;
    }
    await proposal.save();

    await logActivity(req.tenantId, proposal.clientId, "payment_added", `Payment of ₹${amount} recorded on "${proposal.projectName}"`, { proposalId: proposal._id, amount, method });

    return res.status(201).json({ message: "Payment recorded successfully", proposal: decorateProposal(proposal) });
  } catch (error) {
    console.error("Error adding payment:", error);
    return res.status(500).json({ message: error.message || "Failed to add payment" });
  }
};

// ============= COLLECTIONS (all payments across all proposals) =============

exports.getAllCollections = async (req, res) => {
  try {
    const proposals = await Proposal.find(withTenant({}, req))
      .populate({ path: "clientId", select: "clientName email companyName", options: POPULATE_SKIP_TENANT })
      .sort({ createdAt: -1 });

    const now = new Date();
    let start = req.query.start ? new Date(req.query.start) : null;
    let end   = req.query.end   ? new Date(req.query.end)   : null;

    const collections = [];
    proposals.forEach((proposal) => {
      proposal.payments.forEach((pmt) => {
        const paidOn = pmt.paymentDate ? new Date(pmt.paymentDate) : null;
        if (start && paidOn && paidOn < start) return;
        if (end   && paidOn && paidOn > end)   return;
        collections.push({
          _id:          pmt._id,
          proposalId:   proposal._id,
          projectName:  proposal.projectName || "—",
          clientId:     proposal.clientId?._id,
          clientName:   proposal.clientId?.clientName || "—",
          companyName:  proposal.clientId?.companyName || "",
          amount:       pmt.amount,
          paymentDate:  pmt.paymentDate,
          method:       pmt.method,
          notes:        pmt.notes || "",
        });
      });
    });

    // newest first
    collections.sort((a, b) => new Date(b.paymentDate || 0) - new Date(a.paymentDate || 0));

    const total = collections.reduce((s, c) => s + (c.amount || 0), 0);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = collections
      .filter((c) => c.paymentDate && new Date(c.paymentDate) >= thisMonthStart)
      .reduce((s, c) => s + (c.amount || 0), 0);

    return res.json({ collections, total, thisMonth, count: collections.length });
  } catch (error) {
    console.error("Error fetching collections:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch collections" });
  }
};

// ============= CLIENT PORTAL (role: "client") =============

exports.getMyProject = async (req, res) => {
  try {
    const user = await User.findOne(withTenant({ _id: req.user.id }, req));
    if (!user || !user.clientId) {
      return res.status(404).json({ message: "No linked client account found" });
    }

    const client = await Client.findOne(withTenant({ _id: user.clientId }, req));
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const proposals = await Proposal.find(withTenant({ clientId: client._id }, req)).sort({ createdAt: -1 });
    const now = new Date();

    const projects = proposals.map((proposal) => {
      const decorated = decorateProposal(proposal);
      return {
        id: proposal._id,
        projectName: decorated.projectName,
        proposalStatus: decorated.proposalStatus,
        deliverables: decorated.deliverables,
        payments: decorated.payments,
        projectAmount: decorated.projectAmount,
        receivedAmount: decorated.receivedAmount,
        dueAmount: decorated.dueAmount,
        nextDueDate: decorated.nextDueDate,
        isOverdue: Boolean(decorated.nextDueDate && decorated.dueAmount > 0 && new Date(decorated.nextDueDate) < now),
      };
    });

    return res.json({
      client: {
        id: client._id,
        clientName: client.clientName,
        email: client.email,
        companyName: client.companyName,
      },
      projects,
    });
  } catch (error) {
    console.error("Error fetching client project:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch project" });
  }
};

// ============= DASHBOARD STATS =============

exports.getDashboardStats = async (req, res) => {
  try {
    // When the frontend passes explicit start/end, it has already computed the precise
    // UTC instant for the user's local day boundaries — use it as-is. Only the
    // no-params fallback (defaulting to "this month") needs us to compute boundaries,
    // and that's done directly in local server time below, not via a second setHours()
    // pass that would re-interpret an already-correct instant in the wrong timezone.
    const now = new Date();
    let periodStart = req.query.start ? new Date(req.query.start) : null;
    let periodEnd = req.query.end ? new Date(req.query.end) : null;
    if (!periodStart || Number.isNaN(periodStart.getTime())) {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    }
    if (!periodEnd || Number.isNaN(periodEnd.getTime())) {
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const dateFilter = { createdAt: { $gte: periodStart, $lte: periodEnd } };

    const [clients, proposals, reminders, allProposals, allStandaloneCollections, allExpenses] = await Promise.all([
      Client.find(withTenant(dateFilter, req)).sort({ createdAt: -1 }),
      Proposal.find(withTenant(dateFilter, req)),
      PaymentReminder.find(withTenant(dateFilter, req)),
      Proposal.find(withTenant({}, req)), // unfiltered — needed for the trailing monthly revenue trend below
      Collection.find(withTenant({}, req)), // standalone manual collections — unfiltered for trend charts
      Expense.find(withTenant({}, req)).select("expenseDate totalAmount"), // all expenses — for profit comparisons
    ]);

    const totalClients = clients.length;
    // "Active" here means converted leads (an actual onboarded client), not the old
    // active/inactive flag — status is now a lead-pipeline stage (open/converted/cold/ni).
    const activeClients = clients.filter((c) => c.status === "converted").length;
    const activeClientsPercent = totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0;

    const proposalStatusBreakdown = { sent: 0, accepted: 0, rejected: 0, draft: 0 };
    let totalDeliverables = 0;
    let completedDeliverables = 0;
    let totalDue = 0;
    let totalDelivered = 0;
    let totalRevenue = 0;
    let outstandingPayments = 0;
    let overduePayments = 0;
    let collectedThisMonth = 0;

    proposals.forEach((proposal) => {
      if (proposalStatusBreakdown[proposal.proposalStatus] !== undefined) {
        proposalStatusBreakdown[proposal.proposalStatus] += 1;
      }

      const sinceDate = proposal.sentAt || proposal.createdAt || now;
      proposal.deliverables.forEach((item) => {
        const stats = computeDeliverableStats(item, sinceDate);
        totalDeliverables += 1;
        totalDue += stats.due || 0;
        totalDelivered += stats.delivered || 0;
        if (stats.status === "Completed") completedDeliverables += 1;
      });

      totalRevenue += proposal.receivedAmount || 0;
      outstandingPayments += proposal.dueAmount || 0;

      if (proposal.nextDueDate && proposal.dueAmount > 0 && new Date(proposal.nextDueDate) < now) {
        overduePayments += 1;
      }
    });

    // Add standalone manual collections (Collection model) in the period to totalRevenue
    allStandaloneCollections.forEach((c) => {
      if (!c.paymentDate) return;
      const paidOn = new Date(c.paymentDate);
      if (paidOn >= periodStart && paidOn <= periodEnd) {
        totalRevenue += c.amount || 0;
      }
    });

    // "Collected" must key off each payment's OWN date, not the creation date of the
    // proposal it lives on — a payment logged today against an older proposal still
    // belongs in "today". Scanning all proposals (not just ones created in-range) is
    // what makes that work.
    allProposals.forEach((proposal) => {
      proposal.payments.forEach((payment) => {
        if (!payment.paymentDate) return;
        const paidOn = new Date(payment.paymentDate);
        if (paidOn >= periodStart && paidOn <= periodEnd) {
          collectedThisMonth += payment.amount || 0;
        }
      });
    });

    // Same for standalone collections
    allStandaloneCollections.forEach((c) => {
      if (!c.paymentDate) return;
      const paidOn = new Date(c.paymentDate);
      if (paidOn >= periodStart && paidOn <= periodEnd) {
        collectedThisMonth += c.amount || 0;
      }
    });

    const pendingDeliverables = totalDeliverables - completedDeliverables;
    const overallCompletionPercent = totalDue > 0 ? Math.round((totalDelivered / totalDue) * 100) : 0;
    const pendingReminders = reminders.filter((r) => r.reminderStatus !== "paid").length;
    const hasData = totalClients > 0 || proposals.length > 0 || reminders.length > 0;

    // Trailing 8-month revenue trend, independent of the selected date-range filter —
    // "collected" buckets by when each payment was actually made, "outstanding" buckets
    // by when the proposal carrying that due balance was created.
    const TREND_MONTHS = 8;
    const monthBuckets = [];
    for (let i = TREND_MONTHS - 1; i >= 0; i -= 1) {
      const d = new Date(periodStart.getFullYear(), periodStart.getMonth() - i, 1);
      monthBuckets.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleDateString("en-US", { month: "short" }),
        collected: 0,
        outstanding: 0,
      });
    }
    const bucketFor = (date) => monthBuckets.find((b) => b.year === date.getFullYear() && b.month === date.getMonth());

    allProposals.forEach((proposal) => {
      proposal.payments.forEach((payment) => {
        if (!payment.paymentDate) return;
        const bucket = bucketFor(new Date(payment.paymentDate));
        if (bucket) bucket.collected += payment.amount || 0;
      });
      const createdBucket = bucketFor(new Date(proposal.createdAt));
      if (createdBucket) createdBucket.outstanding += proposal.dueAmount || 0;
    });

    allStandaloneCollections.forEach((c) => {
      if (!c.paymentDate) return;
      const bucket = bucketFor(new Date(c.paymentDate));
      if (bucket) bucket.collected += c.amount || 0;
    });

    const monthlyTrend = monthBuckets.map(({ label, year, collected, outstanding }) => ({ label, year, collected, outstanding }));
    const trendTotalCollected = monthlyTrend.reduce((sum, b) => sum + b.collected, 0);
    const trendTotalOutstanding = monthlyTrend.reduce((sum, b) => sum + b.outstanding, 0);
    const currentMonthBucket = monthlyTrend[monthlyTrend.length - 1] || { collected: 0, outstanding: 0 };

    // Trailing 7-day collections trend, for the "Daily Collections" chart.
    const TREND_DAYS = 7;
    const dayBuckets = [];
    for (let i = TREND_DAYS - 1; i >= 0; i -= 1) {
      const d = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate() - i);
      dayBuckets.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        date: d.getDate(),
        label: d.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
        collected: 0,
      });
    }
    const dayBucketFor = (date) => dayBuckets.find((b) => b.year === date.getFullYear() && b.month === date.getMonth() && b.date === date.getDate());

    allProposals.forEach((proposal) => {
      proposal.payments.forEach((payment) => {
        if (!payment.paymentDate) return;
        const bucket = dayBucketFor(new Date(payment.paymentDate));
        if (bucket) bucket.collected += payment.amount || 0;
      });
    });

    allStandaloneCollections.forEach((c) => {
      if (!c.paymentDate) return;
      const bucket = dayBucketFor(new Date(c.paymentDate));
      if (bucket) bucket.collected += c.amount || 0;
    });

    const dailyTrend = dayBuckets.map(({ label, collected }) => ({ label, collected }));
    const todayCollected = dailyTrend[dailyTrend.length - 1]?.collected || 0;

    // Per-month totals keyed as "YYYY-M" — used for same-month-last-year comparison
    // and yearly breakup bar chart.
    const monthYearTotals = new Map();
    const yearTotals = new Map();
    allProposals.forEach((proposal) => {
      proposal.payments.forEach((payment) => {
        if (!payment.paymentDate) return;
        const d = new Date(payment.paymentDate);
        const mk = `${d.getFullYear()}-${d.getMonth()}`;
        monthYearTotals.set(mk, (monthYearTotals.get(mk) || 0) + (payment.amount || 0));
        yearTotals.set(d.getFullYear(), (yearTotals.get(d.getFullYear()) || 0) + (payment.amount || 0));
      });
    });
    allStandaloneCollections.forEach((c) => {
      if (!c.paymentDate) return;
      const d = new Date(c.paymentDate);
      const mk = `${d.getFullYear()}-${d.getMonth()}`;
      monthYearTotals.set(mk, (monthYearTotals.get(mk) || 0) + (c.amount || 0));
      yearTotals.set(d.getFullYear(), (yearTotals.get(d.getFullYear()) || 0) + (c.amount || 0));
    });

    const yearlyBreakup = Array.from(yearTotals.entries())
      .sort(([a], [b]) => a - b)
      .slice(-4)
      .map(([year, collected]) => ({ year, collected }));
    const yearlyBreakupTotal = yearlyBreakup.reduce((sum, y) => sum + y.collected, 0);

    // Same-month last-year: compare the selected month against the same calendar
    // month in the previous year (e.g. July 2026 vs July 2025).
    const selectedYear  = periodStart.getFullYear();
    const selectedMonth = periodStart.getMonth();
    const thisMonthCollected      = monthYearTotals.get(`${selectedYear}-${selectedMonth}`)     || 0;
    const prevYearMonthCollected  = monthYearTotals.get(`${selectedYear - 1}-${selectedMonth}`) || 0;
    const sameMonthLastYearChangePercent = prevYearMonthCollected > 0
      ? Math.round(((thisMonthCollected - prevYearMonthCollected) / prevYearMonthCollected) * 100)
      : null;
    const prevYearMonthLabel = periodStart.toLocaleDateString("en-US", { month: "short" });

    // Full-year comparison: selected year total vs previous year total collections
    const thisYearCollected  = yearTotals.get(selectedYear)     || 0;
    const prevYearCollected  = yearTotals.get(selectedYear - 1) || 0;
    const yearlyCollectionsChangePercent = prevYearCollected > 0
      ? Math.round(((thisYearCollected - prevYearCollected) / prevYearCollected) * 100)
      : null;

    const yearOverYearChangePercent = sameMonthLastYearChangePercent; // kept for compat

    // Expense totals keyed by "YYYY-M" and by year — mirrors the collection maps above
    const expMonthYearTotals = new Map();
    const expYearTotals = new Map();
    allExpenses.forEach((e) => {
      if (!e.expenseDate) return;
      const d = new Date(e.expenseDate);
      const mk = `${d.getFullYear()}-${d.getMonth()}`;
      expMonthYearTotals.set(mk, (expMonthYearTotals.get(mk) || 0) + (e.totalAmount || 0));
      expYearTotals.set(d.getFullYear(), (expYearTotals.get(d.getFullYear()) || 0) + (e.totalAmount || 0));
    });

    const thisMonthExpenses     = expMonthYearTotals.get(`${selectedYear}-${selectedMonth}`)     || 0;
    const prevYearMonthExpenses = expMonthYearTotals.get(`${selectedYear - 1}-${selectedMonth}`) || 0;
    const thisYearExpenses  = expYearTotals.get(selectedYear)     || 0;
    const prevYearExpenses  = expYearTotals.get(selectedYear - 1) || 0;

    // Profit = Collections − Expenses for each period
    const thisMonthProfit     = thisMonthCollected    - thisMonthExpenses;
    const prevYearMonthProfit = prevYearMonthCollected - prevYearMonthExpenses;
    const thisYearProfit  = thisYearCollected  - thisYearExpenses;
    const prevYearProfit  = prevYearCollected  - prevYearExpenses;

    const sameMonthLastYearProfitChangePercent = prevYearMonthProfit !== 0
      ? Math.round(((thisMonthProfit - prevYearMonthProfit) / Math.abs(prevYearMonthProfit)) * 100)
      : null;
    const yearlyProfitChangePercent = prevYearProfit !== 0
      ? Math.round(((thisYearProfit - prevYearProfit) / Math.abs(prevYearProfit)) * 100)
      : null;

    return res.json({
      totalClients,
      activeClients,
      activeClientsPercent,
      totalProposals: proposals.length,
      proposalStatusBreakdown,
      totalReminders: reminders.length,
      pendingReminders,
      totalDeliverables,
      completedDeliverables,
      pendingDeliverables,
      overallCompletionPercent,
      totalRevenue,
      outstandingPayments,
      overduePayments,
      collectedThisMonth,
      recentClients: clients.slice(0, 5).map((c) => ({
        _id: c._id,
        clientName: c.clientName,
        email: c.email,
        status: c.status,
      })),
      monthlyTrend,
      trendTotalCollected,
      trendTotalOutstanding,
      currentMonthCollected: currentMonthBucket.collected,
      currentMonthOutstanding: currentMonthBucket.outstanding,
      dailyTrend,
      todayCollected,
      yearlyBreakup,
      yearlyBreakupTotal,
      yearOverYearChangePercent,
      sameMonthLastYearChangePercent,
      yearlyCollectionsChangePercent,
      prevYearMonthLabel,
      prevYearMonthCollected,
      thisMonthCollected,
      thisYearCollected,
      prevYearCollected,
      thisMonthExpenses,
      prevYearMonthExpenses,
      thisYearExpenses,
      prevYearExpenses,
      thisMonthProfit,
      prevYearMonthProfit,
      thisYearProfit,
      prevYearProfit,
      sameMonthLastYearProfitChangePercent,
      yearlyProfitChangePercent,
      hasData,
      periodStart,
      periodEnd,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch dashboard stats" });
  }
};

// ============= PAYMENT REMINDER OPERATIONS =============

exports.createPaymentReminder = async (req, res) => {
  try {
    const { clientId, proposalId, invoiceNumber, amountDue, currency, dueDate, reminderType, customMessage, notes } = req.body;

    if (!clientId || !amountDue) {
      return res.status(400).json({ message: "Client ID and amount due are required" });
    }

    const client = await Client.findOne(withTenant({ _id: clientId }, req));
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const reminderId = clientService.buildReminderNumber();

    const reminder = await PaymentReminder.create({
      tenantId: req.tenantId,
      reminderId,
      clientId,
      proposalId: proposalId || null,
      invoiceNumber,
      amountDue,
      currency: currency || "INR",
      dueDate,
      reminderType: reminderType || "first-reminder",
      customMessage,
      notes,
      reminderStatus: "drafted",
    });

    // Automatically send the payment reminder email
    try {
      const emailResult = await clientService.sendPaymentReminderEmail({ client, reminder, tenantId: req.tenantId });

      reminder.reminderStatus = "sent";
      reminder.sentAt = new Date();
      reminder.sentTo = client.email;
      reminder.reminderCount = 1;

      const daysToAdd = reminder.reminderType === "final-reminder" ? 7 : 3;
      reminder.nextReminderDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);

      await reminder.save();

      await logActivity(req.tenantId, clientId, "reminder_sent", `Payment reminder for ₹${amountDue} created and sent`, { reminderId: reminder._id });

      return res.status(201).json({
        message: "Payment reminder created and sent successfully",
        reminder,
        emailInfo: emailResult
      });
    } catch (emailError) {
      console.error("Error sending payment reminder email:", emailError);
      await logActivity(req.tenantId, clientId, "reminder_created", `Payment reminder for ₹${amountDue} created (email failed to send)`, { reminderId: reminder._id });
      // Still return success for reminder creation, but note the email failure
      return res.status(201).json({
        message: "Payment reminder created successfully, but failed to send email",
        reminder,
        emailError: emailError.message
      });
    }
  } catch (error) {
    console.error("Error creating payment reminder:", error);
    return res.status(500).json({ message: error.message || "Failed to create payment reminder" });
  }
};

exports.getAllReminders = async (req, res) => {
  try {
    const { clientId } = req.query;
    const filter = clientId ? { clientId } : {};
    const reminders = await PaymentReminder.find(withTenant(filter, req)).populate({ path: "clientId", select: "clientName email", options: POPULATE_SKIP_TENANT }).sort({ createdAt: -1 });

    return res.json({ reminders, total: reminders.length });
  } catch (error) {
    console.error("Error fetching reminders:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch reminders" });
  }
};

exports.sendPaymentReminder = async (req, res) => {
  try {
    const reminder = await PaymentReminder.findOne(withTenant({ _id: req.params.id }, req));
    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    const client = await Client.findOne(withTenant({ _id: reminder.clientId }, req));
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const emailResult = await clientService.sendPaymentReminderEmail({ client, reminder, tenantId: req.tenantId });

    reminder.reminderStatus = "sent";
    reminder.sentAt = new Date();
    reminder.sentTo = client.email;
    reminder.reminderCount = (reminder.reminderCount || 1) + 1;

    const daysToAdd = reminder.reminderType === "final-reminder" ? 7 : 3;
    reminder.nextReminderDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);

    await reminder.save();

    await logActivity(req.tenantId, client._id, "reminder_sent", `Payment reminder for ₹${reminder.amountDue} resent`, { reminderId: reminder._id });

    return res.json({
      message: "Payment reminder sent successfully",
      reminder,
      emailInfo: emailResult,
    });
  } catch (error) {
    console.error("Error sending payment reminder:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message || "Failed to send payment reminder" });
  }
};

exports.updatePaymentReminder = async (req, res) => {
  try {
    const updatePayload = { ...req.body };
    const reminder = await PaymentReminder.findOneAndUpdate(withTenant({ _id: req.params.id }, req), updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    return res.json({ message: "Reminder updated successfully", reminder });
  } catch (error) {
    console.error("Error updating reminder:", error);
    return res.status(500).json({ message: error.message || "Failed to update reminder" });
  }
};

exports.deletePaymentReminder = async (req, res) => {
  try {
    const reminder = await PaymentReminder.findOneAndDelete(withTenant({ _id: req.params.id }, req));
    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    return res.json({ message: "Reminder deleted successfully" });
  } catch (error) {
    console.error("Error deleting reminder:", error);
    return res.status(500).json({ message: error.message || "Failed to delete reminder" });
  }
};

// ============= PI ATTACHMENT OPERATIONS =============

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const _uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const _fileFilter = (req, file, cb) => {
  const allowed = /\.(pdf|png|jpg|jpeg|doc|docx|xls|xlsx)$/i;
  if (allowed.test(path.extname(file.originalname))) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, PNG, JPG, JPEG, DOC, DOCX, XLS, XLSX files are allowed"));
  }
};

const _upload = multer({ storage: _uploadStorage, fileFilter: _fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

exports.uploadPiAttachmentMiddleware = _upload.single("file");

exports.uploadPiAttachment = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const client = await Client.findOne(withTenant({ _id: req.params.id }, req));
    if (!client) return res.status(404).json({ message: "Client not found" });

    client.piAttachments.push({
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user.id,
    });
    await client.save();

    await logActivity(req.tenantId, client._id, "pi_uploaded", `PI attachment "${req.file.originalname}" uploaded`);

    const saved = client.piAttachments[client.piAttachments.length - 1];
    return res.status(201).json({ message: "Attachment uploaded successfully", attachment: saved });
  } catch (error) {
    console.error("Error uploading PI attachment:", error);
    return res.status(500).json({ message: error.message || "Failed to upload attachment" });
  }
};

exports.deletePiAttachment = async (req, res) => {
  try {
    const client = await Client.findOne(withTenant({ _id: req.params.id }, req));
    if (!client) return res.status(404).json({ message: "Client not found" });

    const att = client.piAttachments.id(req.params.attachmentId);
    if (!att) return res.status(404).json({ message: "Attachment not found" });

    const filePath = path.join(__dirname, "../uploads", att.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    client.piAttachments.pull(req.params.attachmentId);
    await client.save();

    await logActivity(req.tenantId, client._id, "pi_deleted", `PI attachment "${att.originalname}" deleted`);

    return res.json({ message: "Attachment deleted successfully" });
  } catch (error) {
    console.error("Error deleting PI attachment:", error);
    return res.status(500).json({ message: error.message || "Failed to delete attachment" });
  }
};
