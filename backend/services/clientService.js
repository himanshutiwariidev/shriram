const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { createTenantTransporter } = require("../utils/mailer");

const formatCurrency = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatAmount = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

// PDFKit's standard Helvetica font has no ₹ glyph (renders as a broken superscript),
// so PDF-rendered amounts use a plain "Rs." prefix instead — the existing proposal
// PDF avoids this the same way by labelling currency separately.
const formatCurrencyForPdf = (value, currency = "INR") =>
  currency && currency !== "INR" ? `${currency} ${formatAmount(value)}` : `Rs. ${formatAmount(value)}`;

const buildProposalNumber = () => `PROP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const buildReminderNumber = () => `REMIND-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const proposalAsset = (fileName) => {
  const assetPath = path.join(__dirname, "../../frontend/src/assets", fileName);
  return fs.existsSync(assetPath) ? assetPath : null;
};

const textOrFallback = (value, fallback = "N/A") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const drawSectionTitle = (doc, title, x, y, width) => {
  doc
    .fillColor("#111827")
    .font("Helvetica-Bold")
    .fontSize(13)
    .text(title.toUpperCase(), x, y, { width });

  doc
    .moveTo(x, y + 22)
    .lineTo(x + width, y + 22)
    .lineWidth(1)
    .strokeColor("#f59e0b")
    .stroke();
};

const drawInfoRow = (doc, label, value, x, y, width) => {
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor("#9a3412")
    .text(label.toUpperCase(), x, y, { width });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#111827")
    .text(textOrFallback(value), x, y + 12, { width, lineGap: 1 });
};

const buildInvoiceNumber = (proposal) => `INV-${proposal.proposalNumber || proposal._id}`;

// Self-contained invoice generator — deliberately NOT sharing closures with
// generateProposalPdf below (that function's draw* helpers are tuned/fragile from
// many rounds of visual fixes; duplicating the branding constants here is safer
// than risking a regression in the proposal PDF via a shared refactor).
const generateInvoicePdf = async ({ client, proposal }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const buffers = [];
    const logoPath = proposalAsset("logo.png");
    const page = { width: 595.28, height: 841.89 };
    const colors = {
      black: "#061216",
      orange: "#f59e0b",
      orangeDark: "#c2410c",
      orangeSoft: "#fff7ed",
      text: "#111827",
      muted: "#6b7280",
      line: "#f3d3a4",
      white: "#ffffff",
    };
    const contentX = 52;
    const contentWidth = page.width - 104;

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const today = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
    const drawCard = (x, y, width, height, fill = colors.white) => {
      doc.roundedRect(x, y, width, height, 9).fillAndStroke(fill, "#f2d7af");
    };

    // ── background + header ──
    doc.rect(0, 0, page.width, page.height).fill("#fbfbfa");
    doc.rect(0, 0, page.width, 6).fill(colors.orange);

    const logoY = 36;
    const logoHeight = 44;
    if (logoPath) {
      doc.image(logoPath, contentX, logoY, { fit: [260, logoHeight], align: "left", valign: "center" });
    } else {
      doc.font("Helvetica-Bold").fontSize(20).fillColor(colors.black).text("Bharat Bizmart", contentX, logoY + 12);
    }
    doc
      .font("Helvetica-Bold")
      .fontSize(28)
      .fillColor(colors.orangeDark)
      .text("INVOICE", contentX, logoY + 4, { width: contentWidth, align: "right" });
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(colors.muted)
      .text(buildInvoiceNumber(proposal), contentX, logoY + 36, { width: contentWidth, align: "right" })
      .text(`Date: ${today}`, contentX, logoY + 50, { width: contentWidth, align: "right" });

    doc
      .moveTo(contentX, logoY + logoHeight + 22)
      .lineTo(contentX + contentWidth, logoY + logoHeight + 22)
      .lineWidth(0.75)
      .strokeColor(colors.line)
      .stroke();

    doc.y = logoY + logoHeight + 40;

    // ── bill to ──
    const billY = doc.y;
    drawCard(contentX, billY, contentWidth, 92, colors.orangeSoft);
    drawInfoRow(doc, "Billed To", client.clientName, contentX + 20, billY + 16, contentWidth - 40);
    drawInfoRow(doc, "Company", textOrFallback(client.companyName), contentX + 20, billY + 44, (contentWidth - 40) / 2);
    drawInfoRow(doc, "Email", textOrFallback(client.email), contentX + 20 + (contentWidth - 40) / 2, billY + 44, (contentWidth - 40) / 2);
    doc.y = billY + 112;

    // ── line item table ──
    const tableY = doc.y;
    drawSectionTitle(doc, "Project Summary", contentX, tableY, contentWidth);
    const rowY = tableY + 36;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(colors.muted);
    doc.text("DESCRIPTION", contentX, rowY, { width: contentWidth * 0.55 });
    doc.text("AMOUNT", contentX + contentWidth * 0.55, rowY, { width: contentWidth * 0.45, align: "right" });
    doc
      .moveTo(contentX, rowY + 16)
      .lineTo(contentX + contentWidth, rowY + 16)
      .lineWidth(0.75)
      .strokeColor(colors.line)
      .stroke();

    doc.font("Helvetica").fontSize(10.5).fillColor(colors.text);
    doc.text(textOrFallback(proposal.projectName, "Project"), contentX, rowY + 26, { width: contentWidth * 0.55 });
    doc.text(formatCurrencyForPdf(proposal.projectAmount, proposal.currency), contentX + contentWidth * 0.55, rowY + 26, {
      width: contentWidth * 0.45,
      align: "right",
    });

    doc.y = rowY + 60;

    // ── totals ──
    const totalsY = doc.y;
    const totalsWidth = 220;
    const totalsX = contentX + contentWidth - totalsWidth;
    drawCard(totalsX, totalsY, totalsWidth, 96, "#fffaf3");
    const totalsRow = (label, value, offsetY, bold = false) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(10).fillColor(bold ? colors.orangeDark : colors.text);
      doc.text(label, totalsX + 16, totalsY + offsetY, { width: totalsWidth - 80 });
      doc.text(formatCurrencyForPdf(value, proposal.currency), totalsX + 16, totalsY + offsetY, { width: totalsWidth - 32, align: "right" });
    };
    totalsRow("Total", proposal.projectAmount, 16);
    totalsRow("Received", proposal.receivedAmount, 40);
    totalsRow("Due", proposal.dueAmount, 64, true);

    doc.y = totalsY + 120;

    // ── bank details (same account used for proposals) ──
    const bankY = doc.y;
    drawCard(contentX, bankY, contentWidth, 110, "#fffaf3");
    drawSectionTitle(doc, "Account Details", contentX + 16, bankY + 16, contentWidth - 32);
    drawInfoRow(doc, "Bank Name", "Bank Of Baroda", contentX + 18, bankY + 52, 150);
    drawInfoRow(doc, "IFSC", "BARB0ROHDEL", contentX + 178, bankY + 52, 110);
    drawInfoRow(doc, "Beneficiary Name", "Bharat Bizmart", contentX + 298, bankY + 52, 172);
    drawInfoRow(doc, "Account Number", "3733020000670", contentX + 18, bankY + 82, 250);

    // ── footer ──
    const footerY = page.height - 60;
    doc
      .moveTo(contentX, footerY)
      .lineTo(contentX + contentWidth, footerY)
      .lineWidth(1)
      .strokeColor(colors.line)
      .stroke();
    doc.font("Helvetica").fontSize(8).fillColor(colors.muted).text(`Generated on ${today}`, contentX, footerY + 14, { width: 200 });

    doc.end();
  });
};

const generateProposalPdf = async ({ client, proposal }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const buffers = [];
    const logoPath = proposalAsset("logo.png");
    const cybertrickLogoPath = proposalAsset("cybertrick.png");
    const signatureFontPath = proposalAsset("DancingScript-Regular.ttf");
    if (signatureFontPath) {
      doc.registerFont("Signature", signatureFontPath);
    }
    const page = { width: 595.28, height: 841.89 };
    const colors = {
      black: "#061216",
      orange: "#f59e0b",
      orangeDark: "#c2410c",
      orangeSoft: "#fff7ed",
      text: "#111827",
      muted: "#6b7280",
      line: "#f3d3a4",
      white: "#ffffff",
    };

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const today = new Date().toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const validUntil = proposal.validUntil
      ? new Date(proposal.validUntil).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "To be discussed";
    const address = [client.address, client.city, client.state, client.country, client.zipCode].filter(Boolean).join(", ");
    const contactDetails = ["+91-8287477783", "bizmartbharat@gmail.com", "info@bharatbizmart.com", "cybertricksmedia.com"];
    const gstin = "GSTIN: 07BVOPR6276F1ZY";
    const contentX = 52;
    const contentWidth = page.width - 104;
    const bottomLimit = page.height - 92;
    let currentPage = 1;

    const addNewProposalPage = () => {
      drawFooter();
      doc.addPage({ size: "A4", margin: 0 });
      currentPage += 1;
      drawPageBackground();
      doc.y = 74;
    };

    const addPageIfNeeded = (neededHeight) => {
      if (doc.y + neededHeight <= bottomLimit) return;
      addNewProposalPage();
    };

    const drawPageBackground = () => {
      doc.rect(0, 0, page.width, page.height).fill("#fbfbfa");
      doc.rect(0, 0, 18, page.height).fill(colors.orange);
      doc.rect(page.width - 18, 0, 18, page.height).fill(colors.black);
      doc.circle(page.width - 72, 94, 72).fillOpacity(0.08).fill(colors.orange).fillOpacity(1);
      doc.circle(72, page.height - 54, 58).fillOpacity(0.08).fill(colors.orangeDark).fillOpacity(1);
    };

    const drawServiceChips = (items, rightX, y) => {
      const chipHeight = 21;
      const chipGap = 7;
      const paddingX = 11;
      const palette = [colors.black, colors.orangeDark, colors.black, colors.orangeDark];
      let cursorX = rightX;

      for (let i = items.length - 1; i >= 0; i -= 1) {
        const label = items[i];
        doc.font("Helvetica-Bold").fontSize(8.5);
        const w = doc.widthOfString(label) + paddingX * 2;
        cursorX -= w;
        const fill = palette[i % palette.length];
        doc.roundedRect(cursorX, y, w, chipHeight, chipHeight / 2).fill(fill);
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor(colors.white)
          .text(label, cursorX, y + 6, { width: w, align: "center" });
        cursorX -= chipGap;
      }
    };

    const drawHeader = () => {
      const headerHeight = 196;
      doc.rect(0, 0, page.width, headerHeight).fill(colors.white);
      doc.rect(0, 0, page.width, 6).fill(colors.orange);
      doc.circle(page.width - 30, 8, 70).fillOpacity(0.07).fill(colors.orange).fillOpacity(1);
      doc.circle(page.width - 140, -20, 46).fillOpacity(0.05).fill(colors.orangeDark).fillOpacity(1);

      const logoY = 40;
      const logoHeight = 48;

      if (logoPath) {
        doc.image(logoPath, contentX, logoY, { fit: [300, logoHeight], align: "left", valign: "center" });
      } else {
        doc.font("Helvetica-Bold").fontSize(22).fillColor(colors.black).text("Bharat Bizmart", contentX, logoY + 12);
      }

      if (cybertrickLogoPath) {
        doc.image(cybertrickLogoPath, contentX + contentWidth - 200, logoY, {
          fit: [200, logoHeight],
          align: "right",
          valign: "center",
        });
      }

      doc
        .moveTo(contentX, logoY + logoHeight + 10)
        .lineTo(contentX + contentWidth, logoY + logoHeight + 10)
        .lineWidth(0.75)
        .strokeColor(colors.line)
        .stroke();

      drawServiceChips(["Web App", "Android App", "Ads", "SMM"], contentX + contentWidth, logoY + logoHeight + 20);

      const barY = headerHeight - 52;
      doc.roundedRect(contentX, barY, contentWidth, 46, 8).fillAndStroke(colors.orangeSoft, colors.line);
      doc
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .fillColor(colors.orangeDark)
        .text(contactDetails.join("    |    "), contentX + 14, barY + 10, {
          width: contentWidth - 28,
          align: "center",
        });
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(colors.muted)
        .text(gstin, contentX + 14, barY + 27, {
          width: contentWidth - 28,
          align: "center",
        });

      doc.rect(0, headerHeight - 4, page.width, 4).fill(colors.orange);
    };

    const drawFooter = () => {
      const y = page.height - 82;
      doc
        .moveTo(52, y)
        .lineTo(page.width - 52, y)
        .lineWidth(1)
        .strokeColor(colors.line)
        .stroke();
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(colors.muted)
        .text(`Generated on ${today}`, 52, y + 16, { width: 170 });
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(colors.orangeDark)
        .text("visit us:himanshutiwari.vercel.app", page.width - 222, y + 16, { width: 170, align: "right" });
    };

    const drawCard = (x, y, width, height, fill = colors.white) => {
      doc.roundedRect(x, y, width, height, 9).fillAndStroke(fill, "#f2d7af");
    };

    const drawParagraphCard = (title, body, x, y, width) => {
      const bodyText = textOrFallback(body, "To be discussed");
      const bodyHeight = doc.font("Helvetica").fontSize(10).heightOfString(bodyText, {
        width: width - 32,
        lineGap: 4,
      });
      const height = Math.max(108, bodyHeight + 64);
      addPageIfNeeded(height + 18);
      y = doc.y;
      drawCard(x, y, width, height);
      drawSectionTitle(doc, title, x + 16, y + 16, width - 32);
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(colors.text)
        .text(bodyText, x + 16, y + 54, { width: width - 32, lineGap: 4 });
      doc.y = y + height + 18;
    };

    const drawDeliverablesCard = () => {
      const deliverables = Array.isArray(proposal.deliverables) ? proposal.deliverables : [];

      if (!deliverables.length) {
        if (proposal.projectScope) {
          drawParagraphCard("Scope Of Work", proposal.projectScope, contentX, doc.y, contentWidth);
        }
        return;
      }

      const rowHeight = 24;
      const height = Math.max(108, deliverables.length * rowHeight + 64);
      addPageIfNeeded(height + 18);
      const y = doc.y;
      drawCard(contentX, y, contentWidth, height);
      drawSectionTitle(doc, "Scope Of Work", contentX + 16, y + 16, contentWidth - 32);

      let rowY = y + 54;
      deliverables.forEach((item) => {
        const frequencyLabel =
          item.frequency === "week" ? "per week" : item.frequency === "month" ? "per month" : "one-time";

        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor(colors.text)
          .text(`•  ${textOrFallback(item.title)}`, contentX + 24, rowY, { width: contentWidth - 220 });
        doc
          .font("Helvetica")
          .fontSize(9.5)
          .fillColor(colors.muted)
          .text(`${textOrFallback(item.quantity, "0")} ${frequencyLabel}`, contentX + contentWidth - 180, rowY, {
            width: 156,
            align: "right",
          });
        rowY += rowHeight;
      });

      doc.y = y + height + 18;
    };

    const drawTimelinePaymentCard = () => {
      addPageIfNeeded(98);
      const y = doc.y;
      drawCard(contentX, y, contentWidth, 78, colors.orangeSoft);
      drawSectionTitle(doc, "Timeline & Payment Terms", contentX + 16, y + 14, contentWidth - 32);
      drawInfoRow(doc, "Timeline", proposal.timeline || "To be agreed upon", contentX + 18, y + 48, 160);
      drawInfoRow(
        doc,
        "Payment Terms",
        proposal.paymentTerms || "Payment terms will be discussed and finalized before project kickoff.",
        contentX + 210,
        y + 48,
        250
      );
      doc.y = y + 96;
    };

    const drawAccountDetails = () => {
      if (currentPage === 1) {
        addNewProposalPage();
      }

      addPageIfNeeded(176);
      const y = doc.y;
      drawCard(contentX, y, contentWidth, 136, "#fffaf3");
      drawSectionTitle(doc, "Account Details", contentX + 16, y + 16, contentWidth - 32);
      drawInfoRow(doc, "Bank Name", "Bank Of Baroda", contentX + 18, y + 52, 150);
      drawInfoRow(doc, "IFSC", "BARB0ROHDEL", contentX + 178, y + 52, 110);
      drawInfoRow(doc, "Beneficiary Name", "Bharat Bizmart", contentX + 298, y + 52, 172);
      drawInfoRow(doc, "Account Number", "3733020000670", contentX + 18, y + 92, 150);
      drawInfoRow(
        doc,
        "Branch",
        "H.No. 1, Pocket A, Rohini, Sector - 15, Delhi - 110085",
        contentX + 178,
        y + 92,
        292
      );

      doc.y = y + 156;
    };

    drawPageBackground();
    drawHeader();

    doc.y = 228;
    doc
      .font("Helvetica-Bold")
      .fontSize(26)
      .fillColor(colors.orangeDark)
      .text(`Project Proposal - ${textOrFallback(proposal.projectName, "Project")}`, contentX, doc.y, {
        width: contentWidth,
        align: "center",
      });
    doc
      .moveTo(154, doc.y + 12)
      .lineTo(page.width - 154, doc.y + 12)
      .lineWidth(1.2)
      .strokeColor(colors.orange)
      .stroke();

    doc.y += 36;
    const introY = doc.y;
    drawCard(contentX, introY, contentWidth, 110, colors.orangeSoft);
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(colors.orangeDark)
      .text("PREPARED FOR", contentX + 20, introY + 18, { width: 120 });
    doc
      .font("Helvetica-Bold")
      .fontSize(17)
      .fillColor(colors.text)
      .text(textOrFallback(client.clientName), contentX + 20, introY + 34, { width: 228 });
    doc
      .font("Helvetica")
      .fontSize(9.5)
      .fillColor(colors.muted)
      .text(textOrFallback(client.companyName, client.email), contentX + 20, introY + 58, { width: 228 });

    drawInfoRow(doc, "Proposal Number", proposal.proposalNumber, contentX + 286, introY + 16, 188);
    drawInfoRow(doc, "Proposal Date", today, contentX + 286, introY + 58, 86);
    drawInfoRow(doc, "Valid Until", validUntil, contentX + 386, introY + 58, 88);
    doc.y = introY + 134;

    const detailsY = doc.y;
    drawCard(contentX, detailsY, 238, 148);
    drawSectionTitle(doc, "Client Details", contentX + 16, detailsY + 16, 206);
    drawInfoRow(doc, "Email", client.email, contentX + 16, detailsY + 50, 206);
    drawInfoRow(doc, "Phone", client.phone, contentX + 16, detailsY + 82, 206);
    drawInfoRow(doc, "Address", address || "N/A", contentX + 16, detailsY + 112, 200);

    drawCard(contentX + 258, detailsY, 233, 148, "#fffaf3");
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(colors.orangeDark)
      .text("PROJECT VALUE", contentX + 276, detailsY + 20, { width: 190 });
    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .fillColor(colors.black)
      .text(formatAmount(proposal.projectAmount), contentX + 276, detailsY + 42, {
        width: 196,
      });
    drawInfoRow(doc, "Currency", proposal.currency || "INR", contentX + 276, detailsY + 92, 90);
    doc.y = detailsY + 174;

    drawParagraphCard("Project Overview", proposal.projectDescription, contentX, doc.y, contentWidth);

    drawDeliverablesCard();

    drawTimelinePaymentCard();

    drawAccountDetails();

    addPageIfNeeded(132);
    const signY = doc.y;
    drawCard(contentX, signY, contentWidth, 106, "#fffaf3");
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(colors.black)
      .text("Prepared and submitted by", contentX + 18, signY + 20, { width: 220 });
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(colors.muted)
      .text("Thank you for considering this proposal. We look forward to building something polished, reliable, and ready to grow.", contentX + 18, signY + 42, {
        width: 260,
        lineGap: 3,
      });
    doc
      .font(signatureFontPath ? "Signature" : "Helvetica-BoldOblique")
      .fontSize(signatureFontPath ? 22 : 16)
      .fillColor(colors.orangeDark)
      .text("Sunny Rathore", contentX + 314, signY + 30, { width: 150, align: "center" });
    doc
      .moveTo(contentX + 314, signY + 66)
      .lineTo(contentX + 462, signY + 66)
      .lineWidth(1)
      .strokeColor(colors.orange)
      .stroke();
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(colors.text)
      .text("Authorized Signature", contentX + 314, signY + 74, { width: 150, align: "center" });
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(colors.muted)

    drawFooter();
    doc.end();
  });
};

const buildProposalEmailText = ({ client }) =>
  `Dear ${client.clientName},

Please find attached your project proposal in PDF format.`;

const buildProposalEmailHtml = ({ client }) =>
  `<p>Dear ${client.clientName},</p><p>Please find attached your project proposal in PDF format.</p>`;


const buildPaymentReminderEmailHtml = ({ client, reminder }) => {
  return `
    <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px; color: #0f172a;">
      <div style="max-width: 760px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #dc2626, #ea580c); color: white; padding: 28px 32px;">
          <h1 style="margin: 0; font-size: 24px;">Payment Reminder</h1>
          <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">Payment Due Reminder - Invoice ${reminder.invoiceNumber || "N/A"}</p>
        </div>
        <div style="padding: 28px 32px;">
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; color: #991b1b;">
              <strong>Hello ${client.clientName},</strong><br/><br/>
              This is a friendly reminder that payment is due on your account.
            </p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px;">
              <div style="font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #991b1b;">Amount Due</div>
              <div style="font-size: 18px; font-weight: 700; margin-top: 8px; color: #dc2626;">${formatCurrency(reminder.amountDue, reminder.currency)}</div>
            </div>
            <div style="background: #fafafa; border: 1px solid #d4d4d8; border-radius: 8px; padding: 16px;">
              <div style="font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #52525b;">Due Date</div>
              <div style="font-size: 16px; font-weight: 700; margin-top: 8px; color: #0f172a;">
                ${reminder.dueDate ? new Date(reminder.dueDate).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : "On demand"}
              </div>
            </div>
          </div>

          ${reminder.customMessage ? `<div style="background: #f9fafb; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #475569;">
              ${reminder.customMessage}
            </p>
          </div>` : ""}

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
                <strong>Invoice Number:</strong>
              </td>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">
                ${reminder.invoiceNumber || "N/A"}
              </td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
                <strong>Currency:</strong>
              </td>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">
                ${reminder.currency}
              </td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
                <strong>Reminder Type:</strong>
              </td>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">
                ${reminder.reminderType.replace("-", " ").toUpperCase()}
              </td>
            </tr>
          </table>

          <div style="background: #eef2ff; border-left: 4px solid #6366f1; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 13px; color: #3730a3;">
              <strong>Please</strong> arrange payment at your earliest convenience. If payment has already been made, please disregard this reminder or contact us with the transaction details.
            </p>
          </div>

          <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 12px; color: #64748b;">
              Sent on ${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
};

const sendProposalEmail = async ({ client, proposal, tenantId }) => {
  try {
    console.log("Attempting to send proposal email to:", client.email);
    const { transporter, fromName, fromEmail } = await createTenantTransporter(tenantId);

    console.log("Generating PDF for proposal:", proposal.proposalNumber);
    const pdfBuffer = await generateProposalPdf({ client, proposal });
    const safeName = proposal.projectName.replace(/[^a-z0-9-_]/gi, "-");

    console.log("Sending email with attachment to:", client.email);
    const result = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: client.email,
      subject: `Project Proposal: ${proposal.projectName} - ${formatCurrency(proposal.projectAmount, proposal.currency)}`,
      text: buildProposalEmailText({ client }),
      html: buildProposalEmailHtml({ client }),
      attachments: [
        {
          filename: `Proposal-${safeName}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    console.log("Email sent successfully, messageId:", result.messageId);
    return {
      success: true,
      messageId: result.messageId,
      sentAt: new Date(),
    };
  } catch (error) {
    console.error("Failed to send proposal email:", error);
    const err = new Error(`Failed to send proposal email: ${error.message}`);
    err.statusCode = 500;
    throw err;
  }
};

const sendPaymentReminderEmail = async ({ client, reminder, tenantId }) => {
  try {
    const { transporter, fromName, fromEmail } = await createTenantTransporter(tenantId);

    const result = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: client.email,
      subject: `Payment Reminder: ${formatCurrency(reminder.amountDue, reminder.currency)} Due - Invoice ${reminder.invoiceNumber || "N/A"}`,
      html: buildPaymentReminderEmailHtml({ client, reminder }),
    });

    return {
      success: true,
      messageId: result.messageId,
      sentAt: new Date(),
    };
  } catch (error) {
    const err = new Error(`Failed to send payment reminder email: ${error.message}`);
    err.statusCode = 500;
    throw err;
  }
};

module.exports = {
  buildProposalNumber,
  buildReminderNumber,
  generateProposalPdf,
  generateInvoicePdf,
  sendProposalEmail,
  sendPaymentReminderEmail,
};
