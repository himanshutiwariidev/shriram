import React, { useState, useEffect, useRef } from "react";
import { Bot, X, Send, Minimize2, Maximize2, AlertCircle, Loader2 } from "lucide-react";
import API from "../services/api";

/* ── Simple Markdown renderer (bold, lists, line breaks) ─────────────────── */
function renderMarkdown(text) {
  const lines = text.split("\n");
  const elements = [];
  let listBuf = [];

  const flushList = (key) => {
    if (listBuf.length) {
      elements.push(
        <ul key={key + "ul"} style={{ margin: "6px 0", paddingLeft: 18 }}>
          {listBuf.map((li, i) => <li key={i} style={{ marginBottom: 3 }}>{parseBold(li)}</li>)}
        </ul>
      );
      listBuf = [];
    }
  };

  const parseBold = (s) => {
    const parts = s.split(/\*\*(.*?)\*\*/g);
    return parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p);
  };

  lines.forEach((line, i) => {
    const stripped = line.trimStart();
    if (stripped.startsWith("- ") || stripped.startsWith("• ")) {
      listBuf.push(stripped.slice(2));
    } else {
      flushList(i);
      if (stripped === "") {
        elements.push(<br key={i} />);
      } else {
        elements.push(<span key={i} style={{ display: "block", marginBottom: 2 }}>{parseBold(stripped)}</span>);
      }
    }
  });
  flushList("end");
  return elements;
}

/* ── Quick-prompt suggestions ─────────────────────────────────────────────── */
const SUGGESTIONS = [
  "How many employees are absent today?",
  "What's the total salary paid this month?",
  "How many active projects do we have?",
  "Show me active client count",
  "How many tasks are overdue?",
];

export default function AiChat() {
  const [open, setOpen]         = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [assistantName, setAssistantName] = useState("CRM Assistant");
  const [error, setError]       = useState("");
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  /* Check if AI is enabled for this tenant */
  useEffect(() => {
    API.get("/ai/config")
      .then(({ data }) => {
        setAiEnabled(data.isEnabled && data.hasKey);
        setAssistantName(data.assistantName || "CRM Assistant");
      })
      .catch(() => setAiEnabled(false))
      .finally(() => setConfigLoaded(true));
  }, []);

  /* Add welcome message when opened for first time */
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `Hi! I'm **${assistantName}**, your CRM AI assistant. I have access to your live data — employees, attendance, projects, clients, tasks, and salary information.\n\nAsk me anything about your organisation!`,
      }]);
    }
  }, [open, assistantName]);

  /* Auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* Focus input when opened */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    setError("");

    const userMsg = { role: "user", content: msg };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    try {
      const { data } = await API.post("/ai/chat", {
        message: msg,
        history: next.slice(-12).map(m => ({ role: m.role, content: m.content })),
      });
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      const errMsg = err.response?.data?.message || "Something went wrong. Please try again.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  /* Don't render the button at all until we know if AI is enabled */
  if (!configLoaded) return null;
  if (!aiEnabled) return null;

  const panelW = expanded ? 520 : 380;
  const panelH = expanded ? 600 : 480;

  return (
    <>
      <style>{`
        @keyframes aic-slide-in {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes aic-fab-pulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(37,99,235,0.45), 0 0 0 0 rgba(37,99,235,0.3); }
          50%       { box-shadow: 0 4px 20px rgba(37,99,235,0.45), 0 0 0 8px rgba(37,99,235,0); }
        }
        .aic-fab {
          position: fixed; bottom: 28px; right: 28px; z-index: 1200;
          width: 54px; height: 54px; border-radius: 50%;
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 20px rgba(37,99,235,0.45);
          animation: aic-fab-pulse 3s infinite;
          transition: transform 0.18s;
        }
        .aic-fab:hover { transform: scale(1.1); }
        .aic-panel {
          position: fixed; bottom: 96px; right: 28px; z-index: 1200;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          display: flex; flex-direction: column;
          overflow: hidden;
          box-shadow: 0 24px 64px rgba(15,23,42,0.18), 0 4px 12px rgba(15,23,42,0.08);
          animation: aic-slide-in 0.22s cubic-bezier(0.22,1,0.36,1) both;
        }
        .aic-header {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 16px;
          background: linear-gradient(135deg, #0f172a, #1e3a8a);
          flex-shrink: 0;
        }
        .aic-header-icon {
          width: 34px; height: 34px; border-radius: 10px;
          background: rgba(255,255,255,0.12);
          display: grid; place-items: center; flex-shrink: 0;
        }
        .aic-header-name {
          flex: 1; font-size: 14px; font-weight: 700;
          color: #fff; font-family: 'Inter', sans-serif;
        }
        .aic-header-sub {
          font-size: 10px; color: rgba(255,255,255,0.45);
          font-weight: 400; display: block; margin-top: 1px;
        }
        .aic-header-live {
          display: flex; align-items: center; gap: 5px;
          font-size: 10px; font-weight: 600;
          color: rgba(255,255,255,0.6); flex-shrink: 0;
        }
        .aic-live-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #22c55e;
          animation: aic-fab-pulse 2s infinite;
        }
        .aic-btn {
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.55); padding: 4px;
          border-radius: 6px; transition: color 0.12s, background 0.12s;
          display: flex; align-items: center;
        }
        .aic-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }

        .aic-messages {
          flex: 1; overflow-y: auto; padding: 14px;
          display: flex; flex-direction: column; gap: 10px;
          font-family: 'Inter', sans-serif;
        }
        .aic-messages::-webkit-scrollbar { width: 4px; }
        .aic-messages::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }

        .aic-bubble {
          max-width: 88%; padding: 9px 13px;
          border-radius: 12px; font-size: 13px; line-height: 1.5;
          word-wrap: break-word;
        }
        .aic-bubble--user {
          align-self: flex-end;
          background: #1d4ed8; color: #fff;
          border-bottom-right-radius: 4px;
        }
        .aic-bubble--assistant {
          align-self: flex-start;
          background: #f8fafc; color: #0f172a;
          border: 1px solid #e8edf5;
          border-bottom-left-radius: 4px;
        }

        .aic-typing {
          align-self: flex-start; display: flex; gap: 4px; padding: 12px 16px;
          background: #f8fafc; border: 1px solid #e8edf5;
          border-radius: 12px; border-bottom-left-radius: 4px;
        }
        .aic-typing span {
          width: 6px; height: 6px; border-radius: 50%;
          background: #94a3b8; animation: aic-bounce 1.2s infinite;
        }
        .aic-typing span:nth-child(2) { animation-delay: 0.2s; }
        .aic-typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes aic-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30%            { transform: translateY(-5px); }
        }

        .aic-error {
          align-self: flex-start; display: flex; align-items: flex-start; gap: 8px;
          padding: 9px 13px; border-radius: 10px; max-width: 88%;
          background: #fef2f2; border: 1px solid #fca5a5;
          font-size: 12px; color: #dc2626; font-family: 'Inter', sans-serif;
        }

        .aic-suggestions {
          padding: 0 14px 10px;
          display: flex; flex-wrap: wrap; gap: 6px;
        }
        .aic-suggestion {
          padding: 5px 11px; border-radius: 99px;
          border: 1px solid #e2e8f0; background: #fff;
          font-size: 11.5px; font-weight: 500; color: #374151;
          cursor: pointer; font-family: 'Inter', sans-serif;
          transition: background 0.12s, border-color 0.12s;
        }
        .aic-suggestion:hover { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }

        .aic-input-bar {
          display: flex; gap: 8px; align-items: flex-end;
          padding: 10px 14px;
          border-top: 1px solid #f1f5f9;
          background: #fff; flex-shrink: 0;
        }
        .aic-textarea {
          flex: 1; border: 1px solid #e2e8f0; border-radius: 10px;
          padding: 9px 12px; font-size: 13px;
          font-family: 'Inter', sans-serif; color: #0f172a;
          resize: none; outline: none; min-height: 38px; max-height: 100px;
          overflow-y: auto; background: #f8fafc; transition: border-color 0.15s;
          line-height: 1.45;
        }
        .aic-textarea:focus { border-color: #2563eb; background: #fff; }
        .aic-send {
          width: 36px; height: 36px; border-radius: 10px; border: none;
          background: #1d4ed8; color: #fff; cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, opacity 0.15s;
        }
        .aic-send:hover:not(:disabled) { background: #1e40af; }
        .aic-send:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      {/* Floating action button */}
      <button className="aic-fab" onClick={() => setOpen(v => !v)} title={`Open ${assistantName}`}>
        {open ? <X size={22} color="#fff" /> : <Bot size={22} color="#fff" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="aic-panel" style={{ width: panelW, height: panelH }}>

          {/* Header */}
          <div className="aic-header">
            <div className="aic-header-icon">
              <Bot size={18} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="aic-header-name">
                {assistantName}
                <span className="aic-header-sub">Powered by AI · Live CRM data</span>
              </div>
            </div>
            <div className="aic-header-live">
              <div className="aic-live-dot" />
              Live
            </div>
            <button className="aic-btn" onClick={() => setExpanded(v => !v)} title={expanded ? "Shrink" : "Expand"}>
              {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button className="aic-btn" onClick={() => setOpen(false)} title="Close">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="aic-messages">
            {messages.map((m, i) => (
              <div key={i} className={`aic-bubble aic-bubble--${m.role}`}>
                {m.role === "assistant" ? renderMarkdown(m.content) : m.content}
              </div>
            ))}

            {loading && (
              <div className="aic-typing">
                <span /><span /><span />
              </div>
            )}

            {error && (
              <div className="aic-error">
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick suggestions (only on first message) */}
          {messages.length === 1 && !loading && (
            <div className="aic-suggestions">
              {SUGGESTIONS.map(s => (
                <button key={s} className="aic-suggestion" onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="aic-input-bar">
            <textarea
              ref={inputRef}
              className="aic-textarea"
              placeholder="Ask about attendance, revenue, projects…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
            />
            <button className="aic-send" onClick={() => sendMessage()} disabled={!input.trim() || loading}>
              {loading ? <Loader2 size={15} className="aic-spin" style={{ animation: "spin 1s linear infinite" }} /> : <Send size={15} />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
