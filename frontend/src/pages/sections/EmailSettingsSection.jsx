import React, { useEffect, useState } from "react";
import {
  Server, Lock, Send, CheckCircle2, AlertCircle,
  Eye, EyeOff, Trash2, Shield,
} from "lucide-react";
import useTenantTheme from "../../hooks/useTenantTheme";
import API from "../../services/api";

const EMPTY_FORM = {
  host: "", port: "587", secure: false,
  username: "", password: "", fromName: "", fromEmail: "",
};

export default function EmailSettingsSection() {
  const { T } = useTenantTheme();

  const [form, setForm]             = useState(EMPTY_FORM);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass]     = useState(false);
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
            ...f, host: data.host || "", port: String(data.port || 587),
            secure: data.secure || false, username: data.username || "",
            fromName: data.fromName || "", fromEmail: data.fromEmail || "", password: "",
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.post("/tenant/smtp", { ...form, port: Number(form.port) });
      setConfigured(true);
      setForm((f) => ({ ...f, password: "" }));
      showToast("SMTP settings saved!");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to save settings", false);
    } finally { setSubmitting(false); }
  };

  const handleTest = async () => {
    if (!testEmail) { showToast("Enter an email to test", false); return; }
    setTesting(true);
    try {
      const { data } = await API.post("/tenant/smtp/test", { to: testEmail });
      showToast(data.message || "Test email sent!");
    } catch (err) {
      showToast(err?.response?.data?.message || "Test failed", false);
    } finally { setTesting(false); }
  };

  const handleRemove = async () => {
    if (!window.confirm("Remove SMTP settings? Platform default email will be used instead.")) return;
    setRemoving(true);
    try {
      await API.delete("/tenant/smtp");
      setConfigured(false);
      setForm(EMPTY_FORM);
      showToast("SMTP settings removed.");
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to remove", false);
    } finally { setRemoving(false); }
  };

  const inp = {
    width: "100%", boxSizing: "border-box",
    padding: "8px 11px", borderRadius: 8,
    border: `1.5px solid ${T.inputBorder}`, background: T.inputBg,
    color: T.textPrimary, fontSize: 12.5, fontFamily: "inherit", outline: "none",
  };
  const lbl = { fontSize: 10.5, fontWeight: 700, color: T.textSecondary, marginBottom: 4, display: "block", textTransform: "uppercase", letterSpacing: "0.06em" };
  const hint = { fontSize: 10.5, color: T.textMuted, marginTop: 3 };

  if (loading) return <div style={{ padding: 32, textAlign: "center", color: T.textMuted, fontSize: 13 }}>Loading…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: "'Inter', sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: toast.ok ? "#22c55e" : "#ef4444", color: "#fff", padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,.15)" }}>
          {toast.msg}
        </div>
      )}

      {/* Status banner */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 13px", borderRadius: 9, background: configured ? "#f0fdf4" : "#fefce8", border: `1px solid ${configured ? "#bbf7d0" : "#fde68a"}` }}>
        {configured
          ? <CheckCircle2 size={14} color="#16a34a" strokeWidth={2.3} />
          : <AlertCircle  size={14} color="#ca8a04" strokeWidth={2.3} />}
        <span style={{ fontSize: 12, fontWeight: 600, color: configured ? "#15803d" : "#92400e" }}>
          {configured ? `Active — emails via ${form.username}` : "Not configured — using platform default"}
        </span>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Host + Port */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
          <div>
            <span style={lbl}>SMTP Host *</span>
            <input required style={inp} value={form.host} onChange={set("host")} placeholder="smtp.gmail.com" />
            <div style={hint}>smtp.gmail.com · smtp.zoho.com</div>
          </div>
          <div>
            <span style={lbl}>Port *</span>
            <input required type="number" style={inp} value={form.port} onChange={set("port")} placeholder="587" />
            <div style={hint}>587=TLS · 465=SSL</div>
          </div>
        </div>

        {/* Encryption */}
        <div>
          <span style={lbl}>Encryption</span>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: "TLS / STARTTLS (recommended)", value: false },
              { label: "SSL", value: true },
            ].map(({ label, value }) => (
              <label key={String(value)} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", padding: "7px 12px", borderRadius: 8, border: `1.5px solid ${form.secure === value ? "#8b5cf6" : T.inputBorder}`, background: form.secure === value ? "#f5f3ff" : T.inputBg, fontSize: 12, color: T.textPrimary, flex: 1 }}>
                <input type="radio" checked={form.secure === value} onChange={() => setForm((f) => ({ ...f, secure: value }))} style={{ accentColor: "#8b5cf6" }} />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Username + Password */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <span style={lbl}>SMTP Username *</span>
            <input required style={inp} value={form.username} onChange={set("username")} placeholder="you@yourdomain.com" />
            <div style={hint}>Usually your email address</div>
          </div>
          <div>
            <span style={lbl}>{configured ? "Password (blank = keep)" : "Password *"}</span>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                required={!configured}
                style={{ ...inp, paddingRight: 34 }}
                value={form.password}
                onChange={set("password")}
                placeholder={configured ? "••••••••  (unchanged)" : "App password"}
              />
              <button type="button" onClick={() => setShowPass((v) => !v)}
                style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex" }}>
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <div style={hint}>Gmail: use App Password</div>
          </div>
        </div>

        {/* From Name + From Email */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <span style={lbl}>From Name *</span>
            <input required style={inp} value={form.fromName} onChange={set("fromName")} placeholder="Acme Corp" />
            <div style={hint}>Sender name in email clients</div>
          </div>
          <div>
            <span style={lbl}>From Email *</span>
            <input required type="email" style={inp} value={form.fromEmail} onChange={set("fromEmail")} placeholder="noreply@yourdomain.com" />
            <div style={hint}>Authorised by your SMTP provider</div>
          </div>
        </div>

        {/* Save */}
        <button type="submit" disabled={submitting}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "linear-gradient(135deg,#8b5cf6,#7c3aed)", color: "#fff", border: "none", borderRadius: 9, padding: "10px 18px", fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? .7 : 1 }}>
          <Server size={14} strokeWidth={2.2} />
          {submitting ? "Saving…" : configured ? "Update Settings" : "Save Settings"}
        </button>
      </form>

      {/* Test email row (compact) */}
      {configured && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
          <Send size={13} color="#3b82f6" strokeWidth={2.2} style={{ flexShrink: 0 }} />
          <input type="email" placeholder="Test email address…" value={testEmail} onChange={(e) => setTestEmail(e.target.value)}
            style={{ ...inp, flex: 1 }} />
          <button onClick={handleTest} disabled={testing}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", cursor: testing ? "not-allowed" : "pointer", opacity: testing ? .7 : 1, whiteSpace: "nowrap" }}>
            {testing ? "Sending…" : "Send Test"}
          </button>
          <button onClick={handleRemove} disabled={removing} title="Remove SMTP config"
            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: `1.5px solid ${T.border}`, borderRadius: 8, padding: "7px 10px", fontSize: 12, color: T.textMuted, cursor: removing ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
            <Trash2 size={13} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Security note (compact) */}
      <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderRadius: 9, background: T.bg, border: `1px solid ${T.border}` }}>
        <Shield size={13} color={T.textMuted} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 11.5, color: T.textMuted, lineHeight: 1.55 }}>
          Password stored AES-256 encrypted. For Gmail, create an <strong>App Password</strong> at myaccount.google.com/apppasswords — never use your main password.
        </span>
      </div>
    </div>
  );
}
