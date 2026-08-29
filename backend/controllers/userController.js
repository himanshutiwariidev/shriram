const User = require("../models/User");
const Organization = require("../models/Organization");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const { createLoginAttendance, logoutAttendance } = require("../services/attendanceService");
const { withTenant } = require("../utils/tenantQuery");
const { notifyUsers } = require("../utils/notificationHelper");
const { deletePublicFileIfExists } = require("../utils/fileCleanup");

// ── Cookie options ──────────────────────────────────────────────────────────
// httpOnly prevents JS access; secure restricts to HTTPS in production;
// sameSite:"strict" blocks cross-site request forgery.
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 24 * 60 * 60 * 1000, // 1 day — matches JWT expiry
};

// ── bcrypt cost factor ──────────────────────────────────────────────────────
// 12 rounds is the current OWASP recommendation (up from the previous 10).
// bcrypt.compare() reads the rounds from the stored hash, so existing
// passwords verified at 10 rounds continue to work without migration.
const BCRYPT_ROUNDS = 12;


// ── CREATE USER (admin / HR only) ───────────────────────────────────────────
exports.createUser = asyncHandler(async (req, res) => {
  const {
    name, email, password, role, branchId, departmentId,
    employeeId, dob, bloodGroup, gender, emergencyContact, address,
    aadhaar, pan, qualification, experience, joiningDate, relievingDate, phone,
  } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  const existingUser = await User.findOne(withTenant({ email: normalizedEmail }, req));
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const userData = {
    tenantId: req.tenantId,
    name,
    email: normalizedEmail,
    password: hashedPassword,
    role,
    branchId: branchId || undefined,
    departmentId: departmentId || undefined,
  };

  // Employee-specific fields — not stored for client portal accounts
  if (role !== "client") {
    if (phone)            userData.phone = phone;
    if (employeeId)       userData.employeeId = employeeId;
    if (dob)              userData.dob = dob;
    if (bloodGroup)       userData.bloodGroup = bloodGroup;
    if (gender)           userData.gender = gender;
    if (emergencyContact) userData.emergencyContact = emergencyContact;
    if (address)          userData.address = address;
    if (aadhaar)          userData.aadhaar = aadhaar;
    if (pan)              userData.pan = pan.toUpperCase();
    if (qualification)    userData.qualification = qualification;
    if (experience)       userData.experience = experience;
    if (joiningDate)      userData.joiningDate = joiningDate;
    if (relievingDate)    userData.relievingDate = relievingDate;
    if (req.files?.photo?.[0])  userData.profileImage = `/uploads/employee-photos/${req.files.photo[0].filename}`;
    if (req.files?.resume?.[0]) userData.resume = `/uploads/resumes/${req.files.resume[0].filename}`;
  }

  await User.create(userData);

  const peers = await User.find(withTenant({ role: { $in: ["admin", "hr"] }, _id: { $ne: req.user.id } }, req)).select("_id");
  await notifyUsers(req.tenantId, peers.map((u) => u._id), "new_user", "New team member added", `${name} (${role}) joined your organization`, "/admin?tab=users");

  return res.status(201).json({ message: "User created successfully" });
});

// ── GET ALL USERS ───────────────────────────────────────────────────────────
exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find(withTenant({}, req)).select("-password");
  return res.json(users);
});

// ── GET USERS BY ROLE ───────────────────────────────────────────────────────
exports.getUsersByRole = asyncHandler(async (req, res) => {
  const { role } = req.params;
  const users = await User.find(withTenant({ role, isActive: true }, req)).select("-password");
  return res.json(users);
});

// ── DELETE USER ─────────────────────────────────────────────────────────────
exports.deleteUser = asyncHandler(async (req, res) => {
  await User.findOneAndDelete(withTenant({ _id: req.params.id }, req));
  return res.json({ message: "User deleted successfully" });
});

// ── UPDATE USER ─────────────────────────────────────────────────────────────
exports.updateUser = asyncHandler(async (req, res) => {
  const updatePayload = { ...req.body };

  if (updatePayload.email) {
    updatePayload.email = String(updatePayload.email).trim().toLowerCase();
  }

  if (updatePayload.password) {
    updatePayload.password = await bcrypt.hash(updatePayload.password, BCRYPT_ROUNDS);
  }

  if (updatePayload.pan) updatePayload.pan = String(updatePayload.pan).toUpperCase();

  // Empty string means "unset" (e.g. a dropdown's blank option), not a real id.
  if (updatePayload.branchId === "") updatePayload.branchId = null;
  if (updatePayload.departmentId === "") updatePayload.departmentId = null;

  // Handle employee file uploads on edit
  if (req.files?.photo?.[0])  updatePayload.profileImage = `/uploads/employee-photos/${req.files.photo[0].filename}`;
  if (req.files?.resume?.[0]) updatePayload.resume = `/uploads/resumes/${req.files.resume[0].filename}`;

  const user = await User.findOneAndUpdate(withTenant({ _id: req.params.id }, req), updatePayload, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({ message: "User updated successfully" });
});

// ── LOGIN ────────────────────────────────────────────────────────────────────
// Two paths share this handler:
//   Path A — hardcoded admin credentials (from environment variables).
// Superadmin bootstrap stays in .env (no tenant attached).
// All tenant users are created by a superadmin via the dashboard — no
// hardcoded tenant credentials anywhere.
exports.loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();

  const SUPERADMIN_EMAIL    = process.env.SUPERADMIN_EMAIL;
  const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD;

  // ── Superadmin bootstrap (platform-level, no tenantId) ───────────────────
  if (
    SUPERADMIN_EMAIL &&
    SUPERADMIN_PASSWORD &&
    normalizedEmail === SUPERADMIN_EMAIL &&
    password === SUPERADMIN_PASSWORD
  ) {
    let superadmin = await User.findOne({ email: SUPERADMIN_EMAIL, role: "superadmin" }).setOptions({ skipTenantScope: true });

    if (!superadmin) {
      const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, BCRYPT_ROUNDS);
      superadmin = await User.create({
        name: "Super Admin",
        email: SUPERADMIN_EMAIL,
        password: hashedPassword,
        role: "superadmin",
      });
    }

    const token = jwt.sign(
      { id: superadmin._id, role: superadmin.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    res.cookie("access_token", token, COOKIE_OPTIONS);

    return res.json({
      message: "Login successful",
      token,
      user: { id: superadmin._id, name: superadmin.name, email: superadmin.email, role: superadmin.role, profileImage: superadmin.profileImage },
    });
  }

  // ── Normal tenant user login ──────────────────────────────────────────────
  // Login has no org-picker UI yet, so this looks up by email across all
  // tenants (skipTenantScope) and rejects ambiguous matches below.
  const matches = await User.find({ email: normalizedEmail })
    .select("+password")
    .setOptions({ skipTenantScope: true });

  if (matches.length > 1) {
    return res.status(400).json({ message: "This email is used by multiple organizations. Contact support." });
  }

  const user = matches[0];

  if (!user) {
    // Constant-time fallback so response timing doesn't reveal whether the
    // email exists — no user, so there's no org/status to check first.
    const dummyHash = "$2b$12$invalidhashpaddingtomakesurewe.tookthesametimeasrealcheck";
    await bcrypt.compare(password, dummyHash);
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // Organization and account status are validated BEFORE password
  // verification — a suspended/expired org or a deactivated account must
  // reject with a meaningful reason regardless of whether the submitted
  // password happens to be correct. Order: org exists → org status → user
  // active → password.
  if (user.tenantId) {
    const organization = await Organization.findById(user.tenantId);
    if (!organization) {
      return res.status(403).json({
        success: false,
        code: "ORG_NOT_FOUND",
        message: "Your organization could not be found. Please contact your Platform Administrator.",
      });
    }
    if (organization.status === "suspended") {
      return res.status(403).json({
        success: false,
        code: "ORG_SUSPENDED",
        message: "Your organization account has been suspended. Please contact your Platform Partner or Administrator for assistance.",
      });
    }
    if (organization.status === "expired") {
      return res.status(403).json({
        success: false,
        code: "ORG_EXPIRED",
        message: "Your organization's subscription has expired. Please renew your subscription to continue.",
      });
    }
  }

  if (!user.isActive) {
    return res.status(403).json({ message: "Your account has been deactivated. Contact your administrator." });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    // Generic message — never reveal whether the email exists in the system
    return res.status(401).json({ message: "Invalid credentials" });
  }

  user.lastLogin = new Date();
  await user.save();

  const token = jwt.sign(
    { id: user._id, role: user.role, tenantId: user.tenantId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );

  // Client-portal logins are not employee clock-ins
  if (user.role !== "client") {
    await createLoginAttendance(user._id, user.tenantId);
  }

  res.cookie("access_token", token, COOKIE_OPTIONS);

  return res.json({
    message: "Login successful",
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId, profileImage: user.profileImage },
  });
});

// ── LOGOUT ────────────────────────────────────────────────────────────────────
exports.logoutUser = asyncHandler(async (req, res) => {
  try {
    await logoutAttendance(req.user.id, req.tenantId);
  } catch (attendanceError) {
    // 404 means no open attendance record — not an error worth propagating
    if (attendanceError.statusCode !== 404) throw attendanceError;
  }

  // Clear the httpOnly cookie regardless of how the token was originally sent
  res.clearCookie("access_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return res.json({ message: "Logout successful" });
});

// ── SELF-SERVICE PROFILE (the "My Profile" dropdown page) ───────────────────
// Editing your own profile and a Super Admin editing an org's owner are just
// two different callers of the same User.profileImage/name/phone/designation
// fields — no duplicate profile subsystem.
exports.getMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findOne(withTenant({ _id: req.user.id }, req)).select("-password");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.json({ user });
});

exports.updateMyProfile = asyncHandler(async (req, res) => {
  const { name, phone, designation } = req.body;
  const updatePayload = {};
  if (name !== undefined) updatePayload.name = name;
  if (phone !== undefined) updatePayload.phone = phone;
  if (designation !== undefined) updatePayload.designation = designation;

  const user = await User.findOneAndUpdate(
    withTenant({ _id: req.user.id }, req),
    updatePayload,
    { new: true, runValidators: true }
  ).select("-password");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({ message: "Profile updated successfully", user });
});

exports.uploadMyProfilePhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  const user = await User.findOne(withTenant({ _id: req.user.id }, req));
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  deletePublicFileIfExists(user.profileImage);
  user.profileImage = `/uploads/owners/${req.file.filename}`;
  await user.save();

  return res.json({ message: "Profile photo uploaded successfully", profileImage: user.profileImage });
});

exports.deleteMyProfilePhoto = asyncHandler(async (req, res) => {
  const user = await User.findOne(withTenant({ _id: req.user.id }, req));
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  deletePublicFileIfExists(user.profileImage);
  user.profileImage = undefined;
  await user.save();

  return res.json({ message: "Profile photo removed successfully" });
});
