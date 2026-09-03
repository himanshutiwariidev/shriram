const SupportMessage = require("../models/SupportMessage");
const Organization   = require("../models/Organization");
const { getSocketIO } = require("../utils/socket");

// ── helpers ──────────────────────────────────────────────────────────────────

const isSuperAdmin  = (req) => req.user?.role === "superadmin";
const isTenantAdmin = (req) => req.user?.role === "tenant_admin";

// Resolve the tenantId for the request:
//  • tenant_admin → from their own JWT (req.tenantId)
//  • superadmin   → from URL param :tenantId
function resolveTargetTenantId(req) {
  if (isSuperAdmin(req)) return req.params.tenantId;
  return req.tenantId;
}

// ── GET /api/support-chat/:tenantId/messages ─────────────────────────────────
exports.getMessages = async (req, res) => {
  try {
    const tenantId = resolveTargetTenantId(req);
    if (!tenantId) return res.status(400).json({ message: "tenantId required" });

    const messages = await SupportMessage.find({ tenantId })
      .sort({ createdAt: 1 })
      .lean();

    // Mark as read for the caller's role (background — best effort)
    if (isSuperAdmin(req)) {
      SupportMessage.updateMany({ tenantId, readBySuperAdmin: false }, { $set: { readBySuperAdmin: true } }).catch(() => {});
    } else {
      SupportMessage.updateMany({ tenantId, readByTenant: false }, { $set: { readByTenant: true } }).catch(() => {});
    }

    return res.json({ messages });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to fetch messages" });
  }
};

// ── POST /api/support-chat/:tenantId/messages ────────────────────────────────
exports.sendMessage = async (req, res) => {
  try {
    const tenantId = resolveTargetTenantId(req);
    if (!tenantId) return res.status(400).json({ message: "tenantId required" });

    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ message: "body is required" });

    const role = isSuperAdmin(req) ? "superadmin" : "tenant_admin";

    const msg = await SupportMessage.create({
      tenantId,
      senderId:   req.user.id,
      senderRole: role,
      senderName: req.user.name || req.user.email || role,
      body: body.trim(),
      // The sender's own side is always read; the other side starts unread
      readBySuperAdmin: role === "superadmin",
      readByTenant:     role === "tenant_admin",
    });

    const io = getSocketIO();
    if (io) {
      // Notify the tenant's chat window
      io.to(`support:${tenantId}`).emit("support:message", msg);
      // Also notify the superadmin inbox so their unread badge updates
      io.to("superadmin:support").emit("support:new", { tenantId, message: msg });
    }

    return res.status(201).json({ message: msg });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to send message" });
  }
};

// ── POST /api/support-chat/:tenantId/mark-read ───────────────────────────────
exports.markRead = async (req, res) => {
  try {
    const tenantId = resolveTargetTenantId(req);
    if (!tenantId) return res.status(400).json({ message: "tenantId required" });

    if (isSuperAdmin(req)) {
      await SupportMessage.updateMany({ tenantId, readBySuperAdmin: false }, { $set: { readBySuperAdmin: true } });
    } else {
      await SupportMessage.updateMany({ tenantId, readByTenant: false }, { $set: { readByTenant: true } });
    }

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to mark read" });
  }
};

// ── GET /api/support-chat/conversations (superadmin only) ────────────────────
// Returns all tenants that have at least one support message, with:
//   - last message preview
//   - unread count (messages NOT read by superadmin)
//   - tenant name
exports.getConversations = async (req, res) => {
  try {
    if (!isSuperAdmin(req)) return res.status(403).json({ message: "Superadmin only" });

    const rows = await SupportMessage.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$tenantId",
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: { $cond: [{ $eq: ["$readBySuperAdmin", false] }, 1, 0] },
          },
          totalMessages: { $sum: 1 },
        },
      },
      { $sort: { "lastMessage.createdAt": -1 } },
    ]);

    // Attach tenant names
    const orgIds = rows.map((r) => r._id);
    const orgs   = await Organization.find({ _id: { $in: orgIds } }).select("name logoUrl").lean();
    const orgMap  = {};
    orgs.forEach((o) => { orgMap[o._id.toString()] = o; });

    const conversations = rows.map((r) => ({
      tenantId:      r._id,
      tenantName:    orgMap[r._id.toString()]?.name || "Unknown",
      lastMessage:   r.lastMessage,
      unreadCount:   r.unreadCount,
      totalMessages: r.totalMessages,
    }));

    return res.json({ conversations });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to fetch conversations" });
  }
};

// ── GET /api/support-chat/unread-count (tenant_admin only) ───────────────────
// Unread count for the tenant (messages from superadmin not yet read by tenant)
exports.getTenantUnreadCount = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ message: "Tenant context required" });

    const count = await SupportMessage.countDocuments({
      tenantId,
      senderRole: "superadmin",
      readByTenant: false,
    });

    return res.json({ count });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get unread count" });
  }
};
