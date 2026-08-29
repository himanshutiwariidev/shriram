const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleAccess");
const {
  getCycles, createCycle, openCycle, closeCycle, deleteCycle,
  getAppraisals, getMyAppraisals, selfAssess, managerReview,
} = require("../controllers/performanceController");

// Review cycles — HR / Admin manage
router.get("/cycles", authMiddleware, getCycles);
router.post("/cycles", authMiddleware, requireRole("admin", "hr"), createCycle);
router.put("/cycles/:id/open", authMiddleware, requireRole("admin", "hr"), openCycle);
router.put("/cycles/:id/close", authMiddleware, requireRole("admin", "hr"), closeCycle);
router.delete("/cycles/:id", authMiddleware, requireRole("admin", "hr"), deleteCycle);

// Appraisals
router.get("/appraisals", authMiddleware, requireRole("admin", "hr"), getAppraisals);
router.get("/my-appraisals", authMiddleware, getMyAppraisals);
router.put("/appraisals/:id/self-assess", authMiddleware, selfAssess);
router.put("/appraisals/:id/review", authMiddleware, requireRole("admin", "hr"), managerReview);

module.exports = router;
