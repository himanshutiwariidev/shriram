const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const checkFeature = require("../middleware/checkFeature");
const { scrape } = require("../controllers/gmbController");

router.get("/scrape", authMiddleware, checkFeature("gmb_scraper"), scrape);

module.exports = router;
