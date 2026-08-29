/**
 * Runs automatically after `npm install` in the backend via the postinstall hook.
 * Sets up the GMB scrapper sidecar (installs its own dependencies + Playwright Chromium).
 * Failures are non-fatal — they print a warning so the main backend still installs cleanly.
 */
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const scraperDir = path.join(__dirname, "scrapper");

if (!fs.existsSync(path.join(scraperDir, "package.json"))) {
  console.log("[setup] scrapper/package.json not found — skipping GMB setup.");
  process.exit(0);
}

try {
  console.log("[setup] Installing GMB scrapper dependencies…");
  execSync("npm install", { cwd: scraperDir, stdio: "inherit" });
  // postinstall inside scrapper/package.json runs `npx playwright install chromium`
  console.log("[setup] GMB scrapper is ready.");
} catch (err) {
  console.warn("\n[setup] Warning: GMB scrapper setup failed:", err.message);
  console.warn("[setup] To fix manually: cd backend/scrapper && npm install\n");
  // Non-fatal — main server still works; GMB scraper just won't be available.
}
