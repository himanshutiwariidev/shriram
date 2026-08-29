const LeavePolicy = require("../models/LeavePolicy");
const LeaveBalance = require("../models/LeaveBalance");
const Leave = require("../models/Leave");
const User = require("../models/User");
const { withTenant, POPULATE_SKIP_TENANT } = require("../utils/tenantQuery");

// ─── POLICY ──────────────────────────────────────────────────────────────────

exports.getPolicies = async (req, res) => {
  try {
    const policies = await LeavePolicy.find(withTenant({}, req)).sort({ leaveType: 1 });
    return res.json({ policies });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to fetch policies" });
  }
};

exports.upsertPolicy = async (req, res) => {
  try {
    const { leaveType, annualQuota, carryForward, maxCarryForward } = req.body;
    if (!leaveType) return res.status(400).json({ message: "leaveType required" });
    const policy = await LeavePolicy.findOneAndUpdate(
      withTenant({ leaveType }, req),
      { annualQuota, carryForward: !!carryForward, maxCarryForward: maxCarryForward || 0 },
      { upsert: true, new: true }
    );
    return res.json({ policy });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to save policy" });
  }
};

// ─── BALANCE ─────────────────────────────────────────────────────────────────

// Helper: get or create balance doc for a user+year, seeded from current policies
const getOrInitBalance = async (tenantId, userId, year, req) => {
  let balance = await LeaveBalance.findOne({ tenantId, userId, year });
  if (!balance) {
    const policies = await LeavePolicy.find(withTenant({}, req));
    const init = { tenantId, userId, year };
    policies.forEach((p) => {
      init[p.leaveType] = { quota: p.annualQuota, used: 0, carryForward: 0 };
    });
    if (!init.casual) init.casual = { quota: 12, used: 0, carryForward: 0 };
    if (!init.sick)   init.sick   = { quota: 6,  used: 0, carryForward: 0 };
    if (!init.earned) init.earned = { quota: 15, used: 0, carryForward: 0 };
    balance = await LeaveBalance.create(init);
  }
  return balance;
};

// Employee: get own balance
exports.getMyBalance = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const balance = await getOrInitBalance(req.tenantId, req.user.id, year, req);
    return res.json({ balance });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to fetch balance" });
  }
};

// Admin/HR: get all employees' balances for a year
exports.getAllBalances = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const employees = await User.find(withTenant({ role: { $in: ["user", "hr", "sales"] }, isActive: true }, req))
      .select("name email role designation").lean();

    const results = await Promise.all(employees.map(async (emp) => {
      const balance = await getOrInitBalance(req.tenantId, emp._id, year, req);
      return { employee: emp, balance };
    }));

    return res.json({ balances: results, year });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to fetch balances" });
  }
};

// Admin/HR: manually adjust balance (e.g. credit earned leave)
exports.adjustBalance = async (req, res) => {
  try {
    const { userId, year, leaveType, field, value } = req.body;
    if (!userId || !leaveType || !field) return res.status(400).json({ message: "userId, leaveType, field required" });
    const y = year || new Date().getFullYear();
    const balance = await getOrInitBalance(req.tenantId, userId, y, req);
    if (!["quota", "used", "carryForward"].includes(field)) return res.status(400).json({ message: "Invalid field" });
    balance[leaveType][field] = Number(value);
    await balance.save();
    return res.json({ balance });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to adjust balance" });
  }
};

// Called internally when a leave is approved — deducts from balance
exports.deductLeave = async (tenantId, userId, leaveType, days, req) => {
  try {
    const year = new Date().getFullYear();
    const balance = await LeaveBalance.findOne({ tenantId, userId, year });
    if (!balance) return; // no policy = no enforcement
    const lt = leaveType && ["casual","sick","earned"].includes(leaveType) ? leaveType : "casual";
    const available = (balance[lt].quota + balance[lt].carryForward) - balance[lt].used;
    if (available < days) return false; // caller should reject
    balance[lt].used += days;
    await balance.save();
    return true;
  } catch {
    return true; // fail open — don't block approval on balance error
  }
};

// Check available days (returns available or -1 if no policy)
exports.checkAvailable = async (tenantId, userId, leaveType, days, req) => {
  try {
    const year = new Date().getFullYear();
    const balance = await LeaveBalance.findOne({ tenantId, userId, year });
    if (!balance) return true; // no policy = allow
    const lt = leaveType && ["casual","sick","earned"].includes(leaveType) ? leaveType : "casual";
    const available = (balance[lt].quota + balance[lt].carryForward) - balance[lt].used;
    return available >= days;
  } catch {
    return true;
  }
};
