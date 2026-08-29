const { parse } = require("csv-parse/sync");
const { createTenantTransporter } = require("../utils/mailer");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Escape HTML special chars so plain text isn't interpreted as markup
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Convert plain text to HTML: preserve paragraphs and line breaks
function plainToHtml(text) {
  return escapeHtml(text)
    .split(/\n\n+/)
    .map((para) => `<p style="margin:0 0 16px 0">${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

// Replace {firstName} placeholder in text
function personalise(text, firstName) {
  return text.replace(/\{firstName\}/gi, firstName);
}

// Minimal but spam-safe HTML email shell
function buildHtml(bodyHtml, fromName) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Message</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%">
        <tr>
          <td style="padding:32px 40px;color:#1a1a1a;font-size:15px;line-height:1.7">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 40px 28px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280">
            Regards,<br><strong>${escapeHtml(fromName)}</strong>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

exports.sendEmails = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "CSV file is required." });

  const subject  = String(req.body.subject  || "").trim();
  const message  = String(req.body.message  || "").trim();
  const delayMs  = Math.max(0, parseInt(req.body.delayMs, 10) || 3000);

  if (!subject) return res.status(400).json({ message: "Subject is required." });
  if (!message) return res.status(400).json({ message: "Message body is required." });

  // ── Server-Sent Events so the frontend gets live per-email updates ──────────
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const emit = (data) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (typeof res.flush === "function") res.flush();
    }
  };

  try {
    const { transporter, fromName, fromEmail } = await createTenantTransporter(req.tenantId);

    let rows;
    try {
      rows = parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true });
    } catch {
      emit({ type: "error", message: "Could not parse the CSV file. Make sure it has a header row." });
      return res.end();
    }

    if (!rows.length) {
      emit({ type: "error", message: "CSV file is empty." });
      return res.end();
    }

    emit({ type: "start", total: rows.length });

    let sent = 0, failed = 0;

    for (const row of rows) {
      const rawEmail  = row.email || row.Email || row.EMAIL;
      const email     = rawEmail ? String(rawEmail).trim() : "";
      const firstName = (row.firstName || row.firstname || row.first_name || row.name || row.Name || "there").trim();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        failed++;
        emit({ type: "result", email: email || "(empty)", status: "failed", error: "Invalid email address" });
        continue;
      }

      const personalisedSubject = personalise(subject, firstName);
      const personalisedText    = `Hey ${firstName},\n\n${personalise(message, firstName)}\n\nRegards,\n${fromName}`;
      const bodyHtml            = `<p style="margin:0 0 16px 0">Hey <strong>${escapeHtml(firstName)}</strong>,</p>${plainToHtml(personalise(message, firstName))}`;
      const personalisedHtml    = buildHtml(bodyHtml, fromName);

      try {
        await transporter.sendMail({
          from:    `${fromName} <${fromEmail}>`,
          to:      email,
          replyTo: fromEmail,
          subject: personalisedSubject,
          // Sending both text + html = multipart/alternative → far less likely to hit spam
          text:    personalisedText,
          html:    personalisedHtml,
          headers: {
            // Allows recipients to unsubscribe — required by Gmail/Yahoo bulk sender rules
            "List-Unsubscribe": `<mailto:${fromEmail}?subject=Unsubscribe>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            "X-Mailer": "BharatBizmart CRM",
          },
        });
        sent++;
        emit({ type: "result", email, status: "sent" });
      } catch (err) {
        failed++;
        emit({ type: "result", email, status: "failed", error: err.message });
      }

      if (delayMs > 0) await sleep(delayMs);
    }

    emit({ type: "done", total: rows.length, sent, failed });
  } catch (err) {
    emit({ type: "error", message: err.message || "Internal error" });
  }

  res.end();
};
