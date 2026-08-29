const express = require("express");
const multer  = require("multer");
const router  = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const checkFeature   = require("../middleware/checkFeature");
const { sendEmails } = require("../controllers/mailAutomationController");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post(
  "/send",
  authMiddleware,
  checkFeature("mail_automation"),
  upload.single("file"),
  sendEmails
);

module.exports = router;
