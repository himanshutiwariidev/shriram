// Shared list of every tenant-owned MongoDB collection name. Used both by
// the one-time migration backfill (scripts/migrateToMultiTenant.js) and by
// Super Admin's cascade-delete (controllers/organizationController.js) so
// the two never drift out of sync.
const TENANT_COLLECTIONS = [
  "users",
  "clients",
  "projects",
  "tasks",
  "leaves",
  "attendances",
  "salaryslips",
  "proposals",
  "paymentreminders",
  "activitylogs",
  "branches",
  "departments",
  "tenantfeatures",
  "meetings",
  "notifications",
  "proposaltemplates",
];

module.exports = { TENANT_COLLECTIONS };
