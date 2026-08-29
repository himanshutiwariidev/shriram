const { body, validationResult } = require("express-validator");

// ── Shared error collector ──────────────────────────────────────────────────
// Must be the last item in every validator array.
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
};

// ── Allowed role values ─────────────────────────────────────────────────────
// "admin" is intentionally excluded — only the hardcoded admin account or an
// existing admin can hold that role; regular user creation is limited to these.
const VALID_USER_ROLES = ["user", "hr", "sales", "client"];

// ── 1. Login validator ──────────────────────────────────────────────────────
// Applies to both POST /api/login and POST /api/users/login.
// This application has NO public registration — credentials are created only
// by the admin.  Hardcoded admin login continues to work unchanged.
const loginValidator = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("A valid email address is required")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
    .isLength({ max: 128 }).withMessage("Password is too long"),

  handleValidationErrors,
];

// ── 2. Create-user validator ────────────────────────────────────────────────
// Only admin/HR can reach this route; validation enforces clean data at the
// boundary before it ever touches the DB.
const createUserValidator = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z\s'.,-]+$/)
    .withMessage("Name contains invalid characters"),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("A valid email address is required")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
    .isLength({ max: 128 }).withMessage("Password is too long"),

  body("role")
    .optional()
    .isIn(VALID_USER_ROLES)
    .withMessage(`Role must be one of: ${VALID_USER_ROLES.join(", ")}`),

  body("branchId")
    .optional({ checkFalsy: true })
    .isMongoId().withMessage("Invalid branch"),

  body("departmentId")
    .optional({ checkFalsy: true })
    .isMongoId().withMessage("Invalid department"),

  handleValidationErrors,
];

// ── 3. Update-user validator ────────────────────────────────────────────────
// All fields optional — validate only what is present.
const updateUserValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z\s'.,-]+$/)
    .withMessage("Name contains invalid characters"),

  body("email")
    .optional()
    .trim()
    .isEmail().withMessage("A valid email address is required")
    .normalizeEmail(),

  body("password")
    .optional()
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
    .isLength({ max: 128 }).withMessage("Password is too long"),

  body("role")
    .optional()
    .isIn(VALID_USER_ROLES)
    .withMessage(`Role must be one of: ${VALID_USER_ROLES.join(", ")}`),

  body("phone")
    .optional()
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Invalid Indian mobile number (must be 10 digits starting with 6-9)"),

  body("branchId")
    .optional({ checkFalsy: true })
    .isMongoId().withMessage("Invalid branch"),

  body("departmentId")
    .optional({ checkFalsy: true })
    .isMongoId().withMessage("Invalid department"),

  handleValidationErrors,
];

// ── 4. Register-organization validator ──────────────────────────────────────
// Public endpoint that creates a brand-new tenant (Organization) plus its
// first admin user — see POST /api/auth/register-organization.
const registerOrganizationValidator = [
  body("organizationName")
    .trim()
    .notEmpty().withMessage("Organization name is required")
    .isLength({ min: 2, max: 150 }).withMessage("Organization name must be between 2 and 150 characters"),

  body("adminName")
    .trim()
    .notEmpty().withMessage("Admin name is required")
    .isLength({ min: 2, max: 100 }).withMessage("Admin name must be between 2 and 100 characters"),

  body("adminEmail")
    .trim()
    .notEmpty().withMessage("Admin email is required")
    .isEmail().withMessage("A valid email address is required")
    .normalizeEmail(),

  body("adminPassword")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
    .isLength({ max: 128 }).withMessage("Password is too long"),

  handleValidationErrors,
];

// ── 4b. Create-tenant validator (Super Admin) ────────────────────────────────
// Fuller variant of registerOrganizationValidator — used by
// POST /api/superadmin/organizations, which also accepts the org profile /
// subscription fields and creates the tenant on someone else's behalf.
const createTenantValidator = [
  body("organizationName")
    .trim()
    .notEmpty().withMessage("Organization name is required")
    .isLength({ min: 2, max: 150 }).withMessage("Organization name must be between 2 and 150 characters"),

  body("adminName")
    .trim()
    .notEmpty().withMessage("Admin name is required")
    .isLength({ min: 2, max: 100 }).withMessage("Admin name must be between 2 and 100 characters"),

  body("adminEmail")
    .trim()
    .notEmpty().withMessage("Admin email is required")
    .isEmail().withMessage("A valid email address is required")
    .normalizeEmail(),

  body("adminPassword")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
    .isLength({ max: 128 }).withMessage("Password is too long"),

  body("companyEmail")
    .optional({ checkFalsy: true })
    .isEmail().withMessage("A valid company email address is required"),

  body("status")
    .optional({ checkFalsy: true })
    .isIn(["trial", "active", "suspended", "expired"]).withMessage("Invalid status"),

  body("planName")
    .optional({ checkFalsy: true })
    .isIn(["starter", "professional", "business", "enterprise", "custom"]).withMessage("Invalid plan"),

  body("enabledFeatures")
    .optional()
    .isArray().withMessage("enabledFeatures must be an array"),

  handleValidationErrors,
];

// ── 4c. Update-organization validator (Super Admin edit) ─────────────────────
const updateOrganizationValidator = [
  body("name")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 150 }).withMessage("Organization name must be between 2 and 150 characters"),

  body("email")
    .optional({ checkFalsy: true })
    .isEmail().withMessage("A valid email address is required"),

  body("status")
    .optional({ checkFalsy: true })
    .isIn(["trial", "active", "suspended", "expired"]).withMessage("Invalid status"),

  body("planName")
    .optional({ checkFalsy: true })
    .isIn(["starter", "professional", "business", "enterprise", "custom"]).withMessage("Invalid plan"),

  handleValidationErrors,
];

// ── 5. Branch validator ──────────────────────────────────────────────────────
const branchValidator = [
  body("name")
    .trim()
    .notEmpty().withMessage("Branch name is required")
    .isLength({ min: 2, max: 150 }).withMessage("Branch name must be between 2 and 150 characters"),

  body("manager")
    .optional({ checkFalsy: true })
    .isMongoId().withMessage("Invalid manager"),

  body("status")
    .optional()
    .isIn(["active", "inactive"]).withMessage("Status must be active or inactive"),

  handleValidationErrors,
];

// ── 6. Department validator ──────────────────────────────────────────────────
const departmentValidator = [
  body("name")
    .trim()
    .notEmpty().withMessage("Department name is required")
    .isLength({ min: 2, max: 150 }).withMessage("Department name must be between 2 and 150 characters"),

  body("branch")
    .optional({ checkFalsy: true })
    .isMongoId().withMessage("Invalid branch"),

  handleValidationErrors,
];

module.exports = {
  loginValidator,
  createUserValidator,
  updateUserValidator,
  registerOrganizationValidator,
  createTenantValidator,
  updateOrganizationValidator,
  branchValidator,
  departmentValidator,
  handleValidationErrors,
};
