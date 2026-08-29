const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getRooms, getMessages, sendMessage, openDm, getUnreadCounts, getTenantUsers } = require("../controllers/chatController");

router.get("/rooms", authMiddleware, getRooms);
router.get("/rooms/:roomId/messages", authMiddleware, getMessages);
router.post("/messages", authMiddleware, sendMessage);
router.post("/dm", authMiddleware, openDm);
router.get("/unread", authMiddleware, getUnreadCounts);
router.get("/users", authMiddleware, getTenantUsers);

module.exports = router;
