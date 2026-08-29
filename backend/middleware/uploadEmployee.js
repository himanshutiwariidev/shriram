const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subfolder = file.fieldname === "resume" ? "resumes" : "employee-photos";
    const dir = path.join(__dirname, `../uploads/${subfolder}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const fileFilter = (req, file, cb) => {
  const imgExt = /\.(jpg|jpeg|png|webp)$/i;
  const docExt = /\.(pdf|doc|docx)$/i;
  if (file.fieldname === "photo" && imgExt.test(path.extname(file.originalname))) {
    cb(null, true);
  } else if (file.fieldname === "resume" && docExt.test(path.extname(file.originalname))) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type for field "${file.fieldname}"`));
  }
};

const uploadEmployee = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = uploadEmployee;
