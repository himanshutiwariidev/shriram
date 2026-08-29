const ProposalTemplate = require("../models/ProposalTemplate");
const { withTenant } = require("../utils/tenantQuery");

exports.createTemplate = async (req, res) => {
  try {
    const { name, description, services } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Template name is required" });
    }
    if (!Array.isArray(services) || services.length === 0) {
      return res.status(400).json({ message: "At least one configured service is required to save a template" });
    }

    const template = await ProposalTemplate.create({
      tenantId: req.tenantId,
      name,
      description,
      services,
      createdBy: req.user.id,
    });

    return res.status(201).json({ message: "Template saved", template });
  } catch (error) {
    console.error("Error creating proposal template:", error);
    return res.status(500).json({ message: error.message || "Failed to save template" });
  }
};

exports.getAllTemplates = async (req, res) => {
  try {
    const templates = await ProposalTemplate.find(withTenant({}, req)).select("name description createdAt").sort({ createdAt: -1 });
    return res.json({ templates });
  } catch (error) {
    console.error("Error fetching proposal templates:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch templates" });
  }
};

exports.getTemplateById = async (req, res) => {
  try {
    const template = await ProposalTemplate.findOne(withTenant({ _id: req.params.id }, req));
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    return res.json({ template });
  } catch (error) {
    console.error("Error fetching proposal template:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch template" });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const template = await ProposalTemplate.findOneAndDelete(withTenant({ _id: req.params.id }, req));
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    return res.json({ message: "Template deleted" });
  } catch (error) {
    console.error("Error deleting proposal template:", error);
    return res.status(500).json({ message: error.message || "Failed to delete template" });
  }
};
