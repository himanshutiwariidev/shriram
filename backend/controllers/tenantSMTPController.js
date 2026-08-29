const TenantSMTP = require("../models/TenantSMTP");
const { encryptPassword, createTenantTransporter } = require("../utils/mailer");

// GET /api/tenant/smtp  — returns config WITHOUT the password
exports.get = async (req, res) => {
  try {
    const cfg = await TenantSMTP.findOne({ tenantId: req.tenantId }).lean();
    if (!cfg) return res.json({ configured: false });
    return res.json({
      configured: true,
      host:      cfg.host,
      port:      cfg.port,
      secure:    cfg.secure,
      username:  cfg.username,
      fromName:  cfg.fromName,
      fromEmail: cfg.fromEmail,
      enabled:   cfg.enabled,
      // never send passwordEnc / passwordIv to the client
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// POST /api/tenant/smtp  — create or replace
exports.save = async (req, res) => {
  try {
    const { host, port, secure, username, password, fromName, fromEmail, enabled } = req.body;

    if (!host || !port || !username) {
      return res.status(400).json({ message: "Host, port and username are required." });
    }

    const update = { host, port: Number(port), secure: Boolean(secure), username, fromName, fromEmail, enabled: enabled !== false };

    // Only update the encrypted password if a new one was supplied
    if (password) {
      const { enc, iv } = encryptPassword(password);
      update.passwordEnc = enc;
      update.passwordIv  = iv;
    }

    const cfg = await TenantSMTP.findOneAndUpdate(
      { tenantId: req.tenantId },
      { $set: { ...update, tenantId: req.tenantId } },
      { upsert: true, new: true }
    );

    return res.json({ message: "SMTP settings saved.", configured: true, host: cfg.host, port: cfg.port, username: cfg.username });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// DELETE /api/tenant/smtp  — remove tenant SMTP (revert to platform default)
exports.remove = async (req, res) => {
  try {
    await TenantSMTP.deleteOne({ tenantId: req.tenantId });
    return res.json({ message: "SMTP settings removed. Platform default will be used." });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// POST /api/tenant/smtp/test  — verify connection then send a test email
exports.test = async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ message: "Recipient email (to) is required." });

    const { transporter, fromName, fromEmail } = await createTenantTransporter(req.tenantId);

    // Verify SMTP connection first — gives a clear error before trying to send
    try {
      await transporter.verify();
    } catch (verifyErr) {
      const msg = verifyErr.message || "";
      if (msg.includes("Invalid login") || msg.includes("Authentication") || msg.includes("535") || msg.includes("534")) {
        return res.status(500).json({
          message: "Authentication failed. For Gmail, make sure you are using an App Password (not your account password). Generate one at myaccount.google.com/apppasswords — 2-Step Verification must be enabled first.",
        });
      }
      if (msg.includes("ECONNREFUSED") || msg.includes("ETIMEDOUT") || msg.includes("ENOTFOUND")) {
        return res.status(500).json({
          message: `Cannot connect to SMTP server (${verifyErr.message}). Check that the host and port are correct.`,
        });
      }
      return res.status(500).json({ message: `SMTP connection failed: ${verifyErr.message}` });
    }

    await transporter.sendMail({
      from:    `"${fromName}" <${fromEmail}>`,
      to,
      subject: "✅ SMTP Test — Your CRM email is configured correctly",
      text:    `Your SMTP configuration is working correctly. Emails will be sent from ${fromEmail}.`,
      html: `
        <div style="font-family:Arial,sans-serif;padding:32px;background:#f8fafc;color:#0f172a;">
          <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
            <h2 style="margin:0 0 12px;color:#16a34a;">✅ Test email successful!</h2>
            <p style="margin:0;font-size:14px;line-height:1.7;color:#475569;">
              Your SMTP configuration is working correctly.<br>
              Emails will now be sent from <strong>${fromEmail}</strong>.
            </p>
          </div>
        </div>
      `,
    });

    return res.json({ message: `Test email sent to ${to}` });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to send test email" });
  }
};
