const Project = require("../models/Project");
const { withTenant, POPULATE_SKIP_TENANT } = require("../utils/tenantQuery");

const allowedFields = [
  "projectCategory",
  "companyName",
  "domain",
  "handoverdate",
  "salesPerson",
  "businesstype",
  "assignTo",
  "technology",
  "deployedDate",
  "developer",
  "websiteDueDate",
  "domainDueDate",
  "platform",
  "domainProvider",
  "hostingProvider",
  "domainOwnership",
  "hostingOwnership",
  "status",
  "credentials",
  "userId",
  "password",
  "credentialType",
];

const optionalTypedFields = new Set([
  "projectCategory",
  "businesstype",
  "status",
  "handoverdate",
  "deployedDate",
  "websiteDueDate",
  "domainDueDate",
]);

const buildProjectPayload = (body) =>
  allowedFields.reduce((payload, field) => {
    if (body[field] === undefined) return payload;
    if (body[field] === "" && optionalTypedFields.has(field)) return payload;
    if (field === "credentials") {
      if (!Array.isArray(body.credentials)) return payload;
      payload.credentials = body.credentials
        .map((credential) => ({
          credentialType: credential?.credentialType || "",
          userId: credential?.userId || "",
          password: credential?.password || "",
        }))
        .filter((credential) => credential.credentialType || credential.userId || credential.password);
      return payload;
    }
    payload[field] = body[field];
    return payload;
  }, {});

exports.createProject = async (req, res) => {
  try {
    const payload = buildProjectPayload(req.body);

    if (!payload.companyName) {
      return res.status(400).json({ message: "Company name is required" });
    }

    const project = await Project.create({
      ...payload,
      tenantId: req.tenantId,
      createdBy: req.user.id,
    });

    return res.status(201).json({ message: "Project created successfully", project });
  } catch (error) {
    console.error("Error creating project:", error);
    return res.status(500).json({ message: error.message || "Failed to create project" });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find(withTenant({}, req))
      .populate({ path: "createdBy", select: "name email", options: POPULATE_SKIP_TENANT })
      .sort({ createdAt: -1 });

    return res.json({ projects, total: projects.length });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch projects" });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const payload = buildProjectPayload(req.body);

    const project = await Project.findOneAndUpdate(withTenant({ _id: req.params.id }, req), payload, {
      new: true,
      runValidators: true,
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    return res.json({ message: "Project updated successfully", project });
  } catch (error) {
    console.error("Error updating project:", error);
    return res.status(500).json({ message: error.message || "Failed to update project" });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findOneAndDelete(withTenant({ _id: req.params.id }, req));

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    return res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    return res.status(500).json({ message: error.message || "Failed to delete project" });
  }
};
