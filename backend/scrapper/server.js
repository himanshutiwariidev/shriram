// GMB scraper sidecar — spawned automatically by the CRM backend on startup.
// Listens on GMB_PORT (default 4000); proxied by /api/gmb/scrape.

const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = Number(process.env.GMB_PORT) || 4000;

app.use(cors());

function newestXlsx(dir) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".xlsx"))
    .map((f) => ({ name: f, full: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files[0] || null;
}

async function waitForNonEmptyFile(filePath, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if (fs.statSync(filePath).size > 1024) return true;
    } catch { /* not written yet */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

// GET /scrape?query=restaurants+in+mumbai&count=20
app.get("/scrape", async (req, res) => {
  const query = String(req.query.query || "").trim() || "businesses in delhi";
  const rawCount = parseInt(req.query.count, 10);
  const count = Number.isFinite(rawCount) && rawCount > 0 ? String(rawCount) : "10";

  console.log(`[GMB] Scraping: "${query}" × ${count}`);

  const child = spawn(process.execPath, ["gmbscrapper.js", query, count], {
    cwd: __dirname,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
    env: { ...process.env, QUERY: query, COUNT: count, HEADLESS: process.env.HEADLESS || "true" },
  });

  child.stdout.on("data", (d) => process.stdout.write(d));
  child.stderr.on("data", (d) => process.stderr.write(d));

  child.on("close", async (code) => {
    if (code !== 0) return res.status(500).json({ message: "Scraper process exited with error. Check server logs." });

    const outDir = path.join(__dirname, "output");
    if (!fs.existsSync(outDir)) return res.status(404).json({ message: "No output directory found." });

    const latest = newestXlsx(outDir);
    if (!latest) return res.status(404).json({ message: "No Excel file was created." });

    const ok = await waitForNonEmptyFile(latest.full, 30000);
    if (!ok) return res.status(500).json({ message: "Output file is empty or not ready." });

    res.download(latest.full, latest.name);
  });

  child.on("error", (err) => {
    console.error("[GMB] spawn error:", err);
    if (!res.headersSent) res.status(500).json({ message: "Failed to start scraper process." });
  });
});

app.listen(PORT, () => console.log(`[GMB] Scraper sidecar ready on port ${PORT}`));
