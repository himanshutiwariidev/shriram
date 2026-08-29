const User = require("../models/User");
const SalarySlip = require("../models/salaryModel");
const PDFDocument = require("pdfkit");
const { withTenant } = require("../utils/tenantQuery");

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatAmount = (value) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const parseMoney = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getDaysInSalaryMonth = (salaryMonth) => {
  const match = /^(\d{4})-(\d{2})$/.exec(String(salaryMonth || "").trim());
  if (!match) return 30;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return 30;

  return new Date(year, monthIndex + 1, 0).getDate();
};

const calculateSalaryBreakdown = ({
  salaryMonth,
  basicSalary,
  homeAllowance,
  travelAllowance,
  otherAllowance,
  leaves,
  pf,
  deductions,
}) => {
  const daysInMonth = getDaysInSalaryMonth(salaryMonth);
  const normalizedLeaves = Math.max(0, Math.min(Number(leaves) || 0, daysInMonth));
  const perDaySalary = daysInMonth ? basicSalary / daysInMonth : 0;
  const leaveDeduction = Number((perDaySalary * normalizedLeaves).toFixed(2));
  const totalAllowances = homeAllowance + travelAllowance + otherAllowance;
  const totalDeductions = pf + deductions + leaveDeduction;
  const inHand = Math.max(0, Number((basicSalary + totalAllowances - totalDeductions).toFixed(2)));

  return {
    daysInMonth,
    normalizedLeaves,
    leaveDeduction,
    totalAllowances,
    totalDeductions,
    inHand,
  };
};

const buildSlipNumber = () => `SLIP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const { createTenantTransporter } = require("../utils/mailer");

const buildSalarySlipHtml = ({ user, slip }) => {
  const totalAllowances = slip.homeAllowance + slip.travelAllowance + slip.otherAllowance;
  const totalDeductions = slip.pf + slip.deductions + (slip.leaveDeduction || 0);

  return `
    <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px; color: #0f172a;">
      <div style="max-width: 760px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #4f46e5, #0891b2); color: white; padding: 28px 32px;">
          <h1 style="margin: 0; font-size: 26px;">Salary Slip</h1>
          <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">Automatically generated for ${slip.salaryMonth}</p>
        </div>
        <div style="padding: 28px 32px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px;">
              <div style="font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #64748b;">Employee</div>
              <div style="font-size: 18px; font-weight: 700; margin-top: 8px;">${user.name}</div>
              <div style="font-size: 14px; color: #64748b; margin-top: 4px;">${user.email}</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px;">
              <div style="font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #64748b;">Slip Details</div>
              <div style="font-size: 14px; margin-top: 8px;"><strong>Slip No:</strong> ${slip.slipNumber}</div>
              <div style="font-size: 14px; margin-top: 6px;"><strong>Paid On:</strong> ${new Date(slip.paidAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; overflow: hidden; border-radius: 14px; border: 1px solid #e2e8f0;">
            <thead>
              <tr style="background: #eff6ff; color: #1e3a8a;">
                <th style="text-align: left; padding: 14px 16px; font-size: 13px;">Component</th>
                <th style="text-align: right; padding: 14px 16px; font-size: 13px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="padding: 13px 16px; border-top: 1px solid #e2e8f0;">Basic Salary</td><td style="padding: 13px 16px; text-align: right; border-top: 1px solid #e2e8f0;">${formatCurrency(slip.basicSalary)}</td></tr>
              <tr><td style="padding: 13px 16px; border-top: 1px solid #e2e8f0;">Home Allowance</td><td style="padding: 13px 16px; text-align: right; border-top: 1px solid #e2e8f0;">${formatCurrency(slip.homeAllowance)}</td></tr>
              <tr><td style="padding: 13px 16px; border-top: 1px solid #e2e8f0;">Travel Allowance</td><td style="padding: 13px 16px; text-align: right; border-top: 1px solid #e2e8f0;">${formatCurrency(slip.travelAllowance)}</td></tr>
              <tr><td style="padding: 13px 16px; border-top: 1px solid #e2e8f0;">Other Allowance</td><td style="padding: 13px 16px; text-align: right; border-top: 1px solid #e2e8f0;">${formatCurrency(slip.otherAllowance)}</td></tr>
              <tr><td style="padding: 13px 16px; border-top: 1px solid #e2e8f0;">Leaves</td><td style="padding: 13px 16px; text-align: right; border-top: 1px solid #e2e8f0;">${slip.leaves}</td></tr>
              <tr><td style="padding: 13px 16px; border-top: 1px solid #e2e8f0;">Leave Deduction</td><td style="padding: 13px 16px; text-align: right; border-top: 1px solid #e2e8f0;">${formatCurrency(slip.leaveDeduction || 0)}</td></tr>
              <tr><td style="padding: 13px 16px; border-top: 1px solid #e2e8f0;">PF</td><td style="padding: 13px 16px; text-align: right; border-top: 1px solid #e2e8f0;">${formatCurrency(slip.pf)}</td></tr>
              <tr><td style="padding: 13px 16px; border-top: 1px solid #e2e8f0;">Other Deductions</td><td style="padding: 13px 16px; text-align: right; border-top: 1px solid #e2e8f0;">${formatCurrency(slip.deductions)}</td></tr>
            </tbody>
          </table>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 24px;">
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; padding: 16px;">
              <div style="font-size: 12px; color: #166534; text-transform: uppercase; letter-spacing: .08em;">Total Allowances</div>
              <div style="font-size: 20px; font-weight: 700; margin-top: 8px; color: #166534;">${formatCurrency(totalAllowances)}</div>
            </div>
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 14px; padding: 16px;">
              <div style="font-size: 12px; color: #991b1b; text-transform: uppercase; letter-spacing: .08em;">Total Deductions</div>
              <div style="font-size: 20px; font-weight: 700; margin-top: 8px; color: #991b1b;">${formatCurrency(totalDeductions)}</div>
            </div>
            <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 14px; padding: 16px;">
              <div style="font-size: 12px; color: #3730a3; text-transform: uppercase; letter-spacing: .08em;">In Hand</div>
              <div style="font-size: 20px; font-weight: 700; margin-top: 8px; color: #3730a3;">${formatCurrency(slip.inHand)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
};

const drawInfoCard = (doc, { x, y, w, h, label, value, bgColor, labelColor, valueColor }) => {
  doc.roundedRect(x, y, w, h, 14).fill(bgColor);
  doc
    .fillColor(labelColor)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(label.toUpperCase(), x + 16, y + 14, { width: w - 32 });
  doc
    .fillColor(valueColor)
    .fontSize(18)
    .font("Helvetica-Bold")
    .text(value, x + 16, y + 34, { width: w - 32 });
};

const generateSalarySlipPdf = ({ user, slip }) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 0 });
      const buffers = [];
      const totalAllowances = slip.homeAllowance + slip.travelAllowance + slip.otherAllowance;
      const totalDeductions = slip.pf + slip.deductions + (slip.leaveDeduction || 0);
      const grossSalary = slip.basicSalary + totalAllowances;
      const components = [
        ["Basic Salary", formatAmount(slip.basicSalary)],
        ["Home Allowance", formatAmount(slip.homeAllowance)],
        ["Travel Allowance", formatAmount(slip.travelAllowance)],
        ["Other Allowance", formatAmount(slip.otherAllowance)],
        ["Leaves", String(slip.leaves)],
        ["Leave Deduction", formatAmount(slip.leaveDeduction || 0)],
        ["PF", formatAmount(slip.pf)],
        ["Other Deductions", formatAmount(slip.deductions)],
        ["In Hand", formatAmount(slip.inHand)],
      ];
      const pageHeight = 842;
      const tableCardY = 372;
      const rowHeight = 28;
      const tableHeaderHeight = 64;
      const tableHeight = tableHeaderHeight + components.length * rowHeight;
      const finalBarHeight = 42;
      const finalBarY = tableCardY + tableHeight + 18;
      const footerY = finalBarY + finalBarHeight + 26;
      const tableCardHeight = Math.min(pageHeight - tableCardY - 40, tableHeight + finalBarHeight + 44);

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      doc.rect(0, 0, 595, 842).fill("#f8fafc");
      doc.rect(0, 0, 595, 146).fill("#0f172a");
      doc.save();
      doc.fillOpacity(0.95).circle(512, 72, 78).fill("#1d4ed8");
      doc.fillOpacity(0.92).circle(560, 122, 46).fill("#0ea5e9");
      doc.restore();

      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(26)
        .text("Salary Slip", 44, 34);
      doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor("#cbd5e1")
        .text(`Issued for ${slip.salaryMonth}`, 44, 68);
      doc
        .fontSize(10)
        .fillColor("#e2e8f0")
        .text(`Slip No: ${slip.slipNumber}`, 44, 92)
        .text(`Paid On: ${new Date(slip.paidAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, 44, 108);

      drawInfoCard(doc, {
        x: 44, y: 164, w: 245, h: 72,
        label: "Employee",
        value: user.name,
        bgColor: "#ffffff",
        labelColor: "#64748b",
        valueColor: "#0f172a",
      });
      doc
        .fillColor("#64748b")
        .font("Helvetica")
        .fontSize(10)
        .text(user.email, 60, 218, { width: 210 });

      drawInfoCard(doc, {
        x: 306, y: 164, w: 245, h: 72,
        label: "Net Salary",
        value: formatAmount(slip.inHand),
        bgColor: "#eff6ff",
        labelColor: "#1d4ed8",
        valueColor: "#1e3a8a",
      });

      drawInfoCard(doc, {
        x: 44, y: 254, w: 160, h: 60,
        label: "Gross",
        value: formatAmount(grossSalary),
        bgColor: "#ecfeff",
        labelColor: "#0f766e",
        valueColor: "#134e4a",
      });
      drawInfoCard(doc, {
        x: 218, y: 254, w: 160, h: 60,
        label: "Allowances",
        value: formatAmount(totalAllowances),
        bgColor: "#f0fdf4",
        labelColor: "#166534",
        valueColor: "#166534",
      });
      drawInfoCard(doc, {
        x: 392, y: 254, w: 159, h: 60,
        label: "Deductions",
        value: formatAmount(totalDeductions),
        bgColor: "#fef2f2",
        labelColor: "#991b1b",
        valueColor: "#991b1b",
      });

      doc
        .roundedRect(44, tableCardY, 507, tableCardHeight, 18)
        .fill("#ffffff");

      doc
        .fillColor("#0f172a")
        .font("Helvetica-Bold")
        .fontSize(15)
        .text("Salary Breakdown", 62, tableCardY + 20);

      doc
        .fillColor("#64748b")
        .font("Helvetica")
        .fontSize(10)
        .text("Component", 62, tableCardY + 48)
        .text("Amount", 450, tableCardY + 48, { width: 70, align: "right" });

      doc
        .moveTo(62, tableCardY + 62)
        .lineTo(533, tableCardY + 62)
        .lineWidth(1)
        .strokeColor("#e2e8f0")
        .stroke();

      let rowY = tableCardY + 76;
      components.forEach(([label, value], index) => {
        if (index % 2 === 0) {
          doc.roundedRect(58, rowY - 5, 479, 24, 8).fill("#f8fafc");
        }
        doc
          .fillColor("#334155")
          .font("Helvetica")
          .fontSize(10)
          .text(label, 74, rowY);
        doc
          .fillColor("#0f172a")
          .font("Helvetica-Bold")
          .fontSize(10)
          .text(value, 432, rowY, { width: 85, align: "right" });
        rowY += rowHeight;
      });

      doc
        .roundedRect(58, finalBarY, 479, finalBarHeight, 12)
        .fill("#0f172a");
      doc
        .fillColor("#cbd5e1")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("Final In Hand", 76, finalBarY + 13);
      doc
        .fillColor("#ffffff")
        .fontSize(16)
        .text(formatAmount(slip.inHand), 392, finalBarY + 10, { width: 125, align: "right" });

      doc
        .fillColor("#64748b")
        .font("Helvetica")
        .fontSize(10)
        .text("This is a system generated salary slip from Bharat Bizmart CRM.", 44, footerY, {
          width: 507,
          align: "center",
        });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });

exports.paySalary = async (req, res) => {
  try {
    const user = await User.findOne(withTenant({ _id: req.params.id }, req)).select("name email role");

    if (!user || user.role === "admin") {
      return res.status(404).json({ message: "Regular user not found" });
    }

    const salaryMonth = String(req.body.salaryMonth || "").trim();
    const basicSalary = parseMoney(req.body.basicSalary);
    const homeAllowance = parseMoney(req.body.homeAllowance);
    const travelAllowance = parseMoney(req.body.travelAllowance);
    const otherAllowance = parseMoney(req.body.otherAllowance);
    const leaves = Math.max(0, Number(req.body.leaves) || 0);
    const pf = parseMoney(req.body.pf);
    const deductions = parseMoney(req.body.deductions);

    if (!salaryMonth) {
      return res.status(400).json({ message: "Salary month is required" });
    }

    if (basicSalary <= 0) {
      return res.status(400).json({ message: "Basic salary must be greater than 0" });
    }

    const salaryBreakdown = calculateSalaryBreakdown({
      salaryMonth,
      basicSalary,
      homeAllowance,
      travelAllowance,
      otherAllowance,
      leaves,
      pf,
      deductions,
    });

    const { transporter, fromName, fromEmail } = await createTenantTransporter(req.tenantId);
    const slipData = {
      tenantId: req.tenantId,
      userId: user._id.toString(),
      slipNumber: buildSlipNumber(),
      salaryMonth,
      basicSalary,
      homeAllowance,
      travelAllowance,
      otherAllowance,
      leaves: salaryBreakdown.normalizedLeaves,
      leaveDeduction: salaryBreakdown.leaveDeduction,
      pf,
      deductions,
      inHand: salaryBreakdown.inHand,
      paidAt: new Date(),
      emailedAt: new Date(),
    };
    const pdfBuffer = await generateSalarySlipPdf({ user, slip: slipData });
    const safeMonth = salaryMonth.replace(/[^a-z0-9-_]/gi, "-");

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: user.email,
      subject: `Salary Slip for ${salaryMonth}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; background: #f8fafc; color: #0f172a;">
          <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 28px;">
            <h2 style="margin: 0 0 10px; color: #0f172a;">Salary Slip Attached</h2>
            <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #475569;">
              Your salary slip for <strong>${salaryMonth}</strong> is attached as a PDF.
            </p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `SalarySlip-${safeMonth}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    const slip = await SalarySlip.create(slipData);

    // Auto-create linked expense entry for payroll tracking (best-effort, never blocks the response)
    try {
      const Expense = require("../models/Expense");
      const ExpenseCategory = require("../models/ExpenseCategory");

      let salaryCategory = await ExpenseCategory.findOne(
        withTenant({ name: "Salary" }, req)
      ).setOptions({ skipTenantScope: true });

      if (!salaryCategory) {
        salaryCategory = await ExpenseCategory.create({
          tenantId: req.tenantId,
          name: "Salary",
          color: "#10b981",
          icon: "IndianRupee",
        });
      }

      const alreadyExists = await Expense.findOne(
        withTenant({ salarySlipId: slip._id }, req)
      ).setOptions({ skipTenantScope: true });

      if (!alreadyExists) {
        await Expense.create({
          tenantId: req.tenantId,
          expenseId: `EXP-SAL-${slip.slipNumber}`,
          title: `Salary — ${user.name}`,
          description: `Salary slip ${slip.slipNumber} for ${salaryMonth}`,
          categoryId: salaryCategory._id,
          employeeId: user._id,
          expenseType: "Payroll",
          amount: slip.inHand,
          tax: 0,
          totalAmount: slip.inHand,
          currency: "INR",
          paymentMethod: "Bank Transfer",
          expenseDate: slip.paidAt,
          status: "paid",
          source: "payroll",
          salarySlipId: slip._id,
          createdBy: req.user?.id,
        });
      }
    } catch (expenseErr) {
      console.error("[Expense Auto-Create] Failed:", expenseErr.message);
    }

    return res.status(201).json({
      message: "Salary slip emailed successfully",
      slip,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Failed to process salary payment" });
  }
};

exports.getMySalarySlips = async (req, res) => {
  try {
    const slips = await SalarySlip.find(withTenant({ userId: req.user.id }, req))
      .sort({ paidAt: -1, createdAt: -1 })
      .select("-__v");

    return res.json(slips);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to load salary slips" });
  }
};
