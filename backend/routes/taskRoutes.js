const express = require("express");
const router = express.Router();

const {
  createTask,
  getTask,
  getMyTasks,
  updateTaskStatus,
  deleteTask,
  updateTask,
} = require("../controllers/taskController");

const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");
const checkFeature = require("../middleware/checkFeature");


// 🔐 Admin Routes
router.post("/", authMiddleware, checkFeature("tasks"), adminOnly, createTask);
router.get("/", authMiddleware, checkFeature("tasks"), adminOnly, getTask);
router.delete("/:id", authMiddleware, checkFeature("tasks"), adminOnly, deleteTask);
router.put("/update-task/:id", authMiddleware, checkFeature("tasks"), updateTask);

// 👤 User Routes
router.get("/my-tasks", authMiddleware, checkFeature("tasks"), getMyTasks);
router.patch("/update-status/:id", authMiddleware, checkFeature("tasks"), updateTaskStatus);

module.exports = router;
