const express = require("express");
const router = express.Router();

const { registerOrganization } = require("../controllers/authController");
const { registerOrgLimiter } = require("../middleware/rateLimiter");
const { registerOrganizationValidator } = require("../middleware/validator");

// ── Public: register a new Organization (tenant) + its first admin ─────────
router.post(
  "/register-organization",
  registerOrgLimiter,
  registerOrganizationValidator,
  registerOrganization
);

module.exports = router;
