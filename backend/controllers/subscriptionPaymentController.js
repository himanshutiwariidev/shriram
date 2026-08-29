const crypto = require("crypto");
const Razorpay = require("razorpay");
const Organization = require("../models/Organization");
const SubscriptionPayment = require("../models/SubscriptionPayment");

const getRazorpay = () =>
  new Razorpay({
    key_id:    process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

// Monthly price in ₹ per plan
const PLAN_PRICES = {
  starter:      999,
  professional: 2499,
  business:     4999,
  enterprise:   9999,
};

// Duration (months) → discount fraction
const DURATION_DISCOUNT = { 1: 0, 3: 0.05, 6: 0.10, 12: 0.15 };

const calcAmount = (planName, months) => {
  const monthly = PLAN_PRICES[planName];
  if (!monthly) return null;
  const discount = DURATION_DISCOUNT[months] ?? 0;
  return Math.round(monthly * months * (1 - discount));
};

exports.getPlanPricing = (_req, res) => {
  res.json({ prices: PLAN_PRICES, discounts: DURATION_DISCOUNT });
};

// POST /api/subscription/create-order  (authForRenewal — works even when org is expired)
exports.createOrder = async (req, res) => {
  try {
    const { planName, durationMonths } = req.body;
    if (!PLAN_PRICES[planName])
      return res.status(400).json({ message: "Invalid plan selected" });

    const dur = parseInt(durationMonths, 10);
    if (![1, 3, 6, 12].includes(dur))
      return res.status(400).json({ message: "Duration must be 1, 3, 6, or 12 months" });

    const amount      = calcAmount(planName, dur);
    const amountPaise = amount * 100;

    const org = await Organization.findById(req.tenantId).select("name");

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount:   amountPaise,
      currency: "INR",
      receipt:  `rnw_${req.tenantId}_${Date.now()}`,
      notes: {
        tenantId:      req.tenantId.toString(),
        planName,
        durationMonths: dur,
        orgName:       org?.name || "",
      },
    });

    await SubscriptionPayment.create({
      tenantId:         req.tenantId,
      organizationName: org?.name || "",
      orderId:          order.id,
      amount,
      amountPaise,
      planName,
      durationMonths:   dur,
      renewedBy:        req.user._id,
      status:           "created",
    });

    res.json({
      orderId:  order.id,
      amount:   amountPaise,
      currency: "INR",
      keyId:    process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("createOrder error:", err);
    res.status(500).json({ message: err.message || "Failed to create order" });
  }
};

// POST /api/subscription/verify  (authForRenewal — works even when org is expired)
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;
    if (!orderId || !paymentId || !signature)
      return res.status(400).json({ message: "Missing payment verification fields" });

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (expected !== signature)
      return res.status(400).json({ message: "Invalid payment signature — possible tampering" });

    const payment = await SubscriptionPayment.findOne({ orderId, tenantId: req.tenantId });
    if (!payment) return res.status(404).json({ message: "Order not found" });
    if (payment.status === "paid") return res.json({ message: "Already verified", alreadyDone: true });

    const org = await Organization.findById(req.tenantId);
    const now = new Date();

    // Extend from current expiry when still valid; otherwise from today
    const base = org?.subscriptionExpiresAt && org.subscriptionExpiresAt > now
      ? new Date(org.subscriptionExpiresAt)
      : new Date(now);
    base.setMonth(base.getMonth() + payment.durationMonths);
    const newExpiry = base;

    const updateFields = {
      status:               "active",
      planName:             payment.planName,
      subscriptionExpiresAt: newExpiry,
    };
    if (!org?.subscriptionStartDate) updateFields.subscriptionStartDate = now;

    await Organization.findByIdAndUpdate(req.tenantId, { $set: updateFields });

    payment.paymentId   = paymentId;
    payment.signature   = signature;
    payment.status      = "paid";
    payment.paidAt      = now;
    payment.newExpiresAt = newExpiry;
    await payment.save();

    res.json({ message: "Payment verified successfully", newExpiresAt: newExpiry });
  } catch (err) {
    console.error("verifyPayment error:", err);
    res.status(500).json({ message: err.message || "Verification failed" });
  }
};

// GET /api/superadmin/payments  (superadmin only)
exports.getAllPayments = async (_req, res) => {
  try {
    const [payments, totalRevResult] = await Promise.all([
      SubscriptionPayment.find()
        .sort({ createdAt: -1 })
        .limit(500)
        .populate({ path: "renewedBy", select: "name email", options: { skipTenantScope: true } }),
      SubscriptionPayment.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    res.json({
      payments,
      total:        payments.length,
      totalRevenue: totalRevResult[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/subscription/my-payments  (tenant admin)
exports.getMyPayments = async (req, res) => {
  try {
    const payments = await SubscriptionPayment.find({ tenantId: req.tenantId })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ payments, total: payments.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
