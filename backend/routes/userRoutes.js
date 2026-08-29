const express = require("express");
const router = express.Router();

const {
  createUser,
  getAllUsers,
  getUsersByRole,
  deleteUser,
  updateUser,
  logoutUser,
  getMyProfile,
  updateMyProfile,
} = require("../controllers/userController");

const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");
const { requireRole } = require("../middleware/roleAccess");
const { loginLimiter, createUserLimiter } = require("../middleware/rateLimiter");
const { loginValidator, createUserValidator, updateUserValidator } = require("../middleware/validator");
const checkPlanLimit = require("../middleware/checkPlanLimit");
const uploadEmployee = require("../middleware/uploadEmployee");

const empUpload = uploadEmployee.fields([
  { name: "photo", maxCount: 1 },
  { name: "resume", maxCount: 1 },
]);

// ── Public: Login ─────────────────────────────────────────────────────────
// Rate-limited (5 per 15 min) and input-validated before the handler runs.
// NOTE: the main login endpoint lives at POST /api/login in Server.js;
// this duplicate at /api/users/login is kept for backward compatibility.
const { loginUser } = require("../controllers/userController");
router.post("/login", loginLimiter, loginValidator, loginUser);

// ── Auth: Logout ──────────────────────────────────────────────────────────
router.post("/logout", authMiddleware, logoutUser);

// ── Admin-bootstrap route ─────────────────────────────────────────────────
// This route previously had no authentication and allowed anyone to create
// an account — a critical security hole.  It is now protected so only an
// existing admin can call it.  The admin auto-creation on first login
// (inside loginUser) removes any legitimate need for an unauthenticated
// bootstrap path.
router.post("/register-admin", authMiddleware, requireRole("admin"), checkPlanLimit("users"), createUser);

// ── Admin / HR routes ─────────────────────────────────────────────────────
router.post(
  "/",
  authMiddleware,
  requireRole("admin", "hr"),
  checkPlanLimit("users"),
  createUserLimiter,
  empUpload,
  createUserValidator,
  createUser
);

router.get("/", authMiddleware, requireRole("admin", "hr"), getAllUsers);

router.get("/by-role/:role", authMiddleware, requireRole("admin"), getUsersByRole);

// ── Self-service profile ("My Profile") ─────────────────────────────────────
// Must come before "/:id" so "me" isn't parsed as a user id. Any
// authenticated role can view/edit their own profile.
router.get("/me", authMiddleware, getMyProfile);
router.put("/me", authMiddleware, updateMyProfile);

router.delete("/:id", authMiddleware, requireRole("admin", "hr"), deleteUser);

router.put(
  "/:id",
  authMiddleware,
  requireRole("admin", "hr"),
  empUpload,
  updateUserValidator,
  updateUser
);

module.exports = router;
