const Branch = require("../models/Branch");
const { withTenant, POPULATE_SKIP_TENANT } = require("../utils/tenantQuery");

exports.createBranch = async (req, res) => {
  try {
    const { name, address, manager, phone, workingHours, timezone, status } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Branch name is required" });
    }

    const branch = await Branch.create({
      tenantId: req.tenantId,
      name,
      address,
      manager: manager || undefined,
      phone,
      workingHours,
      timezone,
      status: status || undefined,
    });

    return res.status(201).json({ message: "Branch created successfully", branch });
  } catch (error) {
    console.error("Error creating branch:", error);
    return res.status(500).json({ message: error.message || "Failed to create branch" });
  }
};

exports.getBranches = async (req, res) => {
  try {
    const branches = await Branch.find(withTenant({}, req))
      .populate({ path: "manager", select: "name email", options: POPULATE_SKIP_TENANT })
      .sort({ createdAt: -1 });

    return res.json({ branches, total: branches.length });
  } catch (error) {
    console.error("Error fetching branches:", error);
    return res.status(500).json({ message: error.message || "Failed to fetch branches" });
  }
};

exports.updateBranch = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.manager === "") payload.manager = null;

    const branch = await Branch.findOneAndUpdate(withTenant({ _id: req.params.id }, req), payload, {
      new: true,
      runValidators: true,
    });

    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    return res.json({ message: "Branch updated successfully", branch });
  } catch (error) {
    console.error("Error updating branch:", error);
    return res.status(500).json({ message: error.message || "Failed to update branch" });
  }
};

exports.deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findOneAndDelete(withTenant({ _id: req.params.id }, req));

    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    return res.json({ message: "Branch deleted successfully" });
  } catch (error) {
    console.error("Error deleting branch:", error);
    return res.status(500).json({ message: error.message || "Failed to delete branch" });
  }
};
