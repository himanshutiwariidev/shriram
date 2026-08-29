import React, { useEffect, useState } from "react";
import {
  Mail, Server, Lock, Send, CheckCircle2, AlertCircle,
  Eye, EyeOff, Trash2, Shield,
} from "lucide-react";
import useTenantTheme from "../../hooks/useTenantTheme";
import API from "../../services/api";

const EMPTY_FORM = {
  host:      "",
  port:      "587",
  secure:    false,
  username:  "",
  password:  "",
  fromName:  "",
  fromEmail: "",
};

function Field({ label, hint, children }) {
  const { T } = useTenantTheme();
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: T.textSecondary, marginBottom: 5 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

// Defined outside to avoid remount/focus-loss on parent re-renders
function SMTPForm({ form, setForm, onSubmit, submitting, configured, T }) {
  const [showPass, setShowPass] = useState(false);

  const inp = {
    width: "100%", padding: "9px 12px", borderRadius: 9,
    border: `1.5px solid ${T.inputBorder}`, background: T.inputBg,
    color: T.textPrimary, fontSize: 13, fontFamily: "inherit",
    outline: "none", boxSizing: "border-box",
  };
  const set = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* SMTP Server */}
      <div className="smtp-grid-host">
        <Field label="SMTP Host *" hint="e.g. smtp.gmail.com · smtp.zoho.com · mail.yourdomain.com">
          <input required style={inp} value={form.host} onChange={set("host")} placeholder="smtp.gmail.com" />
        </Field>
        <Field label="Port *" hint="587 = TLS  ·  465 = SSL  ·  25 = plain">
          <input required type="number" style={inp} value={form.port} onChange={set("port")} placeholder="587" />
        </Field>
      </div>

      {/* Encryption */}
      <Field label="Encryption">
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { label: "TLS / STARTTLS (recommended)", value: false },
            { label: "SSL",                          value: true  },
          ].map(({ label, value }) => (
            <label key={String(value)} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", padding: "8px 14px", borderRadius: 9, border: `1.5px solid ${form.secure === value ? "#8b5cf6" : T.inputBorder}`, background: form.secure === value ? "#f5f3ff" : T.inputBg, fontSize: 13, color: T.textPrimary, flex: 1 }}>
              <input type="radio" checked={form.secure === value} onChange={() => setForm((f) => ({ ...f, secure: value }))} style={{ accentColor: "#8b5cf6" }} />
              {label}
            </label>
          ))}
        </div>
      </Field>

      {/* Auth */}
      <div className="smtp-grid-auth">
        <Field label="SMTP Username *" hint="Usually your full email address">
          <input required style={inp} value={form.username} onChange={set("username")} placeholder="you@yourdomain.com" />
        </Field>
        <Field label={configured ? "Password (leave blank to keep current)" : "Password *"} hint="Gmail: use App Password from myaccount.google.com/apppasswords (enter with or without spaces)">
          <div style={{ position: "relative" }}>
            <input
              type={showPass ? "text" : "password"}
              required={!configured}
              style={{ ...inp, paddingRight: 38 }}
              value={form.password}
              onChange={set("password")}
              placeholder={configured ? "••••••••  (unchanged)" : "App password e.g. xxxx xxxx xxxx xxxx"}
            />
            <button type="button" onClick={() => setShowPass((v) => !v)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex" }}>
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>
      </div>

      {/* Sender identity */}
      <div className="smtp-grid-sender">
        <Field label="From Name *" hint="Shown as the sender name in email clients">
          <input required style={inp} value={form.fromName} onChange={set("fromName")} placeholder="Acme Corp CRM" />
        </Field>
        <Field label="From Email *" hint="Must be authorised by your SMTP provider">
          <input required type="email" style={inp} value={form.fromEmail} onChange={set("fromEmail")} placeholder="noreply@yourdomain.com" />
        </Field>
      </div>

      <button type="submit" disabled={submitting}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", color: "#fff", border: "none", borderRadius: 11, padding: "12px 20px", fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? .7 : 1 }}>
        <Server size={15} strokeWidth={2.2} />
        {submitting ? "Saving…" : configured ? "Update Settings" : "Save Settings"}
      </button>
    </form>
  );
}

export default function EmailSettingsSection() {
  const { T } = useTenantTheme();

  const [form, setForm]             = useState(EMPTY_FORM);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testEmail, setTestEmail]   = useState("");
  const [testing, setTesting]       = useState(false);
  const [removing, setRemoving]     = useState(false);
  const [toast, setToast]           = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 4000); };

  useEffect(() => {
    API.get("/tenant/smtp")
      .then(({ data }) => {
        if (data.configured) {
          setConfigured(true);
          setForm((f) => ({
            ...f,
            host:      data.host      || "",
            port:      String(data.port || 587),
            secure:    data.secure    || false,
            username:  data.username  || "",
            fromName:  data.fromName  || "",
            fromEmail: data.fromEmail || "",
            password:  "", // never pre-fill password
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.post("/tenant/smtp", { ...form, port: Number(form.port) });
      setConfigured(true);
      setForm((f) => ({ ...f, password: "" }));
      showToast("SMTP settings saved successfully!");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to save settings", false);
    } finally { setSubmitting(false); }
  };

  const handleTest = async () => {
    if (!testEmail) { showToast("Enter an email address to send the test to", false); return; }
    setTesting(true);
    try {
      const { data } = await API.post("/tenant/smtp/test", { to: testEmail });
      showToast(data.message || "Test email sent!");
    } catch (err) {
      showToast(err?.response?.data?.message || "Test failed", false);
    } finally { setTesting(false); }
  };

  const handleRemove = async () => {
    if (!window.confirm("Remove SMTP settings? The platform's default email will be used instead.")) return;
    setRemoving(true);
    try {
      await API.delete("/tenant/smtp");
      setConfigured(false);
      setForm(EMPTY_FORM);
      showToast("SMTP settings removed. Platform default will be used.");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to remove", false);
    } finally { setRemoving(false); }
  };

  const inp = { padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: T.inputBg, color: T.textPrimary, fontSize: 13, fontFamily: "inherit", outline: "none" };

  return (
    <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 760 }}>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: toast.ok ? "#22c55e" : "#ef4444", color: "#fff", padding: "12px 20px", borderRadius: 12, fontSize: 13.5, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,.15)" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: T.textPrimary }}>Email Configuration</h2>
        <p style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>
          Configure your own SMTP so that salary slips, proposals and payment reminders are sent from <strong>your</strong> email address.
          If not configured, the platform's default email is used.
        </p>
      </div>

      {/* Status banner */}
      {!loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: configured ? "#f0fdf4" : "#fefce8", border: `1px solid ${configured ? "#bbf7d0" : "#fde68a"}` }}>
          {configured
            ? <CheckCircle2 size={17} color="#16a34a" strokeWidth={2.2} />
            : <AlertCircle  size={17} color="#ca8a04" strokeWidth={2.2} />}
          <span style={{ fontSize: 13, fontWeight: 600, color: configured ? "#15803d" : "#92400e" }}>
            {configured
              ? `Custom SMTP active — emails sent via ${form.username}`
              : "Not configured — using platform default SMTP"}
          </span>
        </div>
      )}

      {/* Main card */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "#f5f3ff", display: "grid", placeItems: "center" }}>
            <Server size={17} color="#8b5cf6" strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>SMTP Server Settings</div>
            <div style={{ fontSize: 12, color: T.textMuted }}>Works with Gmail, Zoho, Outlook, cPanel Mail, or any SMTP provider</div>
          </div>
        </div>

        {loading
          ? <div style={{ padding: 40, textAlign: "center", color: T.textMuted }}>Loading…</div>
          : <SMTPForm form={form} setForm={setForm} onSubmit={handleSave} submitting={submitting} configured={configured} T={T} />}
      </div>

      {/* Test email */}
      {configured && (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "#eff6ff", display: "grid", placeItems: "center" }}>
              <Send size={16} color="#3b82f6" strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>Send Test Email</div>
              <div style={{ fontSize: 12, color: T.textMuted }}>Verify your SMTP config is working correctly</div>
            </div>
          </div>
          <div className="smtp-test-row">
            <input type="email" placeholder="Send test to…" value={testEmail} onChange={(e) => setTestEmail(e.target.value)}
              style={{ ...inp, flex: 1 }} />
            <button onClick={handleTest} disabled={testing}
              style={{ display: "flex", alignItems: "center", gap: 7, background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, fontFamily: "'Syne', sans-serif", cursor: testing ? "not-allowed" : "pointer", opacity: testing ? .7 : 1, whiteSpace: "nowrap" }}>
              <Send size={13} strokeWidth={2.5} /> {testing ? "Sending…" : "Send Test"}
            </button>
          </div>
        </div>
      )}

      {/* Security note */}
      <div style={{ display: "flex", gap: 10, padding: "14px 16px", borderRadius: 12, background: T.bg, border: `1px solid ${T.border}` }}>
        <Shield size={16} color={T.textMuted} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12.5, color: T.textMuted, lineHeight: 1.6, margin: 0 }}>
          Your SMTP password is stored AES-256 encrypted and never returned to the browser.
          For Gmail, <strong>create an App Password</strong> at myaccount.google.com/apppasswords —
          never use your main account password. For Google Workspace, enable 2FA first.
        </p>
      </div>

      {/* Remove config */}
      {configured && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={handleRemove} disabled={removing}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1.5px solid ${T.border}`, borderRadius: 9, padding: "8px 14px", fontSize: 13, color: T.textMuted, cursor: removing ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            <Trash2 size={13} strokeWidth={2} /> {removing ? "Removing…" : "Remove SMTP config"}
          </button>
        </div>
      )}
    </div>
  );
}
