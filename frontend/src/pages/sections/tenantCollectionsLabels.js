// Human-readable labels for backend/utils/tenantCollections.js's
// TENANT_COLLECTIONS keys, used by the Usage tab's per-collection table.
export const TENANT_COLLECTIONS_LABELS = {
  users: "Users",
  clients: "Clients",
  projects: "Projects",
  tasks: "Tasks",
  leaves: "Leave Requests",
  attendances: "Attendance Records",
  salaryslips: "Salary Slips",
  proposals: "Proposals",
  paymentreminders: "Payment Reminders",
  activitylogs: "Activity Log Entries",
  branches: "Branches",
  departments: "Departments",
  tenantfeatures: "Feature Records",
};

export const TENANT_COLLECTIONS_ORDER = Object.keys(TENANT_COLLECTIONS_LABELS);
