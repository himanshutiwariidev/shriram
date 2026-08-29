// Single source of truth for which modules can be toggled per tenant.
// Only lists features that actually exist as real, enforceable routes in
// this codebase — see backend/middleware/checkFeature.js for enforcement
// and each route file (attendanceRoutes.js, etc.) for where it's applied.
//
// "Users" (employee management) is intentionally NOT included — disabling
// it risks a tenant admin locking themselves out with no recovery path.
const FEATURE_CATALOG = [
  {
    group: "HR & Employee",
    features: [
      { key: "attendance", label: "Attendance" },
      { key: "leaves", label: "Leave Management" },
      { key: "payroll", label: "Payroll" },
    ],
  },
  {
    group: "CRM",
    features: [{ key: "clients", label: "Clients & CRM" }],
  },
  {
    group: "Projects",
    features: [
      { key: "projects", label: "Projects" },
      { key: "tasks", label: "Tasks" },
    ],
  },
  {
    group: "Administration",
    features: [
      { key: "branches", label: "Branch Management" },
      { key: "departments", label: "Department Management" },
    ],
  },
  {
    group: "Scheduling",
    features: [{ key: "meetings", label: "Meeting Scheduler" }],
  },
  {
    group: "Finance",
    features: [{ key: "expenses", label: "Expense Tracker" }],
  },
  {
    group: "Tools",
    features: [
      { key: "gmb_scraper",    label: "GMB Lead Scraper" },
      { key: "mail_automation", label: "Mail Automation" },
    ],
  },
];

const FEATURE_KEYS = FEATURE_CATALOG.flatMap((group) => group.features.map((f) => f.key));

module.exports = { FEATURE_CATALOG, FEATURE_KEYS };
