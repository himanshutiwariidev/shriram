const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const checkFeature = require("../middleware/checkFeature");
const {
  getCategories, createCategory, updateCategory, deleteCategory,
} = require("../controllers/expenseCategoryController");

router.use(authMiddleware, checkFeature("expenses"));

router.get("/",       getCategories);
router.post("/",      createCategory);
router.put("/:id",    updateCategory);
router.delete("/:id", deleteCategory);

module.exports = router;
