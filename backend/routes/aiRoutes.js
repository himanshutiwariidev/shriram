const express = require("express");
const router  = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getConfig, saveConfig, chat } = require("../controllers/aiController");

router.get("/config",  authMiddleware, getConfig);
router.post("/config", authMiddleware, saveConfig);
router.post("/chat",   authMiddleware, chat);

module.exports = router;
