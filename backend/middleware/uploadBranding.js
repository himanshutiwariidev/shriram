const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Mirrors the existing PI-attachment upload pattern in clientController.js —
// same diskStorage/filename/fileFilter shape, just a configurable
// destination folder and extension allowlist so it can be reused for other
// image uploads (e.g. owner photos) without duplicating this config.
const createUploader = (subfolder, extensions) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, `../uploads/${subfolder}`);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
    },
  });

  const allowed = new RegExp(`\\.(${extensions.join("|")})$`, "i");
  const fileFilter = (req, file, cb) => {
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error(`Only ${extensions.join(", ").toUpperCase()} files are allowed`));
    }
  };

  return multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });
};

// .ico is accepted here too (not just png/jpg/jpeg/svg/webp) since this
// same uploader also handles favicon uploads, and .ico is a standard
// favicon format — logo uploads simply won't offer a .ico file in practice.
const uploadBranding = createUploader("branding", ["png", "jpg", "jpeg", "svg", "webp", "ico"]);

module.exports = uploadBranding;
module.exports.createUploader = createUploader;
