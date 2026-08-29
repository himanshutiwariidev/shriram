const Meeting = require("../models/Meeting");
const User = require("../models/User");
const { withTenant, POPULATE_SKIP_TENANT } = require("../utils/tenantQuery");
const { notifyUsers } = require("../utils/notificationHelper");

const populateMeeting = (query) =>
  query
    .populate({ path: "participants", select: "name email profileImage", options: POPULATE_SKIP_TENANT })
    .populate({ path: "createdBy", select: "name email", options: POPULATE_SKIP_TENANT })
    .populate({ path: "clientId", select: "clientName companyName", options: POPULATE_SKIP_TENANT });

// Range-filtered for the calendar view (?start=&end=) — any authenticated
// tenant staff role can see the shared team calendar, not just admins;
// unlike Task/Leave, a meeting scheduler is inherently collaborative.
exports.getMeetings = async (req, res) => {
  try {
    const { start, end } = req.query;
    const filter = {};
    if (start || end) {
      filter.startTime = {};
      if (start) filter.startTime.$gte = new Date(start);
      if (end) filter.startTime.$lte = new Date(end);
    }
    const meetings = await populateMeeting(Meeting.find(withTenant(filter, req))).sort({ startTime: 1 });
    return res.json({ meetings });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch meetings" });
  }
};

// Powers dashboard widgets (Today's/Upcoming/Next Meeting) and the
// client-portal read-only view — scoped to meetings the caller is actually
// part of, either as a staff participant or, for role==="client", as the
// linked client. Mirrors clientController.js's getMyProject lookup pattern.
exports.getMyMeetings = async (req, res) => {
  try {
    let filter;
    if (req.user.role === "client") {
      const user = await User.findOne(withTenant({ _id: req.user.id }, req));
      if (!user || !user.clientId) {
        return res.status(404).json({ message: "No linked client account found" });
      }
      filter = { clientId: user.clientId };
    } else {
      // Also include meetings the caller created but didn't add themselves
      // to as a participant — otherwise a meeting you just scheduled can
      // fail to show up on your own dashboard.
      filter = { $or: [{ participants: req.user.id }, { createdBy: req.user.id }] };
    }
    const meetings = await populateMeeting(Meeting.find(withTenant(filter, req))).sort({ startTime: 1 });
    return res.json({ meetings });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch meetings" });
  }
};

exports.createMeeting = async (req, res) => {
  try {
    const { title, description, startTime, endTime, location, participants, clientId, reminderMinutesBefore } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({ message: "Title, start time, and end time are required" });
    }
    if (new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({ message: "End time must be after start time" });
    }

    const meeting = await Meeting.create({
      tenantId: req.tenantId,
      title,
      description,
      startTime,
      endTime,
      location,
      participants: Array.isArray(participants) ? participants : [],
      clientId: clientId || undefined,
      createdBy: req.user.id,
      reminderMinutesBefore,
    });

    const recipientIds = (meeting.participants || []).map((id) => id.toString()).filter((id) => id !== req.user.id);
    if (recipientIds.length > 0) {
      await notifyUsers(
        req.tenantId,
        recipientIds,
        "meeting",
        "New meeting scheduled",
        `"${title}" is scheduled for ${new Date(startTime).toLocaleString()}`,
        "/dashboard?tab=meetings",
        { meetingId: meeting._id }
      );
    }

    const populated = await populateMeeting(Meeting.findOne(withTenant({ _id: meeting._id }, req)));
    return res.status(201).json({ message: "Meeting created", meeting: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to create meeting" });
  }
};

// Also used for drag-and-drop reschedule on the calendar — just a
// startTime/endTime patch through the same endpoint.
exports.updateMeeting = async (req, res) => {
  try {
    const { title, description, startTime, endTime, location, participants, clientId, status, reminderMinutesBefore } = req.body;

    const meeting = await Meeting.findOne(withTenant({ _id: req.params.id }, req));
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    if (title !== undefined) meeting.title = title;
    if (description !== undefined) meeting.description = description;
    if (startTime !== undefined) meeting.startTime = startTime;
    if (endTime !== undefined) meeting.endTime = endTime;
    if (location !== undefined) meeting.location = location;
    if (Array.isArray(participants)) meeting.participants = participants;
    if (clientId !== undefined) meeting.clientId = clientId || undefined;
    if (status !== undefined) meeting.status = status;
    if (reminderMinutesBefore !== undefined) meeting.reminderMinutesBefore = reminderMinutesBefore;

    await meeting.save();

    const recipientIds = (meeting.participants || []).map((id) => id.toString()).filter((id) => id !== req.user.id);
    if (recipientIds.length > 0) {
      await notifyUsers(
        req.tenantId,
        recipientIds,
        "meeting",
        "Meeting updated",
        `"${meeting.title}" was updated — now ${new Date(meeting.startTime).toLocaleString()}`,
        "/dashboard?tab=meetings",
        { meetingId: meeting._id }
      );
    }

    const populated = await populateMeeting(Meeting.findOne(withTenant({ _id: meeting._id }, req)));
    return res.json({ message: "Meeting updated", meeting: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to update meeting" });
  }
};

exports.deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOneAndDelete(withTenant({ _id: req.params.id }, req));
    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }
    return res.json({ message: "Meeting deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to delete meeting" });
  }
};
