const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Organization = require("../models/Organization");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { buildUniqueSlug } = require("../utils/slugify");

const BCRYPT_ROUNDS = 12;
const TRIAL_DAYS = 14;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 24 * 60 * 60 * 1000,
};

// Creates a brand-new tenant (Organization) plus its first admin User.
// Public endpoint — this is the only place a new Organization can be created
// in this pass (no Super Admin panel yet).
exports.registerOrganization = asyncHandler(async (req, res) => {
  const { organizationName, adminName, adminEmail, adminPassword, phone, businessType } = req.body;
  const normalizedEmail = String(adminEmail).trim().toLowerCase();

  const slug = await buildUniqueSlug(organizationName);

  const organization = await Organization.create({
    name: organizationName.trim(),
    slug,
    email: normalizedEmail,
    phone,
    businessType,
    status: "trial",
    trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
  });

  let admin;
  try {
    const hashedPassword = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
    admin = await User.create({
      tenantId: organization._id,
      name: adminName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "admin",
    });
  } catch (error) {
    // Roll back the just-created Organization — same compensating-delete
    // pattern already used in clientController.createClient.
    await Organization.findByIdAndDelete(organization._id);
    if (error?.code === 11000) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }
    throw error;
  }

  organization.createdBy = admin._id;
  await organization.save();

  const token = jwt.sign(
    { id: admin._id, role: admin.role, tenantId: admin.tenantId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );

  res.cookie("access_token", token, COOKIE_OPTIONS);

  return res.status(201).json({
    message: "Organization registered successfully",
    token,
    user: { id: admin._id, name: admin.name, email: admin.email, role: admin.role, tenantId: admin.tenantId },
    organization: { id: organization._id, name: organization.name, slug: organization.slug, status: organization.status },
  });
});
