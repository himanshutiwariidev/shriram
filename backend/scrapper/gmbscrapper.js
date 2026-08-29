/**
 * gmbscrapper.js — Google Maps Business scraper → .xlsx
 * Run via: node gmbscrapper.js "restaurants in Mumbai" 20
 * Or set env: QUERY / COUNT / HEADLESS
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");

const DEFAULT_QUERY = "businesses in delhi";
const DEFAULT_TARGET_COUNT = 10;
// Default headless=true for server; override with HEADLESS=false env var for debugging
const HEADLESS = process.env.HEADLESS !== "false";
const SLOW_MO = HEADLESS ? 0 : 150;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (base, spread = 0.35) =>
  Math.max(0, Math.round(base * (1 - spread + Math.random() * 2 * spread)));
const LOG = (...a) => console.log("[GMB]", ...a);

async function saveXlsx(filePath, rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Data");
  ws.columns = [
    { header: "Name",      key: "name",     width: 40 },
    { header: "Phone",     key: "phone",    width: 20 },
    { header: "Website",   key: "website",  width: 45 },
    { header: "Address",   key: "address",  width: 60 },
    { header: "Place URL", key: "placeUrl", width: 80 },
  ];
  rows.forEach((r) => ws.addRow(r));
  await wb.xlsx.writeFile(filePath);
  LOG(`Saved ${rows.length} rows → ${filePath}`);
}

async function clickConsentIfPresent(page) {
  const selectors = [
    'button:has-text("I agree")',
    'button:has-text("Accept all")',
    'button:has-text("Accept")',
    'button[aria-label*="Accept"]',
    'form[action*="consent"] button[type="submit"]',
  ];
  for (const sel of selectors) {
    try {
      const btn = page.locator(sel);
      if (await btn.first().isVisible({ timeout: 1200 })) {
        await btn.first().click();
        await sleep(700);
        return true;
      }
    } catch {}
  }
  return false;
}

async function ensureResultsSurface(page, targetCount) {
  await page.waitForSelector('a[href*="/maps/place/"]', { timeout: 90000 });

  const feed = page.locator('div[role="feed"]');
  if (await feed.count()) {
    let prev = 0, stagnant = 0;
    for (let i = 0; i < 160; i++) {
      const cur = await page.locator('a[href*="/maps/place/"]').count();
      if (cur >= targetCount) break;
      await feed.evaluate((el) => el.scrollBy(0, el.clientHeight * 0.9));
      await sleep(jitter(900, 0.5));
      stagnant = cur === prev ? stagnant + 1 : 0;
      prev = cur;
      if (stagnant >= 4) {
        try {
          await page.keyboard.press("PageDown");
          await sleep(jitter(900, 0.4));
          await page.keyboard.down("Control");
          await page.keyboard.press("-");
          await page.keyboard.up("Control");
        } catch {}
        stagnant = 0;
      }
    }
    return;
  }

  for (let i = 0; i < 8; i++) {
    const before = await page.locator('a[href*="/maps/place/"]').count();
    await page.keyboard.down("Control");
    await page.keyboard.press("-");
    await page.keyboard.up("Control");
    await sleep(jitter(900, 0.4));
    const after = await page.locator('a[href*="/maps/place/"]').count();
    if (after > before || after >= targetCount) break;
  }
}

async function collectPlaceLinks(page) {
  const anchors = page.locator('a[href*="/maps/place/"]');
  const count = await anchors.count();
  const links = new Set();
  for (let i = 0; i < count; i++) {
    const href = await anchors.nth(i).getAttribute("href");
    if (href && href.includes("/maps/place/")) links.add(href.split("?")[0]);
  }
  return Array.from(links);
}

async function textOf(page, locator) {
  try {
    const el = page.locator(locator).first();
    if (await el.count()) return (await el.textContent())?.trim() || "";
  } catch {}
  return "";
}

async function ariaValue(page, selectorPrefix, labelKey) {
  try {
    const el = page.locator(`${selectorPrefix}[aria-label^="${labelKey}:"]`).first();
    if (await el.count()) {
      const raw = await el.getAttribute("aria-label");
      if (!raw) return "";
      const idx = raw.indexOf(":");
      return idx >= 0 ? raw.slice(idx + 1).trim() : raw.trim();
    }
  } catch {}
  return "";
}

async function scrapePlace(page) {
  let name =
    (await textOf(page, 'h1[role="heading"]')) ||
    (await textOf(page, '[data-item-id="title"]')) ||
    (await textOf(page, "h1"));
  name = name.replace(/\s+/g, " ").trim();

  const phone =
    (await ariaValue(page, "button", "Phone")) ||
    (await textOf(page, 'a[href^="tel:"]'));

  let website = "";
  try {
    const websiteLink = page.locator('a[aria-label^="Website:"]').first();
    if (await websiteLink.count()) website = await websiteLink.getAttribute("href");
  } catch {}
  if (!website) {
    const allLinks = page.locator('a[href^="http"]');
    const c = await allLinks.count();
    for (let i = 0; i < Math.min(c, 25); i++) {
      const href = await allLinks.nth(i).getAttribute("href");
      if (href && !href.includes("google") && !href.includes("/maps/")) { website = href; break; }
    }
  }

  const address =
    (await ariaValue(page, "button", "Address")) ||
    (await textOf(page, '[data-item-id="address"]'));

  return { name: name || "", phone: phone || "", website: website || "", address: address || "" };
}

(async () => {
  const rawQuery = process.argv[2] || process.env.QUERY;
  const rawCountArg = process.argv[3];
  const rawCountEnv = process.env.COUNT;
  const rawCount = Number.isFinite(parseInt(rawCountArg, 10))
    ? parseInt(rawCountArg, 10)
    : parseInt(rawCountEnv, 10);

  const query = rawQuery?.trim() || DEFAULT_QUERY;
  const targetCount = Number.isFinite(rawCount) && rawCount > 0 ? rawCount : DEFAULT_TARGET_COUNT;

  LOG(`Query: "${query}" | target: ${targetCount} | headless: ${HEADLESS}`);

  const outDir = path.resolve(__dirname, "output");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `gmb_${Date.now()}.xlsx`);

  const browser = await chromium.launch({ headless: HEADLESS, slowMo: SLOW_MO });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
    locale: "en-US",
  });
  const page = await ctx.newPage();
  const rows = [];
  let processed = 0;

  try {
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    LOG("Opening:", searchUrl);
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await clickConsentIfPresent(page);

    LOG("Ensuring results surface…");
    await ensureResultsSurface(page, targetCount);

    LOG("Collecting place links…");
    let links = await collectPlaceLinks(page);
    if (links.length < targetCount) {
      LOG(`Only ${links.length}. Nudging and retrying…`);
      try {
        await page.keyboard.down("Control");
        await page.keyboard.press("-");
        await page.keyboard.up("Control");
      } catch {}
      await sleep(1200);
      await ensureResultsSurface(page, targetCount);
      const more = await collectPlaceLinks(page);
      links = Array.from(new Set([...links, ...more]));
    }
    links = links.slice(0, targetCount);
    LOG(`Got ${links.length} unique place URLs.`);

    for (let i = 0; i < links.length; i++) {
      const placeUrl = links[i];
      LOG(`(${i + 1}/${links.length}) ${placeUrl}`);
      await page.goto(placeUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
      await sleep(jitter(1200, 0.4));

      try {
        const overview = page.locator('button[role="tab"]:has-text("Overview")');
        if (await overview.count()) await overview.first().click({ timeout: 2000 });
      } catch {}

      const data = await scrapePlace(page);
      rows.push({ ...data, placeUrl });
      processed++;
      await sleep(jitter(700, 0.4));
    }

    await saveXlsx(outPath, rows);
    await fs.promises.utimes(outPath, new Date(), new Date());
  } catch (err) {
    console.error("[GMB] Fatal error:", err);
    process.exitCode = 1;
  } finally {
    await ctx.close();
    await browser.close();
  }

  LOG(`Done. Processed ${processed} rows.`);
})();
