import React, { useState } from "react";
import { Search, Download, MapPin, AlertCircle, CheckCircle2, Clock, Zap } from "lucide-react";
import useTenantTheme from "../../hooks/useTenantTheme";
import API from "../../services/api";

const PRESETS = [
  { label: "10 results",  value: 10 },
  { label: "25 results",  value: 25 },
  { label: "50 results",  value: 50 },
  { label: "100 results", value: 100 },
];

function EstTime({ count }) {
  const secs = Math.ceil((count / 10) * 25);
  if (secs < 60) return <>{secs}s</>;
  const m = Math.floor(secs / 60), s = secs % 60;
  return <>{m}m{s > 0 ? ` ${s}s` : ""}</>;
}

export default function GmbScraperSection() {
  const { T } = useTenantTheme();

  const [query,     setQuery]     = useState("");
  const [count,     setCount]     = useState(10);
  const [scraping,  setScraping]  = useState(false);
  const [toast,     setToast]     = useState(null);
  const [elapsed,   setElapsed]   = useState(0);
  const [timerRef,  setTimerRef]  = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 5000);
  };

  const startTimer = () => {
    setElapsed(0);
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    setTimerRef(id);
    return id;
  };

  const stopTimer = (id) => {
    clearInterval(id);
    setTimerRef(null);
  };

  const handleScrape = async () => {
    if (!query.trim()) { showToast("Enter a search query first.", false); return; }
    setScraping(true);
    const tid = startTimer();
    try {
      const res = await API.get("/gmb/scrape", {
        params: { query: query.trim(), count },
        responseType: "blob",
        timeout: 660_000,
      });
      stopTimer(tid);

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      const safe = query.trim().replace(/[^a-z0-9]/gi, "-").toLowerCase();
      a.href     = url;
      a.download = `gmb-${safe}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast(`Done! ${count} leads exported to Excel.`);
    } catch (err) {
      stopTimer(tid);
      const msg = err?.response?.data
        ? await err.response.data.text().then((t) => {
            try { return JSON.parse(t)?.message; } catch { return null; }
          }).catch(() => null)
        : null;
      showToast(msg || err?.message || "Scraping failed. Make sure the scraper server is running.", false);
    } finally {
      setScraping(false);
    }
  };

  const inp = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: `1.5px solid ${T.inputBorder}`, background: T.inputBg,
    color: T.textPrimary, fontSize: 14, fontFamily: "inherit",
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 720 }}>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: toast.ok ? "#22c55e" : "#ef4444", color: "#fff", padding: "12px 20px", borderRadius: 12, fontSize: 13.5, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,.18)", animation: "toastIn .25s ease" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: T.textPrimary }}>
          GMB Lead Scraper
        </h2>
        <p style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>
          Search Google Maps for local businesses and export leads to Excel. Powered by Playwright — requires the scraper server running on port 4000.
        </p>
      </div>

      {/* Info banner */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", borderRadius: 12, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
        <Zap size={16} color="#3b82f6" strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 12.5, color: "#1e40af", lineHeight: 1.6, margin: 0 }}>
          Results include <strong>Business Name, Phone, Website, Address</strong> and are exported directly as an XLSX file.
          Scraping takes roughly <strong>~25s per 10 results</strong>. For 50 leads, expect ~2 minutes.
        </p>
      </div>

      {/* Main card */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#fef9c3", display: "grid", placeItems: "center" }}>
            <MapPin size={18} color="#ca8a04" strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>Search & Export</div>
            <div style={{ fontSize: 12, color: T.textMuted }}>Enter a business category + location (e.g. "restaurants in Mumbai")</div>
          </div>
        </div>

        {/* Query input */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.textSecondary, marginBottom: 5 }}>Search Query *</div>
          <div style={{ position: "relative" }}>
            <Search size={15} color={T.textMuted} strokeWidth={2} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              style={{ ...inp, paddingLeft: 36 }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !scraping && handleScrape()}
              placeholder='e.g. "digital marketing agencies in Delhi"'
              disabled={scraping}
            />
          </div>
        </div>

        {/* Count selector */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.textSecondary, marginBottom: 8 }}>Number of Results</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setCount(p.value)}
                disabled={scraping}
                style={{
                  padding: "7px 16px", borderRadius: 9, fontSize: 13, fontWeight: 600,
                  border: `1.5px solid ${count === p.value ? "#f7931e" : T.inputBorder}`,
                  background: count === p.value ? "#fff7ed" : T.inputBg,
                  color: count === p.value ? "#f7931e" : T.textSecondary,
                  cursor: scraping ? "not-allowed" : "pointer", fontFamily: "inherit",
                  opacity: scraping ? 0.6 : 1,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 6 }}>
            Estimated time: ~<EstTime count={count} />
          </div>
        </div>

        {/* Scrape button */}
        <button
          onClick={handleScrape}
          disabled={scraping}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
            width: "100%", padding: "13px 20px",
            background: scraping ? "#9ca3af" : "linear-gradient(135deg, #f7931e, #e07710)",
            color: "#fff", border: "none", borderRadius: 12,
            fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif",
            cursor: scraping ? "not-allowed" : "pointer",
          }}
        >
          {scraping ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" opacity=".2" /><path d="M21 12a9 9 0 0 0-9-9" />
              </svg>
              Scraping… ({elapsed}s elapsed)
            </>
          ) : (
            <>
              <Download size={15} strokeWidth={2.5} />
              Start Scraping & Download Excel
            </>
          )}
        </button>
      </div>

      {/* Live progress card when scraping */}
      {scraping && (
        <div style={{ background: T.card, border: `1px solid #fde68a`, borderRadius: 16, padding: "18px 22px", display: "flex", alignItems: "center", gap: 14 }}>
          <Clock size={20} color="#ca8a04" strokeWidth={2} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary }}>Scraping in progress…</div>
            <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>
              Launching browser, visiting Google Maps, collecting {count} leads for <em>"{query}"</em>.
              Do not close this tab. The XLSX file will download automatically when complete.
            </div>
          </div>
        </div>
      )}

      {/* Requirements card */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "18px 22px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, marginBottom: 12 }}>One-time Setup</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { icon: CheckCircle2, color: "#22c55e", text: "Scraper starts automatically with the CRM backend — no separate process needed." },
            { icon: AlertCircle,  color: "#f59e0b", text: 'First-time only: run  npx playwright install chromium  inside backend/scrapper/  to install the browser.' },
            { icon: AlertCircle,  color: "#f59e0b", text: 'Superadmin must enable "GMB Lead Scraper" for this tenant under Subscriptions → Features.' },
          ].map(({ icon: Icon, color, text }, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
              <Icon size={14} color={color} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.5 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
