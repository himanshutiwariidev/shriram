// Centralised error handler — must be registered LAST with app.use().
// Never exposes stack traces, internal paths, DB details, or raw error
// messages in production.  Every recognised error class maps to a safe,
// human-readable message.

const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  // Always log internally; never send the stack to the client.
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ${req.method} ${req.originalUrl} — ${err.message}`);
  if (process.env.NODE_ENV !== "production") console.error(err.stack);

  // ── Mongoose: field-level validation errors ─────────────────────────────
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: "Validation failed", errors: messages });
  }

  // ── Mongoose: duplicate key (unique index violation) ────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    const FIELD_MSGS = {
      email: "An account with this email already exists.",
      salarySlipId: "An expense entry for this salary slip already exists.",
      expenseId: "Duplicate expense ID — please try again.",
    };
    const message = FIELD_MSGS[field] || `A record with this ${field} already exists.`;
    return res.status(400).json({ message });
  }

  // ── Mongoose: invalid ObjectId cast ────────────────────────────────────
  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid resource identifier." });
  }

  // ── JWT: signature mismatch or malformed token ──────────────────────────
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  // ── JWT: token has expired ──────────────────────────────────────────────
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  // ── Multer: file too large ──────────────────────────────────────────────
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "File is too large. Maximum size is 10 MB." });
  }

  // ── Multer: wrong field name ────────────────────────────────────────────
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({ message: "Unexpected file field in request." });
  }

  // ── CORS origin rejection ────────────────────────────────────────────────
  if (err.message && err.message.startsWith("CORS:")) {
    return res.status(403).json({ message: "Cross-origin request blocked." });
  }

  // ── Malformed JSON body ──────────────────────────────────────────────────
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ message: "Invalid request body — malformed JSON." });
  }

  // ── Application-level operational errors (statusCode set by controller) ─
  const statusCode = err.statusCode || err.status || 500;

  if (statusCode < 500) {
    return res.status(statusCode).json({ message: err.message || "Request error." });
  }

  // ── Unrecognised server error — never leak details in production ─────────
  return res.status(500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "An internal server error occurred."
        : err.message || "An internal server error occurred.",
  });
};

module.exports = errorHandler;
