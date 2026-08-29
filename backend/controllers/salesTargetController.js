const mongoose = require("mongoose");
const SalesTarget = require("../models/SalesTarget");
const Proposal    = require("../models/Proposal");
const asyncHandler = require("../utils/asyncHandler");
const { withTenant } = require("../utils/tenantQuery");

// ── GET /api/sales-targets/summary ──────────────────────────────────────────
// Returns every target for the requested period, decorated with the achieved
// amount (sum of proposal payments whose paymentDate falls in the window and
// whose client has a matching salesPerson).
exports.getSummary = asyncHandler(async (req, res) => {
  const period  = req.query.period  || "monthly";
  const yr      = parseInt(req.query.year,    10) || new Date().getFullYear();
  const mo      = parseInt(req.query.month,   10) || new Date().getMonth() + 1;
  const q       = parseInt(req.query.quarter, 10) || Math.ceil(mo / 3);

  // Date window for payment filtering
  let start, end;
  if (period === "monthly") {
    start = new Date(yr, mo - 1, 1);
    end   = new Date(yr, mo,     1);
  } else {
    start = new Date(yr, (q - 1) * 3, 1);
    end   = new Date(yr, q * 3,       1);
  }

  // Targets stored for this period
  const periodFilter = period === "monthly"
    ? { period, year: yr, month: mo }
    : { period, year: yr, quarter: q };

  const targets = await SalesTarget.find(withTenant(periodFilter, req))
    .populate("userId", "name email profileImage");

  // Aggregate payments from proposals, grouped by client.salesPerson
  const achieved = await Proposal.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(req.tenantId) } },
    { $unwind: { path: "$payments", preserveNullAndEmptyArrays: false } },
    {
      $match: {
        "payments.paymentDate": { $gte: start, $lt: end },
      },
    },
    {
      $lookup: {
        from: "clients",
        localField: "clientId",
        foreignField: "_id",
        as: "client",
      },
    },
    { $unwind: { path: "$client", preserveNullAndEmptyArrays: false } },
    { $match: { "client.salesPerson": { $exists: true, $ne: null } } },
    {
      $group: {
        _id: "$client.salesPerson",
        achieved: { $sum: "$payments.amount" },
      },
    },
  ]);

  const achievedMap = new Map(
    achieved.map((a) => [a._id.toString(), a.achieved])
  );

  const summary = targets.map((t) => {
    const achievedAmt = achievedMap.get(t.userId?._id?.toString()) || 0;
    const pct = t.targetAmount > 0
      ? Math.round((achievedAmt / t.targetAmount) * 100)
      : 0;
    const commissionEarned = Math.round(achievedAmt * (t.commissionRate / 100));
    const status =
      pct >= 100 ? "exceeded" :
      pct >= 70  ? "on-track" :
                   "behind";

    return {
      _id:             t._id,
      userId:          t.userId?._id,
      userName:        t.userId?.name   || "—",
      userEmail:       t.userId?.email  || "",
      targetAmount:    t.targetAmount,
      commissionRate:  t.commissionRate,
      notes:           t.notes,
      achieved:        achievedAmt,
      commissionEarned,
      progressPct:     pct,
      status,
    };
  });

  // Sort: exceeded first, then on-track, then behind, then by achieved desc
  const ORDER = { exceeded: 0, "on-track": 1, behind: 2 };
  summary.sort((a, b) =>
    (ORDER[a.status] ?? 3) - (ORDER[b.status] ?? 3) ||
    b.achieved - a.achieved
  );

  return res.json({ period, year: yr, month: mo, quarter: q, summary });
});

// ── POST /api/sales-targets ──────────────────────────────────────────────────
// Upserts a target — if one already exists for (userId, period, year, month/quarter)
// it is updated, otherwise created.
exports.upsertTarget = asyncHandler(async (req, res) => {
  const { userId, period, year, month, quarter, targetAmount, commissionRate, notes } = req.body;

  if (!userId || !targetAmount || !period || !year) {
    return res.status(400).json({ message: "userId, period, year, and targetAmount are required" });
  }

  const filter = withTenant(
    {
      userId,
      period,
      year: Number(year),
      ...(period === "monthly"   ? { month:   Number(month)   } : {}),
      ...(period === "quarterly" ? { quarter: Number(quarter) } : {}),
    },
    req
  );

  const update = {
    $set: {
      targetAmount:   Number(targetAmount),
      commissionRate: Number(commissionRate ?? 0),
      notes:          notes || "",
    },
    $setOnInsert: { tenantId: req.tenantId, userId, period, year: Number(year) },
  };

  const target = await SalesTarget.findOneAndUpdate(filter, update, {
    upsert: true,
    new: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  });

  return res.status(200).json({ message: "Target saved", target });
});

// ── DELETE /api/sales-targets/:id ────────────────────────────────────────────
exports.deleteTarget = asyncHandler(async (req, res) => {
  await SalesTarget.findOneAndDelete(withTenant({ _id: req.params.id }, req));
  return res.json({ message: "Target removed" });
});
