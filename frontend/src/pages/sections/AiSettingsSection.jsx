import React, { useEffect, useState } from "react";
import { Bot, Eye, EyeOff, Save, CheckCircle2, AlertCircle, ChevronDown, Zap, Lock } from "lucide-react";
import API from "../../services/api";

/* ── Provider + model catalogue ─────────────────────────────────────────── */
const PROVIDERS = [
  {
    id: "claude",
    label: "Claude (Anthropic)",
    keyPlaceholder: "sk-ant-api03-…",
    keyHint: "console.anthropic.com → API Keys",
    models: [
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5",  tier: "cheap",    note: "Fastest · Low cost" },
      { id: "claude-sonnet-4-6",         label: "Claude Sonnet 4.6", tier: "paid",     note: "Balanced · Pay-per-use" },
      { id: "claude-opus-5",             label: "Claude Opus 5",     tier: "paid",     note: "Most capable · Higher cost" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI (GPT)",
    keyPlaceholder: "sk-…",
    keyHint: "platform.openai.com → API Keys",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o Mini",  tier: "cheap", note: "Fast · Most affordable" },
      { id: "gpt-4o",      label: "GPT-4o",        tier: "paid",  note: "Most capable · Paid" },
      { id: "gpt-4-turbo", label: "GPT-4 Turbo",   tier: "paid",  note: "Powerful · Paid" },
    ],
  },
  {
    id: "gemini",
    label: "Google Gemini",
    keyPlaceholder: "AIza…",
    keyHint: "aistudio.google.com → Get API key",
    models: [
      { id: "gemini-3.6-flash",   label: "Gemini 3.6 Flash",  tier: "free",  note: "Latest · Free tier" },
      { id: "gemini-1.5-flash-8b",label: "Gemini 1.5 Flash 8B",tier: "free", note: "Smaller · Free tier" },
      { id: "gemini-1.5-pro",     label: "Gemini 1.5 Pro",    tier: "paid",  note: "Powerful · Paid plan needed" },
    ],
  },
  {
    id: "groq",
    label: "Groq (Free & Ultra-fast)",
    keyPlaceholder: "gsk_…",
    keyHint: "console.groq.com → API Keys — 100% free tier available",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B",   tier: "free", note: "Best quality · Free" },
      { id: "llama-3.1-70b-versatile", label: "Llama 3.1 70B",   tier: "free", note: "High quality · Free" },
      { id: "llama-3.1-8b-instant",    label: "Llama 3.1 8B",    tier: "free", note: "Fastest · Free" },
      { id: "gemma2-9b-it",            label: "Gemma 2 9B",       tier: "free", note: "Compact · Free" },
      { id: "mixtral-8x7b-32768",      label: "Mixtral 8x7B",     tier: "free", note: "Long context · Free" },
    ],
  },
  {
    id: "mistral",
    label: "Mistral AI",
    keyPlaceholder: "…",
    keyHint: "console.mistral.ai → API Keys — free tier available",
    models: [
      { id: "open-mistral-7b",       label: "Mistral 7B",       tier: "free",  note: "Open model · Free" },
      { id: "mistral-small-latest",  label: "Mistral Small",    tier: "cheap", note: "Affordable" },
      { id: "mistral-medium-latest", label: "Mistral Medium",   tier: "paid",  note: "Balanced · Paid" },
      { id: "mistral-large-latest",  label: "Mistral Large",    tier: "paid",  note: "Most capable · Paid" },
    ],
  },
];

const TIER_STYLE = {
  free:  { bg: "#f0fdf4", color: "#15803d", border: "#86efac", icon: "FREE"  },
  cheap: { bg: "#eff6ff", color: "#1d4ed8", border: "#93c5fd", icon: "LOW$"  },
  paid:  { bg: "#fef3c7", color: "#b45309", border: "#fcd34d", icon: "PAID"  },
};

export default function AiSettingsSection() {
  const [config, setConfig]   = useState({ provider: "groq", apiKey: "", model: "llama-3.3-70b-versatile", isEnabled: false, assistantName: "CRM Assistant", hasKey: false });
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/ai/config")
      .then(({ data }) => setConfig(c => ({ ...c, ...data })))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const provider = PROVIDERS.find(p => p.id === config.provider) || PROVIDERS[0];
  const selectedModel = provider.models.find(m => m.id === config.model) || provider.models[0];

  /* When provider changes, auto-select first (free) model */
  const handleProviderChange = (newProvider) => {
    const p = PROVIDERS.find(x => x.id === newProvider);
    const defaultModel = (p?.models.find(m => m.tier === "free") || p?.models[0])?.id || "";
    setConfig(c => ({ ...c, provider: newProvider, model: defaultModel }));
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await API.post("/ai/config", {
        provider:      config.provider,
        apiKey:        config.apiKey,
        model:         config.model || provider.models[0].id,
        isEnabled:     config.isEnabled,
        assistantName: config.assistantName || "CRM Assistant",
      });
      const { data } = await API.get("/ai/config");
      setConfig(c => ({ ...c, ...data }));
      setStatus({ type: "success", msg: "Configuration saved." });
    } catch (err) {
      setStatus({ type: "error", msg: err.response?.data?.message || "Failed to save. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: "20px 0", color: "#94a3b8", fontSize: 13 }}>Loading AI settings…</div>;

  const inp = {
    width: "100%", boxSizing: "border-box", padding: "9px 12px",
    border: "1px solid #e2e8f0", borderRadius: 8,
    fontSize: 13, fontFamily: "'Inter', sans-serif", color: "#0f172a",
    background: "#fff", outline: "none",
  };
  const sel = { ...inp, appearance: "none", cursor: "pointer", paddingRight: 32 };
  const tierStyle = TIER_STYLE[selectedModel?.tier || "free"];

  return (
    <div className="ais-root">
      <style>{`
        .ais-root { display: flex; flex-direction: column; gap: 18px; font-family: 'Inter', sans-serif; }

        .ais-toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .ais-toggle-title { font-size: 14px; font-weight: 600; color: #0f172a; display: flex; align-items: center; gap: 7px; }
        .ais-toggle-desc { font-size: 12px; color: #64748b; margin-top: 3px; }

        .ais-switch { position: relative; width: 46px; height: 26px; flex-shrink: 0; }
        .ais-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
        .ais-slider { position: absolute; inset: 0; border-radius: 99px; background: #e2e8f0; cursor: pointer; transition: background .2s; }
        .ais-slider::before { content: ''; position: absolute; width: 20px; height: 20px; left: 3px; top: 3px; border-radius: 50%; background: #fff; transition: transform .2s; box-shadow: 0 1px 3px rgba(0,0,0,.18); }
        .ais-switch input:checked + .ais-slider { background: #2563eb; }
        .ais-switch input:checked + .ais-slider::before { transform: translateX(20px); }

        .ais-divider { height: 1px; background: #f1f5f9; }

        .ais-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .ais-field { display: flex; flex-direction: column; gap: 5px; }
        .ais-label { font-size: 10.5px; font-weight: 700; color: #64748b; letter-spacing: 0.06em; text-transform: uppercase; }
        .ais-hint  { font-size: 10.5px; color: #94a3b8; margin-top: 3px; }

        .ais-key-wrap { position: relative; }
        .ais-eye { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #94a3b8; display: flex; align-items: center; padding: 2px; }
        .ais-eye:hover { color: #2563eb; }
        .ais-sel-wrap { position: relative; }
        .ais-chevron { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }

        .ais-model-info {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px; border-radius: 9px;
          border: 1px solid var(--border);
          background: var(--bg);
        }
        .ais-tier-tag {
          padding: 2px 8px; border-radius: 4px; font-size: 9.5px; font-weight: 800;
          letter-spacing: 0.08em; background: var(--bg); color: var(--color); border: 1px solid var(--border);
          flex-shrink: 0;
        }
        .ais-model-note-txt { font-size: 12px; font-weight: 500; color: var(--color); }

        .ais-active-banner {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 15px; border-radius: 9px;
          background: #eff6ff; border: 1px solid #bfdbfe;
        }
        .ais-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; flex-shrink: 0; animation: ais-pulse 2s infinite; }
        @keyframes ais-pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(34,197,94,.2); }
          50%       { box-shadow: 0 0 0 6px rgba(34,197,94,.06); }
        }

        .ais-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .ais-save-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer;
          font-size: 13px; font-weight: 600; font-family: 'Inter', sans-serif;
          background: #1d4ed8; color: #fff; transition: background .15s, opacity .15s;
        }
        .ais-save-btn:hover:not(:disabled) { background: #1e40af; }
        .ais-save-btn:disabled { opacity: .55; cursor: not-allowed; }
        .ais-status { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; }
        .ais-status--success { background: #f0fdf4; color: #15803d; border: 1px solid #86efac; }
        .ais-status--error   { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }

        @media (max-width: 600px) { .ais-row { grid-template-columns: 1fr; } }
      `}</style>

      {/* Enable toggle */}
      <div className="ais-toggle-row">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ais-toggle-title">
            <Bot size={16} color={config.isEnabled ? "#2563eb" : "#94a3b8"} />
            AI Assistant
          </div>
          <div className="ais-toggle-desc">
            {config.isEnabled ? "AI is active — use the chat widget on the dashboard." : "Enable to query employees, attendance, revenue and more using AI."}
          </div>
        </div>
        <label className="ais-switch">
          <input type="checkbox" checked={config.isEnabled} onChange={e => setConfig(c => ({ ...c, isEnabled: e.target.checked }))} />
          <span className="ais-slider" />
        </label>
      </div>

      {config.isEnabled && config.hasKey && (
        <div className="ais-active-banner">
          <div className="ais-live-dot" />
          <div style={{ fontSize: 13, fontWeight: 500, color: "#1d4ed8" }}>AI is live — chat widget is active on your dashboard.</div>
        </div>
      )}

      <div className="ais-divider" />

      {/* Row 1: Name + Provider */}
      <div className="ais-row">
        <div className="ais-field">
          <label className="ais-label">Assistant Name</label>
          <input type="text" style={inp} value={config.assistantName} onChange={e => setConfig(c => ({ ...c, assistantName: e.target.value }))} placeholder="e.g. Bharat AI" />
        </div>
        <div className="ais-field">
          <label className="ais-label">AI Provider</label>
          <div className="ais-sel-wrap">
            <select style={sel} value={config.provider} onChange={e => handleProviderChange(e.target.value)}>
              {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <ChevronDown size={13} className="ais-chevron" />
          </div>
        </div>
      </div>

      {/* Row 2: API Key + Model */}
      <div className="ais-row">
        <div className="ais-field">
          <label className="ais-label">API Key</label>
          <div className="ais-key-wrap">
            <input
              type={showKey ? "text" : "password"}
              style={{ ...inp, paddingRight: 36 }}
              value={config.apiKey}
              onChange={e => setConfig(c => ({ ...c, apiKey: e.target.value }))}
              placeholder={provider.keyPlaceholder}
              autoComplete="new-password"
            />
            <button className="ais-eye" type="button" onClick={() => setShowKey(v => !v)}>
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div className="ais-hint">{provider.keyHint}</div>
        </div>

        <div className="ais-field">
          <label className="ais-label">Model</label>
          <div className="ais-sel-wrap">
            <select
              style={sel}
              value={config.model}
              onChange={e => setConfig(c => ({ ...c, model: e.target.value }))}
            >
              {provider.models.map(m => (
                <option key={m.id} value={m.id}>
                  {m.tier === "paid" ? "🔒 " : m.tier === "free" ? "✅ " : "💰 "}
                  {m.label} — {m.note}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="ais-chevron" />
          </div>

          {/* Model tier info badge */}
          {selectedModel && (
            <div className="ais-model-info" style={{ "--bg": tierStyle.bg, "--color": tierStyle.color, "--border": tierStyle.border, marginTop: 6 }}>
              {selectedModel.tier === "paid"
                ? <Lock size={12} color={tierStyle.color} style={{ flexShrink: 0 }} />
                : <Zap  size={12} color={tierStyle.color} style={{ flexShrink: 0 }} />
              }
              <span className="ais-tier-tag" style={{ "--bg": tierStyle.bg, "--color": tierStyle.color, "--border": tierStyle.border }}>
                {tierStyle.icon}
              </span>
              <span className="ais-model-note-txt">{selectedModel.note}</span>
              {selectedModel.tier === "paid" && (
                <span style={{ fontSize: 10.5, color: "#b45309", marginLeft: "auto", flexShrink: 0 }}>Paid API key required</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save */}
      <div className="ais-actions">
        <button className="ais-save-btn" onClick={handleSave} disabled={saving}>
          <Save size={14} />
          {saving ? "Saving…" : "Save Configuration"}
        </button>
        {status && (
          <div className={`ais-status ais-status--${status.type}`}>
            {status.type === "success" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            {status.msg}
          </div>
        )}
      </div>
    </div>
  );
}
