const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/authMiddleware");
const {
  getMessages,
  sendMessage,
  markRead,
  getConversations,
  getTenantUnreadCount,
} = require("../controllers/supportChatController");

// Superadmin: list all tenant conversations
router.get("/conversations", auth, getConversations);

// Tenant admin: unread count (messages from superadmin)
router.get("/unread-count", auth, getTenantUnreadCount);

// Per-tenant conversation (accessible by both tenant_admin owning that tenant AND superadmin)
router.get("/:tenantId/messages",  auth, getMessages);
router.post("/:tenantId/messages", auth, sendMessage);
router.post("/:tenantId/mark-read", auth, markRead);

module.exports = router;
