const express = require("express");
const router = express.Router();
const {
  createProject,
  getProjects,
  updateProject,
  deleteProject,
} = require("../controllers/projectController");
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");
const checkFeature = require("../middleware/checkFeature");
const checkPlanLimit = require("../middleware/checkPlanLimit");

router.post("/", authMiddleware, checkFeature("projects"), adminOnly, checkPlanLimit("projects"), createProject);
router.get("/", authMiddleware, checkFeature("projects"), adminOnly, getProjects);
router.put("/:id", authMiddleware, checkFeature("projects"), adminOnly, updateProject);
router.delete("/:id", authMiddleware, checkFeature("projects"), adminOnly, deleteProject);

module.exports = router;
