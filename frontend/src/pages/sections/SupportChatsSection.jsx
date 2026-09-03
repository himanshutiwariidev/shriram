import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Building2, Headphones, Loader2, MessageCircle,
  RefreshCw, Send, X,
} from "lucide-react";
import { io } from "socket.io-client";
import API from "../../services/api";
import { T } from "./shared";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "https://crm.technicaltiwariji.com";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function SupportChatsSection() {
  const [conversations, setConversations] = useState([]);
  const [loadingConvs, setLoadingConvs]   = useState(true);
  const [selected, setSelected]           = useState(null); // { tenantId, tenantName }
  const [messages, setMessages]           = useState([]);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [input, setInput]                 = useState("");
  const [sending, setSending]             = useState(false);
  const socketRef         = useRef(null);
  const selectedTenantRef = useRef(null); // track selected tenantId for reconnect rejoin
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // ── Load conversations ────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    try {
      const { data } = await API.get("/support-chat/conversations");
      setConversations(data.conversations || []);
    } catch {
      // silent
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── Socket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    // Join on every (re)connect so room membership survives disconnects
    const joinSuperRoom = () => {
      socket.emit("join:superadmin:support");
      // Re-join the open conversation room if any
      if (selectedTenantRef.current) {
        socket.emit("join:support", selectedTenantRef.current);
      }
    };
    socket.on("connect", joinSuperRoom);

    socket.on("support:new", ({ tenantId, message }) => {
      // Update unread count in conversations list
      setConversations((prev) =>
        prev.map((c) =>
          c.tenantId?.toString() === tenantId?.toString()
            ? { ...c, unreadCount: c.unreadCount + 1, lastMessage: message }
            : c
        )
      );
      // Add to open conversation if it matches
      setSelected((sel) => {
        if (sel?.tenantId?.toString() === tenantId?.toString()) {
          setMessages((msgs) => {
            if (msgs.find((m) => m._id === message._id)) return msgs;
            return [...msgs, message];
          });
        }
        return sel;
      });
    });

    socket.on("support:message", (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      socket.off("connect", joinSuperRoom);
      socket.disconnect();
    };
  }, []);

  // ── Load messages for selected tenant ────────────────────────────────────
  const openConversation = async (conv) => {
    setSelected(conv);
    setMessages([]);
    setLoadingMsgs(true);
    selectedTenantRef.current = conv.tenantId;
    socketRef.current?.emit("join:support", conv.tenantId);
    try {
      const { data } = await API.get(`/support-chat/${conv.tenantId}/messages`);
      setMessages(data.messages || []);
      // Clear unread in list
      setConversations((prev) =>
        prev.map((c) =>
          c.tenantId?.toString() === conv.tenantId?.toString()
            ? { ...c, unreadCount: 0 }
            : c
        )
      );
    } catch {
      // silent
    } finally {
      setLoadingMsgs(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // ── Polling fallback (socket.io may be unavailable in production) ─────────
  // Poll conversations list every 8s to catch new tenants & update unread counts.
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const { data } = await API.get("/support-chat/conversations");
        setConversations(data.conversations || []);
      } catch { /* silent */ }
    }, 8000);
    return () => clearInterval(id);
  }, []);

  // Poll active conversation messages every 3s.
  useEffect(() => {
    if (!selected) return;
    const tid = selected.tenantId;
    const id = setInterval(async () => {
      try {
        const { data } = await API.get(`/support-chat/${tid}/messages`);
        setMessages((prev) => {
          const incoming = data.messages || [];
          const newOnes  = incoming.filter((m) => !prev.find((p) => p._id === m._id));
          return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
        });
      } catch { /* silent */ }
    }, 3000);
    return () => clearInterval(id);
  }, [selected]);

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || sending || !selected) return;
    const body = input.trim();
    setInput("");
    setSending(true);
    try {
      const { data } = await API.post(`/support-chat/${selected.tenantId}/messages`, { body });
      setMessages((prev) => {
        if (prev.find((m) => m._id === data.message._id)) return prev;
        return [...prev, data.message];
      });
      // Update conversation's last message
      setConversations((prev) =>
        prev.map((c) =>
          c.tenantId?.toString() === selected.tenantId?.toString()
            ? { ...c, lastMessage: data.message }
            : c
        )
      );
    } catch {
      setInput(body);
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", height: "calc(100vh - 130px)", display: "flex", gap: 20, minHeight: 0 }}>

      {/* ── Conversations sidebar ───────────────────────────────────────── */}
      <div style={{
        width: 300, flexShrink: 0,
        background: "#fff",
        borderRadius: 14, border: `1px solid ${T.border}`,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 2px 12px rgba(0,0,0,.05)",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 18px 12px",
          borderBottom: `1px solid ${T.borderLight}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Headphones size={16} color={T.brand} strokeWidth={2} />
            <span style={{ fontWeight: 700, fontSize: 13.5, color: T.textPrimary }}>Support Inbox</span>
            {totalUnread > 0 && (
              <span style={{
                minWidth: 18, height: 18, borderRadius: 9,
                background: T.red, color: "#fff", fontSize: 10, fontWeight: 700,
                display: "grid", placeItems: "center", padding: "0 4px",
              }}>{totalUnread}</span>
            )}
          </div>
          <button
            onClick={loadConversations}
            style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex", padding: 4 }}
          >
            <RefreshCw size={13} strokeWidth={2} />
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loadingConvs ? (
            <div style={{ padding: 32, display: "flex", justifyContent: "center" }}>
              <Loader2 size={20} color={T.brand} style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: T.textMuted, fontSize: 12.5 }}>
              <MessageCircle size={28} strokeWidth={1.4} color={T.borderLight} style={{ margin: "0 auto 10px" }} />
              No support requests yet
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = selected?.tenantId?.toString() === conv.tenantId?.toString();
              return (
                <div
                  key={conv.tenantId}
                  onClick={() => openConversation(conv)}
                  style={{
                    padding: "13px 16px",
                    borderBottom: `1px solid ${T.borderLight}`,
                    cursor: "pointer",
                    background: isActive ? T.brandLight : "transparent",
                    borderLeft: `3px solid ${isActive ? T.brand : "transparent"}`,
                    transition: "background .15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                      background: `linear-gradient(135deg,${T.brand}cc,${T.brand})`,
                      display: "grid", placeItems: "center",
                    }}>
                      <Building2 size={15} color="#fff" strokeWidth={2} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{
                          fontSize: 12.5, fontWeight: conv.unreadCount > 0 ? 700 : 600,
                          color: T.textPrimary,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{conv.tenantName}</span>
                        {conv.unreadCount > 0 && (
                          <span style={{
                            minWidth: 16, height: 16, borderRadius: 8,
                            background: T.brand, color: "#fff",
                            fontSize: 9.5, fontWeight: 700,
                            display: "grid", placeItems: "center", padding: "0 3px", flexShrink: 0,
                          }}>{conv.unreadCount}</span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 11, color: T.textMuted, marginTop: 1,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {conv.lastMessage?.body || "No messages yet"}
                      </div>
                      <div style={{ fontSize: 10, color: T.textMuted, marginTop: 1 }}>
                        {timeAgo(conv.lastMessage?.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Chat window ────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        background: "#fff",
        borderRadius: 14, border: `1px solid ${T.border}`,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 2px 12px rgba(0,0,0,.05)",
      }}>
        {!selected ? (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 10,
            color: T.textMuted,
          }}>
            <Headphones size={44} strokeWidth={1.2} color={T.borderLight} />
            <div style={{ fontSize: 14, fontWeight: 500, color: T.textSecondary }}>
              Select a conversation
            </div>
            <div style={{ fontSize: 12, color: T.textMuted }}>
              Pick a tenant from the inbox to view and reply to their messages.
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{
              padding: "14px 18px",
              borderBottom: `1px solid ${T.borderLight}`,
              display: "flex", alignItems: "center", gap: 10,
              flexShrink: 0,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: `linear-gradient(135deg,${T.brand}cc,${T.brand})`,
                display: "grid", placeItems: "center", flexShrink: 0,
              }}>
                <Building2 size={16} color="#fff" strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: T.textPrimary }}>
                  {selected.tenantName}
                </div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>
                  Support conversation
                </div>
              </div>
              <button
                onClick={() => { setSelected(null); setMessages([]); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, display: "flex" }}
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1, overflowY: "auto",
              padding: "16px 18px 8px",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              {loadingMsgs ? (
                <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
                  <Loader2 size={22} color={T.brand} style={{ animation: "spin 1s linear infinite" }} />
                </div>
              ) : messages.length === 0 ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: T.textMuted, textAlign: "center" }}>
                  <MessageCircle size={32} strokeWidth={1.4} color={T.borderLight} />
                  <div style={{ fontSize: 13, fontWeight: 500 }}>No messages yet</div>
                  <div style={{ fontSize: 12 }}>Reply to start the conversation.</div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderRole === "superadmin";
                  return (
                    <div key={msg._id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                      {!isMe && (
                        <div style={{
                          width: 26, height: 26, borderRadius: "50%",
                          background: `linear-gradient(135deg,${T.brand}cc,${T.brand})`,
                          display: "grid", placeItems: "center", flexShrink: 0,
                          marginRight: 7, alignSelf: "flex-end",
                        }}>
                          <Building2 size={12} color="#fff" strokeWidth={2} />
                        </div>
                      )}
                      <div style={{ maxWidth: "72%" }}>
                        {!isMe && (
                          <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 3, paddingLeft: 2 }}>
                            {msg.senderName || "Tenant Admin"}
                          </div>
                        )}
                        <div style={{
                          padding: "9px 13px",
                          borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                          background: isMe ? `linear-gradient(135deg,${T.brand}cc,${T.brand})` : "#f1f5f9",
                          color: isMe ? "#fff" : "#1e293b",
                          fontSize: 13, lineHeight: 1.5,
                          wordBreak: "break-word",
                        }}>
                          {msg.body}
                        </div>
                        <div style={{
                          fontSize: 10, color: T.textMuted, marginTop: 3,
                          textAlign: isMe ? "right" : "left",
                        }}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {" · "}
                          {new Date(msg.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{
              borderTop: `1px solid ${T.borderLight}`,
              padding: "12px 16px",
              display: "flex", gap: 10, alignItems: "flex-end",
              flexShrink: 0,
            }}>
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Reply to tenant… (Enter to send)"
                style={{
                  flex: 1, resize: "none",
                  border: `1.5px solid ${T.inputBorder}`,
                  borderRadius: 10, padding: "9px 12px",
                  fontSize: 13, fontFamily: "inherit",
                  outline: "none", lineHeight: 1.4,
                  maxHeight: 100, overflowY: "auto",
                  transition: "border-color .15s",
                  background: T.inputBg,
                  color: T.textPrimary,
                }}
                onFocus={(e) => (e.target.style.borderColor = T.brand)}
                onBlur={(e) => (e.target.style.borderColor = T.inputBorder)}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: input.trim() && !sending ? T.brand : T.borderLight,
                  border: "none", cursor: input.trim() && !sending ? "pointer" : "not-allowed",
                  display: "grid", placeItems: "center", flexShrink: 0,
                  transition: "background .15s",
                }}
              >
                {sending
                  ? <Loader2 size={15} color="#999" style={{ animation: "spin 1s linear infinite" }} />
                  : <Send size={15} color={input.trim() ? "#fff" : "#aaa"} strokeWidth={2} />
                }
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
