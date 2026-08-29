const express = require("express");
const router = express.Router();

const {
  createTemplate,
  getAllTemplates,
  getTemplateById,
  deleteTemplate,
} = require("../controllers/proposalTemplateController");

const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");
const checkFeature = require("../middleware/checkFeature");

// Same access shape as proposals themselves (clientRoutes.js's clientAccess) —
// templates are just reusable proposal-scope presets, gated behind the
// same "clients" feature.
const templateAccess = requireRole("admin", "sales");
const clientsFeature = checkFeature("clients");

router.post("/", authMiddleware, clientsFeature, templateAccess, createTemplate);
router.get("/", authMiddleware, clientsFeature, templateAccess, getAllTemplates);
router.get("/:id", authMiddleware, clientsFeature, templateAccess, getTemplateById);
router.delete("/:id", authMiddleware, clientsFeature, templateAccess, deleteTemplate);

module.exports = router;
