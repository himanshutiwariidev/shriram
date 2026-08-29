const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const checkFeature = require("../middleware/checkFeature");
const {
  getBudgets, createBudget, updateBudget, deleteBudget,
} = require("../controllers/budgetController");

router.use(authMiddleware, checkFeature("expenses"));

router.get("/",       getBudgets);
router.post("/",      createBudget);
router.put("/:id",    updateBudget);
router.delete("/:id", deleteBudget);

module.exports = router;
