const ReviewCycle = require("../models/ReviewCycle");
const Appraisal = require("../models/Appraisal");
const User = require("../models/User");
const { withTenant, POPULATE_SKIP_TENANT } = require("../utils/tenantQuery");
const { notifyUser, notifyUsers } = require("../utils/notificationHelper");

const populateAppraisal = (q) =>
  q
    .populate({ path: "employeeId", select: "name email designation", options: POPULATE_SKIP_TENANT })
    .populate({ path: "reviewerId", select: "name", options: POPULATE_SKIP_TENANT });

// ─── CYCLES (HR / Admin) ──────────────────────────────────────────────────────

exports.getCycles = async (req, res) => {
  try {
    const cycles = await ReviewCycle.find(withTenant({}, req))
      .populate({ path: "createdBy", select: "name", options: POPULATE_SKIP_TENANT })
      .sort({ createdAt: -1 });
    return res.json({ cycles });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to fetch cycles" });
  }
};

exports.createCycle = async (req, res) => {
  try {
    const { title, period, year, quarter, startDate, endDate, goals } = req.body;
    if (!title || !period || !year || !startDate || !endDate) {
      return res.status(400).json({ message: "title, period, year, startDate, endDate required" });
    }
    const cycle = await ReviewCycle.create({
      tenantId: req.tenantId,
      title, period, year, quarter: quarter || null,
      startDate, endDate,
      goals: goals || [],
      createdBy: req.user.id,
      status: "draft",
    });
    return res.status(201).json({ cycle });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create cycle" });
  }
};

// Open a cycle: auto-create Appraisal docs for all active employees and notify them
exports.openCycle = async (req, res) => {
  try {
    const cycle = await ReviewCycle.findOneAndUpdate(
      withTenant({ _id: req.params.id }, req),
      { status: "open" },
      { new: true }
    );
    if (!cycle) return res.status(404).json({ message: "Cycle not found" });

    const employees = await User.find(
      withTenant({ role: { $in: ["user", "hr", "sales"] }, isActive: true }, req)
    ).select("_id");

    // Upsert one Appraisal per employee (idempotent if re-opened)
    const docs = employees.map((e) => ({
      updateOne: {
        filter: { tenantId: req.tenantId, cycleId: cycle._id, employeeId: e._id },
        update: { $setOnInsert: { tenantId: req.tenantId, cycleId: cycle._id, employeeId: e._id, status: "pending", goalResponses: (cycle.goals || []).map((g) => ({ goal: g, selfResponse: "" })) } },
        upsert: true,
      },
    }));
    if (docs.length) await Appraisal.bulkWrite(docs);

    await notifyUsers(
      req.tenantId,
      employees.map((e) => e._id),
      "task",
      "Performance review started",
      `A new review cycle "${cycle.title}" is open. Please complete your self-assessment.`,
      "/dashboard?tab=appraisal",
      { cycleId: cycle._id }
    );

    return res.json({ cycle, employeesNotified: employees.length });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to open cycle" });
  }
};

exports.closeCycle = async (req, res) => {
  try {
    const cycle = await ReviewCycle.findOneAndUpdate(
      withTenant({ _id: req.params.id }, req),
      { status: "closed" },
      { new: true }
    );
    if (!cycle) return res.status(404).json({ message: "Cycle not found" });
    return res.json({ cycle });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to close cycle" });
  }
};

exports.deleteCycle = async (req, res) => {
  try {
    await ReviewCycle.findOneAndDelete(withTenant({ _id: req.params.id }, req));
    await Appraisal.deleteMany(withTenant({ cycleId: req.params.id }, req));
    return res.json({ message: "Deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete cycle" });
  }
};

// ─── APPRAISALS (Admin/HR: all; Employee: own) ───────────────────────────────

exports.getAppraisals = async (req, res) => {
  try {
    const { cycleId } = req.query;
    const filter = cycleId ? { cycleId } : {};
    const appraisals = await populateAppraisal(
      Appraisal.find(withTenant(filter, req))
    ).sort({ createdAt: -1 });
    return res.json({ appraisals });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to fetch appraisals" });
  }
};

// Employee: list own appraisals
exports.getMyAppraisals = async (req, res) => {
  try {
    const appraisals = await Appraisal.find(withTenant({ employeeId: req.user.id }, req))
      .populate({ path: "cycleId", select: "title period year quarter status", options: POPULATE_SKIP_TENANT })
      .sort({ createdAt: -1 });
    return res.json({ appraisals });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to fetch appraisals" });
  }
};

// Employee: submit self-assessment
exports.selfAssess = async (req, res) => {
  try {
    const { selfRating, selfComment, goalResponses } = req.body;
    const appraisal = await Appraisal.findOneAndUpdate(
      withTenant({ _id: req.params.id, employeeId: req.user.id }, req),
      { selfRating, selfComment, goalResponses, status: "self_assessed" },
      { new: true }
    );
    if (!appraisal) return res.status(404).json({ message: "Appraisal not found" });
    return res.json({ appraisal });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to submit self-assessment" });
  }
};

// Manager/HR: submit manager review
exports.managerReview = async (req, res) => {
  try {
    const { managerRating, managerComment, finalRating, salaryRevisionFlag, salaryRevisionPercent } = req.body;
    const appraisal = await Appraisal.findOneAndUpdate(
      withTenant({ _id: req.params.id }, req),
      {
        managerRating, managerComment, finalRating,
        salaryRevisionFlag: !!salaryRevisionFlag,
        salaryRevisionPercent: salaryRevisionPercent || 0,
        reviewerId: req.user.id,
        reviewedAt: new Date(),
        status: "reviewed",
      },
      { new: true }
    ).populate({ path: "employeeId", select: "_id name", options: POPULATE_SKIP_TENANT });

    if (!appraisal) return res.status(404).json({ message: "Appraisal not found" });

    // Notify employee
    await notifyUser(
      req.tenantId, appraisal.employeeId._id, "task",
      "Performance review completed",
      `Your performance review has been completed. Final rating: ${finalRating}/5${salaryRevisionFlag ? " — Salary revision flagged." : ""}`,
      "/dashboard?tab=appraisal",
      { appraisalId: appraisal._id }
    );

    return res.json({ appraisal });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to submit manager review" });
  }
};
