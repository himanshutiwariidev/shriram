/**
 * migrateTenant.js
 * Moves all data from the "Default Organization" to a new "Bharat Bizmart" tenant.
 * Run once: node scripts/migrateTenant.js
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: __dirname + "/../.env" });

const OLD_TENANT_ID = "6a5a69fe5dfc3b9d2bbce422"; // Default Organization

// All collections that carry a tenantId field
const COLLECTIONS = [
  "users", "clients", "projects", "tasks", "leaves", "attendances",
  "salaryslips", "proposals", "paymentreminders", "activitylogs",
  "branches", "departments", "tenantfeatures", "meetings", "notifications",
  "proposaltemplates", "expenses", "expensecategories", "vendors", "budgets",
  "collections", "tenantsmtps", "announcements", "messages", "savedreports",
  "holidays", "shifts", "leavepolicies", "leavebalances", "reviewcycles",
  "appraisals", "tenantbrandings", "tenantserviceaccesses", "subscriptionpayments",
  "salestargetsections", "salarymodels",
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✔ Connected to MongoDB:", mongoose.connection.name);

  const db = mongoose.connection.db;
  const oldId = new mongoose.Types.ObjectId(OLD_TENANT_ID);

  // ── 1. Read the old organization ──────────────────────────────────────────
  const oldOrg = await db.collection("organizations").findOne({ _id: oldId });
  if (!oldOrg) {
    console.error("❌ Old organization not found:", OLD_TENANT_ID);
    process.exit(1);
  }
  console.log(`\n📦 Source:  "${oldOrg.name}" (${OLD_TENANT_ID})`);

  // ── 2. Check if new org already exists ────────────────────────────────────
  let newOrg = await db.collection("organizations").findOne({ slug: "bharatbizmart" });
  if (newOrg) {
    console.log(`ℹ️  Target org already exists: "${newOrg.name}" (${newOrg._id})`);
  } else {
    // ── 3. Create the new Organization ──────────────────────────────────────
    const now = new Date();
    // Extend subscription by 1 year from today
    const newExpiry = new Date(now);
    newExpiry.setFullYear(newExpiry.getFullYear() + 1);

    const newOrgDoc = {
      _id: new mongoose.Types.ObjectId(),
      name: "Bharat Bizmart",
      slug: "bharatbizmart",
      status: "active",
      planName: oldOrg.planName || "enterprise",
      email: oldOrg.email || "",
      phone: oldOrg.phone || "",
      website: oldOrg.website || "",
      gstNumber: oldOrg.gstNumber || "",
      panNumber: oldOrg.panNumber || "",
      address: oldOrg.address || "",
      city: oldOrg.city || "",
      state: oldOrg.state || "",
      country: oldOrg.country || "India",
      postalCode: oldOrg.postalCode || "",
      timezone: oldOrg.timezone || "Asia/Kolkata",
      currency: oldOrg.currency || "INR",
      businessType: oldOrg.businessType || "",
      subscriptionStartDate: now,
      subscriptionExpiresAt: newExpiry,
      trialEndsAt: null,
      createdAt: now,
      updatedAt: now,
      __v: 0,
    };

    await db.collection("organizations").insertOne(newOrgDoc);
    newOrg = newOrgDoc;
    console.log(`✅ Created new org: "${newOrg.name}" (${newOrg._id})`);
  }

  const newId = newOrg._id;
  console.log(`\n🎯 Target:  "${newOrg.name}" (${newId})\n`);

  // ── 4. Migrate each collection ────────────────────────────────────────────
  let totalMoved = 0;
  for (const col of COLLECTIONS) {
    try {
      const result = await db.collection(col).updateMany(
        { tenantId: oldId },
        { $set: { tenantId: newId } }
      );
      if (result.modifiedCount > 0) {
        console.log(`  ✔ ${col.padEnd(26)} → ${result.modifiedCount} document(s) moved`);
        totalMoved += result.modifiedCount;
      }
    } catch (e) {
      // Collection may not exist yet — skip silently
    }
  }

  // ── 5. Update subscription payment org name ───────────────────────────────
  await db.collection("subscriptionpayments").updateMany(
    { tenantId: newId },
    { $set: { organizationName: "Bharat Bizmart" } }
  );

  // ── 6. Set createdBy on new org using the admin user ─────────────────────
  const adminUser = await db.collection("users").findOne({
    tenantId: newId,
    role: "admin",
  });
  if (adminUser) {
    await db.collection("organizations").updateOne(
      { _id: newId },
      { $set: { createdBy: adminUser._id } }
    );
    console.log(`\n  ✔ createdBy set to admin: ${adminUser.name} (${adminUser.email})`);
  }

  console.log(`\n✅ Migration complete — ${totalMoved} total documents moved to "Bharat Bizmart"`);
  console.log(`\n⚠️  IMPORTANT: Update DEFAULT_ORG_SLUG in .env to "bharatbizmart"`);
  console.log(`   All existing login sessions are invalidated — users must re-login.\n`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});
