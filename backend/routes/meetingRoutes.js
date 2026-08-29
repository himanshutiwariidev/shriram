const express = require("express");
const router = express.Router();

const {
  getMeetings,
  getMyMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
} = require("../controllers/meetingController");

const authMiddleware = require("../middleware/authMiddleware");
const checkFeature = require("../middleware/checkFeature");

// Unlike Task (admin-gated mutations), a meeting scheduler is inherently
// collaborative — any authenticated tenant staff role can view the shared
// calendar and create/update/delete meetings, not just admins.
router.get("/", authMiddleware, checkFeature("meetings"), getMeetings);
router.post("/", authMiddleware, checkFeature("meetings"), createMeeting);
router.put("/:id", authMiddleware, checkFeature("meetings"), updateMeeting);
router.delete("/:id", authMiddleware, checkFeature("meetings"), deleteMeeting);

// Dashboard widgets + client-portal read-only view (client role included).
router.get("/mine", authMiddleware, checkFeature("meetings"), getMyMeetings);

module.exports = router;
