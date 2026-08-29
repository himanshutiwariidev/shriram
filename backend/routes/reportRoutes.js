const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminOnly");
const { runReport, getSavedReports, saveReport, deleteSavedReport } = require("../controllers/reportController");

router.post("/run", authMiddleware, adminOnly, runReport);
router.get("/saved", authMiddleware, adminOnly, getSavedReports);
router.post("/saved", authMiddleware, adminOnly, saveReport);
router.delete("/saved/:id", authMiddleware, adminOnly, deleteSavedReport);

module.exports = router;
