const Department = require("../models/Department");
const { withTenant, POPULATE_SKIP_TENANT } = require("../utils/tenantQuery");

exports.createDepartment = async (req, res) => {
  try {
    const { name, description, branch } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Department name is required" });
    }

    const department = await Department.create({
      tenantId: req.tenantId,
      name,
      description,
      branch: branch || undefined,
    });

    return res.status(201).json({ message: "Department created successfully", department });
  } catch (error) {
    console.error("Error creating department:", error);
    return res.status(500).json({ message: error.message || "Failed to create department" });
  }
};

exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find(withTenant({}, req))
      .populate({ path: "branch", select: "name", options: POPULATE_SKIP_TENANT })
      .sort({ createdAt: -1 });

    return res.json({ departments, total: departments.length });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch departments" });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.branch === "") payload.branch = null;

    const department = await Department.findOneAndUpdate(withTenant({ _id: req.params.id }, req), payload, {
      new: true,
      runValidators: true,
    });

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    return res.json({ message: "Department updated successfully", department });
  } catch (error) {
    console.error("Error updating department:", error);
    return res.status(500).json({ message: error.message || "Failed to update department" });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findOneAndDelete(withTenant({ _id: req.params.id }, req));

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    return res.json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error("Error deleting department:", error);
    return res.status(500).json({ message: error.message || "Failed to delete department" });
  }
};
