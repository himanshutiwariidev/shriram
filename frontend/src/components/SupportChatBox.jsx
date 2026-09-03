import React, { useEffect, useRef, useState, useCallback } from "react";
import { X, Send, Headphones, Loader2, MessageCircle } from "lucide-react";
import { io } from "socket.io-client";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "https://crm.technicaltiwariji.com";

export default function SupportChatBox({ open, onOpen, onClose }) {
  const { tenantId, user } = useAuth();
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [sending, setSending]     = useState(false);
  const [unread, setUnread]       = useState(0);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Load messages when opened
  const loadMessages = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data } = await API.get(`/support-chat/${tenantId}/messages`);
      setMessages(data.messages || []);
      setUnread(0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Fetch unread count on mount so badge shows correctly after page refresh
  useEffect(() => {
    if (!tenantId) return;
    API.get("/support-chat/unread-count").then(({ data }) => {
      setUnread(data.count || 0);
    }).catch(() => {});
  }, [tenantId]);

  // Socket setup — join room on every (re)connect so rejoining after
  // network drop works automatically
  useEffect(() => {
    if (!tenantId) return;

    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    const joinRoom = () => socket.emit("join:support", tenantId);
    socket.on("connect", joinRoom);

    socket.on("support:message", (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      // Use functional ref to read current open value without adding it as dep
      setUnread((n) => {
        return msg.senderRole === "superadmin" ? n + 1 : n;
      });
    });

    return () => {
      socket.off("connect", joinRoom);
      socket.emit("leave:support", tenantId);
      socket.disconnect();
    };
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load messages & clear unread when panel opens
  useEffect(() => {
    if (open) {
      loadMessages();
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open, loadMessages]);

  // Polling fallback — socket.io may not be available in production.
  // When chat is open: poll every 3s for new messages.
  // When closed: poll every 30s for unread count badge.
  useEffect(() => {
    if (!tenantId) return;

    const pollMessages = async () => {
      try {
        const { data } = await API.get(`/support-chat/${tenantId}/messages`);
        setMessages((prev) => {
          const incoming = data.messages || [];
          const newOnes  = incoming.filter((m) => !prev.find((p) => p._id === m._id));
          return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
        });
      } catch { /* silent */ }
    };

    const pollUnread = async () => {
      try {
        const { data } = await API.get("/support-chat/unread-count");
        setUnread(data.count || 0);
      } catch { /* silent */ }
    };

    const interval = setInterval(open ? pollMessages : pollUnread, open ? 3000 : 30000);
    return () => clearInterval(interval);
  }, [open, tenantId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const body = input.trim();
    setInput("");
    setSending(true);
    try {
      const { data } = await API.post(`/support-chat/${tenantId}/messages`, { body });
      // Socket will echo it back, but add locally as fallback
      setMessages((prev) => {
        if (prev.find((m) => m._id === data.message._id)) return prev;
        return [...prev, data.message];
      });
    } catch {
      setInput(body); // restore on failure
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open && unread === 0) return null;

  // Unread badge (chat not open)
  if (!open) {
    return (
      <div style={{ position: "fixed", bottom: 28, right: 28, zIndex: 9999 }}>
        <button
          onClick={() => onOpen?.()}
          style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
            border: "none", cursor: "pointer",
            display: "grid", placeItems: "center",
            boxShadow: "0 4px 20px rgba(124,58,237,.45)",
            position: "relative",
          }}
        >
          <MessageCircle size={22} color="#fff" strokeWidth={2} />
          {unread > 0 && (
            <span style={{
              position: "absolute", top: -3, right: -3,
              minWidth: 18, height: 18, borderRadius: 9,
              background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700,
              display: "grid", placeItems: "center", padding: "0 3px",
              border: "2px solid #fff",
            }}>{unread > 9 ? "9+" : unread}</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed", bottom: 28, right: 28, zIndex: 9999,
      width: 360, height: 500,
      borderRadius: 18,
      background: "#fff",
      boxShadow: "0 8px 48px rgba(0,0,0,.18), 0 2px 12px rgba(0,0,0,.1)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      fontFamily: "'Inter', sans-serif",
      border: "1px solid #e8eef6",
    }}>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
        padding: "14px 16px",
        display: "flex", alignItems: "center", gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "rgba(255,255,255,.2)",
          display: "grid", placeItems: "center", flexShrink: 0,
        }}>
          <Headphones size={17} color="#fff" strokeWidth={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 13.5, lineHeight: 1 }}>
            Support Chat
          </div>
          <div style={{ color: "rgba(255,255,255,.75)", fontSize: 11, marginTop: 3 }}>
            Chat directly with Platform Admin
          </div>
        </div>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,.15)", border: "none", cursor: "pointer",
          width: 28, height: 28, borderRadius: "50%",
          display: "grid", placeItems: "center", flexShrink: 0,
        }}>
          <X size={14} color="#fff" strokeWidth={2.5} />
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "14px 14px 6px",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {loading ? (
          <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
            <Loader2 size={22} color="#7c3aed" strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 8,
            color: "#94a3b8", textAlign: "center",
          }}>
            <Headphones size={32} strokeWidth={1.4} color="#cbd5e1" />
            <div style={{ fontSize: 13, fontWeight: 500 }}>Start a conversation</div>
            <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
              Send a message and our team will<br />respond as soon as possible.
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderRole === "tenant_admin";
            return (
              <div key={msg._id} style={{
                display: "flex",
                justifyContent: isMe ? "flex-end" : "flex-start",
              }}>
                {!isMe && (
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                    display: "grid", placeItems: "center", flexShrink: 0,
                    marginRight: 7, alignSelf: "flex-end",
                  }}>
                    <Headphones size={12} color="#fff" strokeWidth={2} />
                  </div>
                )}
                <div style={{ maxWidth: "76%" }}>
                  <div style={{
                    padding: "9px 13px",
                    borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: isMe ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "#f1f5f9",
                    color: isMe ? "#fff" : "#1e293b",
                    fontSize: 13, lineHeight: 1.5,
                    wordBreak: "break-word",
                  }}>
                    {msg.body}
                  </div>
                  <div style={{
                    fontSize: 10, color: "#94a3b8", marginTop: 3,
                    textAlign: isMe ? "right" : "left",
                  }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
        borderTop: "1px solid #e8eef6",
        padding: "10px 12px",
        display: "flex", gap: 8, alignItems: "flex-end",
        flexShrink: 0, background: "#fff",
      }}>
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message… (Enter to send)"
          style={{
            flex: 1, resize: "none", border: "1.5px solid #e2e8f0",
            borderRadius: 10, padding: "9px 12px",
            fontSize: 13, fontFamily: "inherit",
            outline: "none", lineHeight: 1.4,
            maxHeight: 90, overflowY: "auto",
            transition: "border-color .15s",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
          onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: input.trim() && !sending
              ? "linear-gradient(135deg,#7c3aed,#4f46e5)"
              : "#e2e8f0",
            border: "none", cursor: input.trim() && !sending ? "pointer" : "not-allowed",
            display: "grid", placeItems: "center", flexShrink: 0,
            transition: "background .15s",
          }}
        >
          {sending
            ? <Loader2 size={15} color="#94a3b8" strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
            : <Send size={15} color={input.trim() ? "#fff" : "#94a3b8"} strokeWidth={2} />
          }
        </button>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
