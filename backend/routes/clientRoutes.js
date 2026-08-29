const express = require("express");
const router = express.Router();
const clientController = require("../controllers/clientController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");
const checkFeature = require("../middleware/checkFeature");
const checkPlanLimit = require("../middleware/checkPlanLimit");

const clientAccess = requireRole("admin", "sales");
// Read-only client list/detail/remarks/work-progress access also extends to "user"
// (an assigned non-sales user), who can only ever see clients assigned to them —
// enforced inside the controllers, not by this role gate alone.
const clientViewAccess = requireRole("admin", "sales", "user");
const workProgressViewAccess = requireRole("admin", "sales", "user", "client");
const clientsFeature = checkFeature("clients");

// Dashboard Stats (must come before "/:id")
router.get("/dashboard-stats", authMiddleware, clientsFeature, clientAccess, clientController.getDashboardStats);


// Client Portal (role: "client") - must come before "/:id"
router.get("/my-project", authMiddleware, clientsFeature, requireRole("client"), clientController.getMyProject);

// Client Routes (Protected)
router.post("/", authMiddleware, clientsFeature, clientAccess, checkPlanLimit("clients"), clientController.createClient);
router.get("/", authMiddleware, clientsFeature, clientViewAccess, clientController.getAllClients);
router.get("/:id", authMiddleware, clientsFeature, clientViewAccess, clientController.getClientById);
router.put("/:id", authMiddleware, clientsFeature, clientAccess, clientController.updateClient);
router.delete("/:id", authMiddleware, clientsFeature, clientAccess, clientController.deleteClient);
router.get("/:id/activity", authMiddleware, clientsFeature, clientViewAccess, clientController.getClientActivity);
router.put("/:id/assign", authMiddleware, clientsFeature, requireRole("admin"), clientController.assignUserToClient);
router.get("/:id/remarks", authMiddleware, clientsFeature, clientViewAccess, clientController.getRemarks);
router.post("/:id/remarks", authMiddleware, clientsFeature, clientViewAccess, clientController.addRemark);
router.get("/:id/work-progress", authMiddleware, clientsFeature, workProgressViewAccess, clientController.getWorkProgress);
router.post("/:id/work-progress", authMiddleware, clientsFeature, clientViewAccess, clientController.addWorkProgress);
router.put("/:id/work-progress/:entryId", authMiddleware, clientsFeature, clientViewAccess, clientController.updateWorkProgress);
router.post("/:id/pi-attachments", authMiddleware, clientsFeature, clientAccess, clientController.uploadPiAttachmentMiddleware, clientController.uploadPiAttachment);
router.delete("/:id/pi-attachments/:attachmentId", authMiddleware, clientsFeature, clientAccess, clientController.deletePiAttachment);

// Proposal Routes
router.post("/proposals/create", authMiddleware, clientsFeature, clientAccess, clientController.createProposal);
router.get("/proposals/all", authMiddleware, clientsFeature, clientAccess, clientController.getAllProposals);
router.get("/proposals/:id", authMiddleware, clientsFeature, clientAccess, clientController.getProposalById);
router.get("/proposals/:id/invoice", authMiddleware, clientsFeature, clientAccess, clientController.generateInvoice);
router.post("/proposals/:id/send", authMiddleware, clientsFeature, clientAccess, clientController.sendProposal);
router.put("/proposals/:id", authMiddleware, clientsFeature, clientAccess, clientController.updateProposal);
router.delete("/proposals/:id", authMiddleware, clientsFeature, clientAccess, clientController.deleteProposal);

// Proposal Deliverables Routes
router.post("/proposals/:id/deliverables", authMiddleware, clientsFeature, clientAccess, clientController.addDeliverable);
router.put("/proposals/:id/deliverables/:deliverableId", authMiddleware, clientsFeature, clientAccess, clientController.updateDeliverable);
router.delete("/proposals/:id/deliverables/:deliverableId", authMiddleware, clientsFeature, clientAccess, clientController.deleteDeliverable);

// Proposal Payments Routes
router.post("/proposals/:id/payments", authMiddleware, clientsFeature, clientAccess, clientController.addPayment);

// Payment Reminder Routes
router.post("/reminders/create", authMiddleware, clientsFeature, clientAccess, clientController.createPaymentReminder);
router.get("/reminders/all", authMiddleware, clientsFeature, clientAccess, clientController.getAllReminders);
router.post("/reminders/:id/send", authMiddleware, clientsFeature, clientAccess, clientController.sendPaymentReminder);
router.put("/reminders/:id", authMiddleware, clientsFeature, clientAccess, clientController.updatePaymentReminder);
router.delete("/reminders/:id", authMiddleware, clientsFeature, clientAccess, clientController.deletePaymentReminder);

module.exports = router;
