const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const checkFeature = require("../middleware/checkFeature");
const uploadExpenseAttachment = require("../middleware/uploadExpenseAttachment");
const {
  getExpenseDashboard,
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  updateExpenseStatus,
  uploadAttachment,
  getExpenseReport,
} = require("../controllers/expenseController");

router.use(authMiddleware, checkFeature("expenses"));

router.get("/dashboard",              getExpenseDashboard);
router.get("/report",                 getExpenseReport);
router.get("/",                       getExpenses);
router.post("/",                      createExpense);
router.get("/:id",                    getExpenseById);
router.put("/:id",                    updateExpense);
router.delete("/:id",                 deleteExpense);
router.patch("/:id/status",           updateExpenseStatus);
router.post("/:id/attachments",       uploadExpenseAttachment.single("file"), uploadAttachment);

module.exports = router;
