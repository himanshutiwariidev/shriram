const mongoose = require("mongoose");
const Message = require("../models/Message");
const Department = require("../models/Department");
const Project = require("../models/Project");
const User = require("../models/User");
const { withTenant, POPULATE_SKIP_TENANT } = require("../utils/tenantQuery");
const { getSocketIO } = require("../utils/socket");

// Build the deterministic DM room ID from two user IDs
const dmRoomId = (a, b) => {
  const ids = [a.toString(), b.toString()].sort();
  return `dm:${ids[0]}_${ids[1]}`;
};

// Returns list of rooms the caller has access to:
//   - All department rooms (departments they belong to or all if admin)
//   - All project rooms (projects they are a member of or all if admin)
//   - Their DM conversations (any room that has ≥1 message in it for this user)
exports.getRooms = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";

    // Department rooms
    const deptFilter = isAdmin ? {} : { members: req.user.id };
    const departments = await Department.find(withTenant(deptFilter, req)).select("name").lean();
    const deptRooms = departments.map((d) => ({
      id: `department:${d._id}`,
      label: d.name,
      type: "department",
    }));

    // Project rooms
    const projFilter = isAdmin ? {} : { members: req.user.id };
    const projects = await Project.find(withTenant(projFilter, req)).select("name").lean();
    const projectRooms = projects.map((p) => ({
      id: `project:${p._id}`,
      label: p.name,
      type: "project",
    }));

    // DM rooms — any DM message where sender or recipient is this user
    const myId = req.user.id.toString();
    const dmMessages = await Message.find(
      withTenant({ roomId: /^dm:/ }, req)
    )
      .sort({ createdAt: -1 })
      .select("roomId senderId")
      .lean();

    const dmRoomMap = {};
    for (const m of dmMessages) {
      if (m.roomId.includes(myId) && !dmRoomMap[m.roomId]) {
        dmRoomMap[m.roomId] = true;
      }
    }

    // Resolve display names for DM rooms
    const dmRoomIds = Object.keys(dmRoomMap);
    const dmRoomList = [];
    for (const rid of dmRoomIds) {
      const parts = rid.replace("dm:", "").split("_");
      const otherId = parts.find((p) => p !== myId);
      if (!otherId) continue;
      const other = await User.findById(otherId)
        .select("name email profileImage")
        .setOptions({ skipTenantScope: true });
      if (other) {
        dmRoomList.push({ id: rid, label: other.name || other.email, type: "dm", otherId });
      }
    }

    return res.json({ rooms: [...deptRooms, ...projectRooms, ...dmRoomList] });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to fetch rooms" });
  }
};

// Get messages for a room (paginated, oldest-first for display)
exports.getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { before, limit = 50 } = req.query;

    const filter = { roomId };
    if (before) filter.createdAt = { $lt: new Date(before) };

    const messages = await Message.find(withTenant(filter, req))
      .populate({ path: "senderId", select: "name email profileImage", options: POPULATE_SKIP_TENANT })
      .sort({ createdAt: -1 })
      .limit(+limit)
      .lean();

    // Mark unread as read (best-effort)
    Message.updateMany(
      withTenant({ roomId, readBy: { $ne: req.user.id } }, req),
      { $addToSet: { readBy: req.user.id } }
    ).catch(() => {});

    return res.json({ messages: messages.reverse() });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to fetch messages" });
  }
};

// Send a message to a room
exports.sendMessage = async (req, res) => {
  try {
    const { roomId, body } = req.body;
    if (!roomId || !body?.trim()) {
      return res.status(400).json({ message: "roomId and body are required" });
    }

    const message = await Message.create({
      tenantId: req.tenantId,
      roomId,
      senderId: req.user.id,
      body: body.trim(),
      readBy: [req.user.id],
    });

    const populated = await Message.findById(message._id)
      .populate({ path: "senderId", select: "name email profileImage", options: POPULATE_SKIP_TENANT })
      .setOptions({ skipTenantScope: true });

    const io = getSocketIO();
    if (io) io.to(`chat:${req.tenantId}:${roomId}`).emit("chat:message", populated);

    return res.status(201).json({ message: populated });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to send message" });
  }
};

// Start or open a DM with another user — returns the deterministic roomId
exports.openDm = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId required" });

    const other = await User.findById(userId)
      .select("name email profileImage")
      .setOptions({ skipTenantScope: true });
    if (!other) return res.status(404).json({ message: "User not found" });

    const roomId = dmRoomId(req.user.id, userId);
    return res.json({ roomId, label: other.name || other.email, otherId: userId });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to open DM" });
  }
};

// Unread counts per room (used for badge display)
exports.getUnreadCounts = async (req, res) => {
  try {
    const counts = await Message.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(req.tenantId), readBy: { $ne: new mongoose.Types.ObjectId(req.user.id) } } },
      { $group: { _id: "$roomId", count: { $sum: 1 } } },
    ]);
    const result = {};
    counts.forEach((c) => { result[c._id] = c.count; });
    return res.json({ counts: result });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to fetch unread counts" });
  }
};

// Get all tenant users (for DM target selection)
exports.getTenantUsers = async (req, res) => {
  try {
    const users = await User.find(withTenant({ _id: { $ne: req.user.id } }, req))
      .select("name email profileImage role")
      .sort({ name: 1 })
      .lean();
    return res.json({ users });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to fetch users" });
  }
};
