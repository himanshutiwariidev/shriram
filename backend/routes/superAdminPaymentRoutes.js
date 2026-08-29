const express = require("express");
const router  = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");
const { getAllPayments } = require("../controllers/subscriptionPaymentController");

router.get("/", authMiddleware, requireRole("superadmin"), getAllPayments);

module.exports = router;
