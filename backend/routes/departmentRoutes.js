const express = require("express");
const router = express.Router();

const { createDepartment, getDepartments, updateDepartment, deleteDepartment } = require("../controllers/departmentController");
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");
const { departmentValidator } = require("../middleware/validator");
const checkFeature = require("../middleware/checkFeature");
const checkPlanLimit = require("../middleware/checkPlanLimit");

router.get("/", authMiddleware, checkFeature("departments"), requireRole("admin", "hr"), getDepartments);
router.post("/", authMiddleware, checkFeature("departments"), requireRole("admin"), checkPlanLimit("departments"), departmentValidator, createDepartment);
router.put("/:id", authMiddleware, checkFeature("departments"), requireRole("admin"), departmentValidator, updateDepartment);
router.delete("/:id", authMiddleware, checkFeature("departments"), requireRole("admin"), deleteDepartment);

module.exports = router;
