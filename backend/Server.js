const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");
const dotenv = require("dotenv");

dotenv.config({ path: __dirname + "/.env" });

// ── Security middleware ─────────────────────────────────────────────────────
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const morgan = require("morgan");

// ── Internal config / middleware ────────────────────────────────────────────
const helmetConfig = require("./config/helmetConfig");
const corsConfig = require("./config/corsConfig");
const { generalLimiter, loginLimiter } = require("./middleware/rateLimiter");
const { loginValidator } = require("./middleware/validator");
const errorHandler = require("./middleware/errorHandler");
const authMiddleware = require("./middleware/authMiddleware");

// ── Routes ──────────────────────────────────────────────────────────────────
const userRoutes = require("./routes/userRoutes");
const salaryRoutes = require("./routes/salaryRoutes");
const taskRoutes = require("./routes/taskRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const clientRoutes = require("./routes/clientRoutes");
const projectRoutes = require("./routes/projectRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const authRoutes = require("./routes/authRoutes");
const organizationRoutes = require("./routes/organizationRoutes");
const branchRoutes = require("./routes/branchRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const tenantFeatureRoutes = require("./routes/tenantFeatureRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const proposalTemplateRoutes = require("./routes/proposalTemplateRoutes");
const serviceCatalogRoutes = require("./routes/serviceCatalogRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const expenseCategoryRoutes = require("./routes/expenseCategoryRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const collectionRoutes      = require("./routes/collectionRoutes");
const tenantSMTPRoutes      = require("./routes/tenantSMTPRoutes");
const gmbRoutes             = require("./routes/gmbRoutes");
const mailAutomationRoutes  = require("./routes/mailAutomationRoutes");
const salesTargetRoutes     = require("./routes/salesTargetRoutes");
const announcementRoutes    = require("./routes/announcementRoutes");
const chatRoutes            = require("./routes/chatRoutes");
const reportRoutes          = require("./routes/reportRoutes");
const holidayShiftRoutes    = require("./routes/holidayShiftRoutes");
const leavePolicyRoutes     = require("./routes/leavePolicyRoutes");
const performanceRoutes          = require("./routes/performanceRoutes");
const subscriptionPaymentRoutes  = require("./routes/subscriptionPaymentRoutes");
const superAdminPaymentRoutes    = require("./routes/superAdminPaymentRoutes");
const aiRoutes                   = require("./routes/aiRoutes");

// ── Controllers used directly on Server-level routes ───────────────────────
const { loginUser, logoutUser } = require("./controllers/userController");

// ── Tenant services ─────────────────────────────────────────────────────────
const { getMyServices } = require("./controllers/serviceCatalogController");

// ── DB ──────────────────────────────────────────────────────────────────────
const connectedDB = require("./config/db");
const { setSocketIO } = require("./utils/socket");
const { seedDefaultPlans } = require("./utils/seedPlans");
const { seedServiceCatalog } = require("./utils/seedServiceCatalog");

connectedDB().then(async () => {
  seedDefaultPlans();
  seedServiceCatalog();
  // Drop the old broken compound unique index on Expense that treated every
  // manual expense (null salarySlipId) as a duplicate within the same tenant.
  try {
    const mongoose = require("mongoose");
    const col = mongoose.connection.collection("expenses");
    await col.dropIndex("salarySlipId_1_tenantId_1");
    console.log("[startup] Dropped stale Expense index salarySlipId_1_tenantId_1");
  } catch {
    // Index already gone or collection doesn't exist yet — safe to ignore.
  }
});

// ── GMB Scraper sidecar — auto-spawn alongside the CRM backend ──────────────
// Runs backend/scrapper/server.js on port 4000 (configurable via GMB_PORT).
// Graceful degradation: if the scrapper node_modules aren't installed yet the
// main server still starts; the /api/gmb/scrape route returns a 503.
let _gmbProc = null;

function startGmbScraper() {
  const scraperPath = path.join(__dirname, "scrapper", "server.js");
  _gmbProc = spawn(process.execPath, [scraperPath], {
    cwd: path.join(__dirname, "scrapper"),
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, HEADLESS: process.env.HEADLESS || "true" },
  });

  _gmbProc.stdout.on("data", (d) => process.stdout.write(d));
  _gmbProc.stderr.on("data", (d) => process.stderr.write(d));

  _gmbProc.on("error", (err) => {
    console.warn("[GMB] Could not start scraper sidecar:", err.message);
    console.warn("[GMB] Run: cd backend/scrapper && npm install && npx playwright install chromium");
  });

  _gmbProc.on("exit", (code, signal) => {
    if (signal === "SIGTERM" || signal === "SIGINT") return; // intentional shutdown
    console.warn(`[GMB] Scraper sidecar exited (code=${code}). Restarting in 5s…`);
    setTimeout(startGmbScraper, 5000);
  });
}

startGmbScraper();

// Kill the scraper sidecar when the main process exits — registered once.
const _killGmb = () => { if (_gmbProc) _gmbProc.kill(); };
process.on("exit",    _killGmb);
process.on("SIGINT",  () => { _killGmb(); process.exit(); });
process.on("SIGTERM", () => { _killGmb(); process.exit(); });

// ── App & HTTP server ────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ── Optional: socket.io (not currently installed; graceful degradation) ─────
let SocketIOServer = null;
try {
  SocketIOServer = require("socket.io").Server;
} catch {
  console.warn("socket.io not installed — real-time features disabled.");
}

if (SocketIOServer) {
  const io = new SocketIOServer(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });
  setSocketIO(io);
  io.on("connection", (socket) => socket.emit("socket:connected", { id: socket.id }));
}

// ════════════════════════════════════════════════════════════════════════════
//  SECURITY MIDDLEWARE — order matters; do not rearrange.
// ════════════════════════════════════════════════════════════════════════════

// 1. Remove X-Powered-By header (belt + suspenders alongside helmet)
app.disable("x-powered-by");

// 2. Security headers (helmet replaces / supplements several browser defaults)
app.use(helmet(helmetConfig));

// 3. CORS — only whitelisted origins from env; credentials enabled
app.use(cors(corsConfig));

// 4. Global rate limiter — 100 req / 15 min per IP (all API routes)
app.use(generalLimiter);

// 5. Gzip / Brotli response compression — reduces bandwidth; no security risk
app.use(compression());

// 6. Parse JSON and URL-encoded bodies; hard cap at 2 MB prevents DoS via
//    large payloads
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// 7. Cookie parser — required for reading HttpOnly auth cookies
app.use(cookieParser());

// 7b. Express 5 compatibility patch ─────────────────────────────────────────
// In Express 5, req.query is a read-only getter backed by the URL parser.
// express-mongo-sanitize, xss-clean, and hpp all attempt `req.query = …`
// which throws "Cannot set property query … which has only a getter".
// Converting it to a writable value-property once here fixes all three.
app.use((req, _res, next) => {
  Object.defineProperty(req, "query", {
    value: { ...req.query },
    writable: true,
    configurable: true,
    enumerable: true,
  });
  next();
});

// 8. NoSQL injection protection — strips keys containing $ or . from
//    req.body, req.params, and req.query before they reach controllers
app.use(mongoSanitize());

// 9. XSS protection — encodes HTML entities in user-supplied strings so
//    malicious scripts cannot be stored in MongoDB and later reflected
app.use(xss());

// 10. HTTP Parameter Pollution — when a query/body key is sent multiple
//     times, Express collapses it to an array which can confuse validators.
//     hpp picks the last value and prevents unexpected array injection.
app.use(hpp());

// 11. Request logging
// Production → Apache "combined" format (suitable for log aggregators).
// Development → only log errors and non-304 responses to keep the terminal quiet.
if (process.env.NODE_ENV === "production") {
  app.use(morgan("combined"));
} else {
  // Skip successful cached responses (304) — they add noise without useful info.
  app.use(
    morgan("dev", {
      skip: (req, res) => res.statusCode === 304,
    })
  );
}

// ── Static files (uploaded PI attachments — public, UUID filenames) ─────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ════════════════════════════════════════════════════════════════════════════
//  API ROUTES
// ════════════════════════════════════════════════════════════════════════════

app.use("/api/users", userRoutes);
app.use("/api/salary", salaryRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/superadmin/organizations", organizationRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/tenant", tenantFeatureRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/proposal-templates", proposalTemplateRoutes);
app.use("/api/superadmin", serviceCatalogRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/expense-categories", expenseCategoryRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/tenant/smtp", tenantSMTPRoutes);
app.use("/api/gmb", gmbRoutes);
app.use("/api/mail-automation", mailAutomationRoutes);
app.use("/api/sales-targets",  salesTargetRoutes);
app.use("/api/announcements",  announcementRoutes);
app.use("/api/chat",           chatRoutes);
app.use("/api/reports",        reportRoutes);
app.use("/api/hr",             holidayShiftRoutes);
app.use("/api/leave-policy",   leavePolicyRoutes);
app.use("/api/performance",    performanceRoutes);
app.use("/api/subscription",   subscriptionPaymentRoutes);
app.use("/api/superadmin/payments", superAdminPaymentRoutes);
app.use("/api/ai",                 aiRoutes);

// Tenant-facing: returns only the services enabled for this tenant
app.get("/api/tenant/services", authMiddleware, getMyServices);

// ── Shared login entry-point (rate-limited + validated) ──────────────────────
// This route is also exposed at POST /api/users/login (inside userRoutes) for
// backward compatibility; both point to the same handler.
app.post("/api/login", loginLimiter, loginValidator, loginUser);
app.post("/api/logout", authMiddleware, logoutUser);

// ── Health check (excluded from rate limiter via skip fn in rateLimiter.js) ─
app.get("/", (req, res) => res.json({ status: "ok", service: "Bharat Bizmart CRM API" }));

// ── 404 handler (no matching route) ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Resource not found." });
});

// ════════════════════════════════════════════════════════════════════════════
//  CENTRALISED ERROR HANDLER — must be last
// ════════════════════════════════════════════════════════════════════════════
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4050;
server.listen(PORT, () => {
  console.log(`[${process.env.NODE_ENV || "development"}] Server on port ${PORT}`);
});
