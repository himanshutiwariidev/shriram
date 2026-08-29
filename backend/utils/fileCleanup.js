const path = require("path");
const fs = require("fs");

// Deletes a previously-uploaded file given its served /uploads/... path
// (as stored on a document), used before overwriting/removing an
// upload reference so replaced files don't accumulate on disk.
const deletePublicFileIfExists = (publicUrl) => {
  if (!publicUrl) return;
  const filePath = path.join(__dirname, "..", publicUrl);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
};

module.exports = { deletePublicFileIfExists };
