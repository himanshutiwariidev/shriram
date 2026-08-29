import React, { useRef, useState } from "react";
import {
  MailOpen, Upload, Send, CheckCircle2, XCircle,
  AlertCircle, Clock, FileText, Trash2,
} from "lucide-react";
import useTenantTheme from "../../hooks/useTenantTheme";
import { getAuth } from "../../services/authStorage";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://crm.cybertricksmedia.in/api";

const DELAY_OPTIONS = [
  { label: "No delay",  value: 0 },
  { label: "1 second",  value: 1000 },
  { label: "3 seconds", value: 3000 },
  { label: "5 seconds", value: 5000 },
];

function StatBadge({ label, value, color }) {
  return (
    <div style={{ textAlign: "center", padding: "10px 20px", borderRadius: 10, background: `${color}18`, border: `1px solid ${color}40` }}>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'Syne', sans-serif" }}>{value}</div>
      <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function MailAutomationSection() {
  const { T } = useTenantTheme();
  const fileRef = useRef(null);

  const [file,      setFile]      = useState(null);
  const [subject,   setSubject]   = useState("");
  const [message,   setMessage]   = useState("");
  const [delayMs,   setDelayMs]   = useState(3000);
  const [sending,   setSending]   = useState(false);
  const [results,   setResults]   = useState([]);  // { email, status, error }
  const [summary,   setSummary]   = useState(null); // { total, sent, failed }
  const [error,     setError]     = useState(null);
  const [started,   setStarted]   = useState(false);
  const [toast,     setToast]     = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4500);
  };

  const reset = () => {
    setFile(null);
    setResults([]);
    setSummary(null);
    setError(null);
    setStarted(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!file)    { showToast("Upload a CSV file first.", false); return; }
    if (!subject.trim()) { showToast("Subject is required.", false); return; }
    if (!message.trim()) { showToast("Message body is required.", false); return; }

    setSending(true);
    setStarted(true);
    setResults([]);
    setSummary(null);
    setError(null);

    const fd = new FormData();
    fd.append("file",    file);
    fd.append("subject", subject.trim());
    fd.append("message", message.trim());
    fd.append("delayMs", String(delayMs));

    try {
      const { token } = getAuth();
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/mail-automation/send`, {
        method: "POST",
        body: fd,
        credentials: "include",
        headers,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.message || "Request failed.");
        setSending(false);
        return;
      }

      // Stream SSE lines from the response body
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Extract complete SSE messages
        const parts = buffer.split("\n\n");
        buffer = parts.pop(); // last part may be incomplete

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          try {
            const data = JSON.parse(line.slice(5).trim());
            if (data.type === "start")  { /* total already set */ }
            if (data.type === "result") {
              setResults((prev) => [...prev, data]);
            }
            if (data.type === "done") {
              setSummary({ total: data.total, sent: data.sent, failed: data.failed });
            }
            if (data.type === "error") {
              setError(data.message);
            }
          } catch {}
        }
      }
    } catch (err) {
      setError(err.message || "Network error.");
    } finally {
      setSending(false);
    }
  };

  const inp = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: `1.5px solid ${T.inputBorder}`, background: T.inputBg,
    color: T.textPrimary, fontSize: 13.5, fontFamily: "inherit",
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 780 }}>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: toast.ok ? "#22c55e" : "#ef4444", color: "#fff", padding: "12px 20px", borderRadius: 12, fontSize: 13.5, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,.18)" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: T.textPrimary }}>
          Mail Automation
        </h2>
        <p style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>
          Upload a CSV of contacts and send personalised bulk emails using your configured SMTP.
          Emails are sent one by one with a configurable delay to avoid spam filters.
        </p>
      </div>

      {/* Info banner */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 15px", borderRadius: 11, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
        <FileText size={15} color="#3b82f6" strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 12.5, color: "#1e40af", lineHeight: 1.6, margin: 0 }}>
          CSV must have an <strong>email</strong> column. Optional: <strong>firstName</strong> or <strong>name</strong> for personalisation.
          Uses your Email Settings SMTP — go to Settings → Email Settings if not configured.
        </p>
      </div>

      {/* Form card */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#fdf4ff", display: "grid", placeItems: "center" }}>
            <MailOpen size={18} color="#a855f7" strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>Compose & Send</div>
            <div style={{ fontSize: 12, color: T.textMuted }}>Write plain text — line breaks are preserved automatically</div>
          </div>
        </div>

        <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* CSV Upload */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.textSecondary, marginBottom: 5 }}>CSV File *</div>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${file ? "#a855f7" : T.inputBorder}`,
                borderRadius: 11, padding: "16px 20px",
                background: file ? "#fdf4ff" : T.inputBg,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
              }}
            >
              <Upload size={18} color={file ? "#a855f7" : T.textMuted} strokeWidth={2} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: file ? "#a855f7" : T.textSecondary }}>
                  {file ? file.name : "Click to upload CSV"}
                </div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : "Max 5 MB · must have email column"}
                </div>
              </div>
              {file && (
                <button
                  type="button"
                  onClick={(ev) => { ev.stopPropagation(); reset(); }}
                  style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex" }}
                >
                  <Trash2 size={14} strokeWidth={2} />
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => { setFile(e.target.files[0] || null); setResults([]); setSummary(null); setError(null); setStarted(false); }} />
          </div>

          {/* Subject */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.textSecondary, marginBottom: 5 }}>Subject *</div>
            <input style={inp} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Your email subject line" disabled={sending} />
          </div>

          {/* Message */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.textSecondary, marginBottom: 5 }}>Message *</div>
            <textarea
              style={{ ...inp, minHeight: 160, resize: "vertical", lineHeight: 1.7 }}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={"Yahan apna message likhein...\n\nLine breaks preserve ho jaenge automatically."}
              disabled={sending}
            />
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
              Tip: Use {"{firstName}"} in subject or message to personalise each email
            </div>
          </div>

          {/* Delay */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.textSecondary, marginBottom: 7 }}>
              <Clock size={12} strokeWidth={2.5} style={{ marginRight: 5, verticalAlign: "middle" }} />
              Delay between emails
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {DELAY_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setDelayMs(o.value)}
                  disabled={sending}
                  style={{
                    padding: "7px 14px", borderRadius: 9, fontSize: 12.5, fontWeight: 600,
                    border: `1.5px solid ${delayMs === o.value ? "#a855f7" : T.inputBorder}`,
                    background: delayMs === o.value ? "#fdf4ff" : T.inputBg,
                    color: delayMs === o.value ? "#a855f7" : T.textSecondary,
                    cursor: sending ? "not-allowed" : "pointer", fontFamily: "inherit",
                    opacity: sending ? 0.6 : 1,
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 5 }}>
              Higher delay = lower chance of hitting Gmail/SMTP rate limits
            </div>
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={sending}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
              padding: "13px 20px",
              background: sending ? "#9ca3af" : "linear-gradient(135deg, #a855f7, #7c3aed)",
              color: "#fff", border: "none", borderRadius: 12,
              fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif",
              cursor: sending ? "not-allowed" : "pointer",
            }}
          >
            {sending ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" opacity=".25"/><path d="M21 12a9 9 0 0 0-9-9"/>
                </svg>
                Sending… ({results.length} sent so far)
              </>
            ) : (
              <>
                <Send size={15} strokeWidth={2.5} />
                Send Emails
              </>
            )}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca" }}>
          <AlertCircle size={16} color="#dc2626" strokeWidth={2.2} />
          <span style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>{error}</span>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, marginBottom: 14 }}>Campaign Summary</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <StatBadge label="Total"  value={summary.total}  color={T.textSecondary} />
            <StatBadge label="Sent"   value={summary.sent}   color="#22c55e" />
            <StatBadge label="Failed" value={summary.failed} color="#ef4444" />
          </div>
        </div>
      )}

      {/* Live results */}
      {started && results.length > 0 && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>
              Results {sending && <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 400 }}>(live)</span>}
            </div>
            <div style={{ fontSize: 11, color: T.textMuted }}>{results.length} processed</div>
          </div>

          <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            {results.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 8, background: r.status === "sent" ? "#f0fdf4" : "#fef2f2" }}>
                {r.status === "sent"
                  ? <CheckCircle2 size={13} color="#22c55e" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                  : <XCircle      size={13} color="#ef4444" strokeWidth={2.5} style={{ flexShrink: 0 }} />}
                <span style={{ fontSize: 12.5, fontFamily: "monospace", color: T.textPrimary, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.email}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: r.status === "sent" ? "#16a34a" : "#dc2626", flexShrink: 0 }}>{r.status}</span>
                {r.error && <span style={{ fontSize: 11, color: T.textMuted, flexShrink: 0 }}>· {r.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}
