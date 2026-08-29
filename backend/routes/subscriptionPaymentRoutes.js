const express = require("express");
const router  = express.Router();
const authMiddleware              = require("../middleware/authMiddleware");
const { authForRenewal }          = require("../middleware/authMiddleware");
const { requireRole }             = require("../middleware/roleAccess");
const ctrl = require("../controllers/subscriptionPaymentController");

// Public — no auth needed (just returns pricing table)
router.get("/pricing", ctrl.getPlanPricing);

// authForRenewal — skips org-status check so expired tenants can pay
router.post("/create-order", authForRenewal, requireRole("admin"), ctrl.createOrder);
router.post("/verify",       authForRenewal, requireRole("admin"), ctrl.verifyPayment);

// Normal auth — only needed when org is active (dashboard payment history)
router.get("/my-payments", authMiddleware, requireRole("admin"), ctrl.getMyPayments);

module.exports = router;
