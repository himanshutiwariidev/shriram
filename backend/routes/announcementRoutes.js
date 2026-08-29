const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");
const {
  createAnnouncement,
  getAnnouncements,
  getMyAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
} = require("../controllers/announcementController");

// Any authenticated employee can read announcements visible to them
router.get("/mine", authMiddleware, getMyAnnouncements);

// Admin management
router.get("/", authMiddleware, adminOnly, getAnnouncements);
router.post("/", authMiddleware, adminOnly, createAnnouncement);
router.put("/:id", authMiddleware, adminOnly, updateAnnouncement);
router.delete("/:id", authMiddleware, adminOnly, deleteAnnouncement);

module.exports = router;
