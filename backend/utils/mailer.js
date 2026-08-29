const crypto    = require("crypto");
const nodemailer = require("nodemailer");
const TenantSMTP = require("../models/TenantSMTP");

// ── Encryption helpers (AES-256-CBC) ────────────────────────────────────────
// The key is derived from ENCRYPTION_KEY env var (falls back to JWT_SECRET).
// We hash it to exactly 32 bytes so it always works regardless of key length.
const encKey = () => {
  const raw = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || "fallback-dev-key-change-in-production";
  return crypto.createHash("sha256").update(raw).digest();
};

exports.encryptPassword = (plain) => {
  const iv  = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", encKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return { enc: enc.toString("hex"), iv: iv.toString("hex") };
};

exports.decryptPassword = (hex, ivHex) => {
  const decipher = crypto.createDecipheriv("aes-256-cbc", encKey(), Buffer.from(ivHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(hex, "hex")), decipher.final()]).toString("utf8");
};

// ── createTenantTransporter ──────────────────────────────────────────────────
// Returns { transporter, fromName, fromEmail }.
// Priority: tenant SMTP config → platform .env SMTP.
exports.createTenantTransporter = async (tenantId) => {
  let cfg = null;

  if (tenantId) {
    try {
      cfg = await TenantSMTP.findOne({ tenantId, enabled: true }).lean();
    } catch {
      // DB error — fall through to platform defaults
    }
  }

  if (cfg && cfg.host && cfg.username && cfg.passwordEnc) {
    let password;
    try {
      password = exports.decryptPassword(cfg.passwordEnc, cfg.passwordIv);
    } catch {
      throw Object.assign(new Error("Failed to decrypt tenant SMTP password — please re-save SMTP settings."), { statusCode: 500 });
    }

    const port   = cfg.port || 587;
    const secure = cfg.secure || false;
    const transporter = nodemailer.createTransport({
      host:       cfg.host,
      port,
      secure,
      requireTLS: !secure && port === 587,
      auth:       { user: cfg.username, pass: password },
      tls:        { rejectUnauthorized: false },
    });

    return {
      transporter,
      fromName:  cfg.fromName  || cfg.username,
      fromEmail: cfg.fromEmail || cfg.username,
    };
  }

  // ── Fall back to platform .env ───────────────────────────────────────────
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw Object.assign(
      new Error("Email is not configured. Ask the platform admin to set SMTP settings or configure your own in Settings → Email Configuration."),
      { statusCode: 500 }
    );
  }

  const platformPort   = Number(SMTP_PORT);
  const platformSecure = process.env.SMTP_SECURE === "true" || platformPort === 465;
  const transporter = nodemailer.createTransport({
    host:       SMTP_HOST,
    port:       platformPort,
    secure:     platformSecure,
    requireTLS: !platformSecure && platformPort === 587,
    auth:       { user: SMTP_USER, pass: SMTP_PASS },
    tls:        { rejectUnauthorized: false },
  });

  return {
    transporter,
    fromName:  process.env.SMTP_FROM_NAME  || "CRM",
    fromEmail: process.env.SMTP_FROM_EMAIL || SMTP_USER,
  };
};
