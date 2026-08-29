const http = require("http");
const { URL } = require("url");

const GMB_BASE = process.env.GMB_SCRAPER_URL || "http://localhost:4000";

exports.scrape = (req, res) => {
  const { query = "", count = "10" } = req.query;

  if (!query.trim()) {
    return res.status(400).json({ message: "Search query is required." });
  }

  const target = new URL("/scrape", GMB_BASE);
  target.searchParams.set("query", query.trim());
  target.searchParams.set("count", String(parseInt(count, 10) || 10));

  const proxyReq = http.get(target.toString(), (scraperRes) => {
    if (scraperRes.statusCode !== 200) {
      let body = "";
      scraperRes.on("data", (chunk) => { body += chunk; });
      scraperRes.on("end", () => {
        try { const json = JSON.parse(body); res.status(scraperRes.statusCode).json(json); }
        catch { res.status(scraperRes.statusCode).json({ message: "Scraper returned an error." }); }
      });
      return;
    }

    res.setHeader(
      "Content-Type",
      scraperRes.headers["content-type"] ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      scraperRes.headers["content-disposition"] ||
        `attachment; filename="gmb-results-${Date.now()}.xlsx"`
    );
    scraperRes.pipe(res);
  });

  // Allow up to 10 minutes for Playwright to finish scraping
  proxyReq.setTimeout(600_000, () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.status(504).json({ message: "Scraper timed out. Try a smaller count." });
    }
  });

  proxyReq.on("error", (err) => {
    console.error("[GMB Proxy]", err.message);
    if (!res.headersSent) {
      res.status(503).json({
        message:
          "GMB scraper service is offline. Please start the scraper server on port 4000.",
      });
    }
  });
};
