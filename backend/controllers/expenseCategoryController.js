const asyncHandler = require("../utils/asyncHandler");
const ExpenseCategory = require("../models/ExpenseCategory");
const { withTenant } = require("../utils/tenantQuery");

const DEFAULT_CATEGORIES = [
  { name: "Salary",        color: "#10b981", icon: "IndianRupee" },
  { name: "Office Rent",   color: "#6366f1", icon: "Building2"   },
  { name: "Electricity",   color: "#f59e0b", icon: "Zap"         },
  { name: "Internet",      color: "#3b82f6", icon: "Wifi"        },
  { name: "Travel",        color: "#8b5cf6", icon: "Car"         },
  { name: "Food & Meals",  color: "#ef4444", icon: "UtensilsCrossed" },
  { name: "Marketing",     color: "#ec4899", icon: "Megaphone"   },
  { name: "Software",      color: "#14b8a6", icon: "Monitor"     },
  { name: "Hosting",       color: "#0ea5e9", icon: "Server"      },
  { name: "Miscellaneous", color: "#94a3b8", icon: "Package"     },
];

exports.getCategories = asyncHandler(async (req, res) => {
  let categories = await ExpenseCategory.find(withTenant({ isActive: true }, req)).sort({ name: 1 });

  if (categories.length === 0) {
    const docs = DEFAULT_CATEGORIES.map((c) => ({ ...c, tenantId: req.tenantId }));
    categories = await ExpenseCategory.insertMany(docs);
  }

  res.json({ categories });
});

exports.createCategory = asyncHandler(async (req, res) => {
  const { name, color, icon } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "Category name is required" });

  const category = await ExpenseCategory.create(
    withTenant({ name: name.trim(), color: color || "#f7931e", icon: icon || "Receipt" }, req)
  );
  res.status(201).json({ category });
});

exports.updateCategory = asyncHandler(async (req, res) => {
  const { name, color, icon, isActive } = req.body;
  const category = await ExpenseCategory.findOneAndUpdate(
    withTenant({ _id: req.params.id }, req),
    { $set: { ...(name && { name }), ...(color && { color }), ...(icon && { icon }), ...(isActive !== undefined && { isActive }) } },
    { new: true }
  );
  if (!category) return res.status(404).json({ message: "Category not found" });
  res.json({ category });
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  const category = await ExpenseCategory.findOneAndDelete(withTenant({ _id: req.params.id }, req));
  if (!category) return res.status(404).json({ message: "Category not found" });
  res.json({ message: "Category deleted" });
});
