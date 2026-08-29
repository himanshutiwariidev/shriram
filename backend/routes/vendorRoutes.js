const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const checkFeature = require("../middleware/checkFeature");
const {
  getVendors, createVendor, updateVendor, deleteVendor, getVendorStats,
} = require("../controllers/vendorController");

router.use(authMiddleware, checkFeature("expenses"));

router.get("/",           getVendors);
router.post("/",          createVendor);
router.put("/:id",        updateVendor);
router.delete("/:id",     deleteVendor);
router.get("/:id/stats",  getVendorStats);

module.exports = router;
