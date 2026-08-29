const multer = require("multer");
const path = require("path");
const fs = require("fs");

const DEST = path.join(__dirname, "../uploads/expense-attachments");
if (!fs.existsSync(DEST)) fs.mkdirSync(DEST, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, DEST),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});

const ALLOWED = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const fileFilter = (_req, file, cb) => {
  if (ALLOWED.has(file.mimetype)) return cb(null, true);
  cb(new Error("Unsupported file type. Allowed: jpg, png, webp, pdf, doc, docx"), false);
};

const uploadExpenseAttachment = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

module.exports = uploadExpenseAttachment;
