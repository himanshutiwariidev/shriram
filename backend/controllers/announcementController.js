const Announcement = require("../models/Announcement");
const { withTenant, POPULATE_SKIP_TENANT } = require("../utils/tenantQuery");
const { getSocketIO } = require("../utils/socket");

const populateAnnouncement = (q) =>
  q.populate({ path: "createdBy", select: "name email", options: POPULATE_SKIP_TENANT });

// Admin: create announcement, broadcast via socket
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, body, priority, audienceType, targetRoles, targetBranches, expiresAt } = req.body;
    const announcement = await Announcement.create({
      tenantId: req.tenantId,
      title, body, priority: priority || "info",
      audienceType: audienceType || "all",
      targetRoles: targetRoles || [],
      targetBranches: targetBranches || [],
      expiresAt: expiresAt || null,
      createdBy: req.user.id,
    });

    const io = getSocketIO();
    if (io) io.to(`tenant:${req.tenantId}`).emit("announcement:new", announcement);

    return res.status(201).json({ announcement });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create announcement" });
  }
};

// Admin: list all (paginated)
exports.getAnnouncements = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const announcements = await populateAnnouncement(
      Announcement.find(withTenant({}, req))
        .sort({ createdAt: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit)
    );
    const total = await Announcement.countDocuments(withTenant({}, req));
    return res.json({ announcements, total });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to fetch announcements" });
  }
};

// All employees: get active announcements visible to them
exports.getMyAnnouncements = async (req, res) => {
  try {
    const now = new Date();
    const filter = {
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    };

    const all = await populateAnnouncement(
      Announcement.find(withTenant(filter, req)).sort({ createdAt: -1 }).limit(50)
    );

    const { role, branchId } = req.user;
    const visible = all.filter((a) => {
      if (a.audienceType === "all") return true;
      if (a.audienceType === "roles") return a.targetRoles.includes(role);
      if (a.audienceType === "branches") return a.targetBranches.some((b) => b.toString() === branchId?.toString());
      return false;
    });

    return res.json({ announcements: visible });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to fetch announcements" });
  }
};

// Admin: update
exports.updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findOneAndUpdate(
      withTenant({ _id: req.params.id }, req),
      req.body,
      { new: true }
    );
    if (!announcement) return res.status(404).json({ message: "Announcement not found" });
    return res.json({ announcement });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update announcement" });
  }
};

// Admin: delete
exports.deleteAnnouncement = async (req, res) => {
  try {
    const deleted = await Announcement.findOneAndDelete(withTenant({ _id: req.params.id }, req));
    if (!deleted) return res.status(404).json({ message: "Announcement not found" });
    return res.json({ message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete announcement" });
  }
};
