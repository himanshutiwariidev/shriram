import React, { useEffect, useRef, useState, useCallback } from "react";
import API from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  MessageSquare, Send, Hash, User, Plus, X, Search,
  Building2, Briefcase, MessageCircle,
} from "lucide-react";

const ROOM_ICONS = {
  department: Hash,
  project: Briefcase,
  dm: User,
};

function Avatar({ name, size = 32 }) {
  const initials = (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["#2563eb","#7c3aed","#0891b2","#d97706","#dc2626","#16a34a","#db2777"];
  const color = colors[initials.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function Message({ msg, myId }) {
  const isMine = msg.senderId?._id === myId || msg.senderId === myId;
  const name = msg.senderId?.name || "User";
  const time = new Date(msg.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return (
    <div style={{ display: "flex", gap: 10, flexDirection: isMine ? "row-reverse" : "row", marginBottom: 14, alignItems: "flex-end" }}>
      {!isMine && <Avatar name={name} size={30} />}
      <div style={{ maxWidth: "70%" }}>
        {!isMine && <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 3 }}>{name}</div>}
        <div style={{
          background: isMine ? "#2563eb" : "#f1f5f9",
          color: isMine ? "#fff" : "#1e293b",
          padding: "9px 14px", borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          fontSize: 13, lineHeight: 1.5, wordBreak: "break-word",
        }}>{msg.body}</div>
        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3, textAlign: isMine ? "right" : "left" }}>{time}</div>
      </div>
    </div>
  );
}

export default function ChatSection() {
  const { user } = useAuth();
  const myId = user?.id;
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [unread, setUnread] = useState({});
  const [showDmSearch, setShowDmSearch] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const messagesEndRef = useRef(null);

  const loadRooms = useCallback(async () => {
    try {
      const { data } = await API.get("/chat/rooms");
      setRooms(data.rooms || []);
    } catch { /* ignore */ }
  }, []);

  const loadUnread = useCallback(async () => {
    try {
      const { data } = await API.get("/chat/unread");
      setUnread(data.counts || {});
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadRooms();
    loadUnread();
    const iv = setInterval(loadUnread, 30000);
    return () => clearInterval(iv);
  }, [loadRooms, loadUnread]);

  const openRoom = async (room) => {
    setActiveRoom(room);
    setMessages([]);
    setLoadingMsgs(true);
    try {
      const { data } = await API.get(`/chat/rooms/${encodeURIComponent(room.id)}/messages`);
      setMessages(data.messages || []);
      setUnread((u) => ({ ...u, [room.id]: 0 }));
    } catch { /* ignore */ }
    finally { setLoadingMsgs(false); }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMsg = async () => {
    if (!draft.trim() || !activeRoom || sending) return;
    const body = draft.trim();
    setDraft("");
    setSending(true);
    try {
      const { data } = await API.post("/chat/messages", { roomId: activeRoom.id, body });
      setMessages((m) => [...m, data.message]);
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } };

  const openDm = async (targetUser) => {
    setShowDmSearch(false);
    setUserSearch("");
    try {
      const { data } = await API.post("/chat/dm", { userId: targetUser._id });
      const room = { id: data.roomId, label: data.label, type: "dm", otherId: data.otherId };
      setRooms((r) => {
        if (r.find((x) => x.id === room.id)) return r;
        return [...r, room];
      });
      openRoom(room);
    } catch { /* ignore */ }
  };

  const loadUsers = async () => {
    if (allUsers.length > 0) return;
    try {
      const { data } = await API.get("/chat/users");
      setAllUsers(data.users || []);
    } catch { /* ignore */ }
  };

  const filteredUsers = allUsers.filter((u) =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const grouped = {
    department: rooms.filter((r) => r.type === "department"),
    project: rooms.filter((r) => r.type === "project"),
    dm: rooms.filter((r) => r.type === "dm"),
  };

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif", display: "grid", gridTemplateColumns: "240px 1fr", height: "calc(100vh - 200px)", minHeight: 500, gap: 0, background: "#fff", border: "1px solid #e8eaf0", borderRadius: 16, overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{ borderRight: "1px solid #f1f5f9", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
        {/* Header */}
        <div style={{ padding: "16px 14px 12px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b", display: "flex", alignItems: "center", gap: 7 }}>
              <MessageSquare size={16} color="#2563eb" /> Team Chat
            </div>
            <button onClick={() => { setShowDmSearch(true); loadUsers(); }}
              title="New DM" style={{ background: "#eff6ff", border: "none", borderRadius: 7, padding: "4px 7px", cursor: "pointer", color: "#2563eb" }}>
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Room list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {[
            { key: "department", label: "Departments", Icon: Hash },
            { key: "project", label: "Projects", Icon: Briefcase },
            { key: "dm", label: "Direct Messages", Icon: MessageCircle },
          ].map(({ key, label, Icon }) => (
            <div key={key}>
              <div style={{ padding: "8px 14px 4px", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 5 }}>
                <Icon size={10} /> {label}
              </div>
              {grouped[key].length === 0 && (
                <div style={{ padding: "3px 14px 6px", fontSize: 11, color: "#cbd5e1" }}>None</div>
              )}
              {grouped[key].map((room) => {
                const unreadCount = unread[room.id] || 0;
                const isActive = activeRoom?.id === room.id;
                return (
                  <button key={room.id} onClick={() => openRoom(room)} style={{
                    width: "100%", textAlign: "left", padding: "7px 14px", border: "none", cursor: "pointer", fontFamily: "inherit",
                    background: isActive ? "#eff6ff" : "transparent",
                    color: isActive ? "#2563eb" : "#475569",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    fontSize: 13, fontWeight: isActive ? 700 : 500, borderRadius: 0,
                  }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {key !== "dm" ? `# ` : ""}{room.label}
                    </span>
                    {unreadCount > 0 && (
                      <span style={{ background: "#2563eb", color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 700, padding: "1px 7px", flexShrink: 0 }}>{unreadCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        {!activeRoom ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#94a3b8" }}>
            <MessageSquare size={48} color="#e2e8f0" />
            <div style={{ fontSize: 14 }}>Select a room to start chatting</div>
          </div>
        ) : (
          <>
            {/* Room header */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
              {(() => { const I = ROOM_ICONS[activeRoom.type] || Hash; return <I size={16} color="#64748b" />; })()}
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{activeRoom.label}</div>
              <span style={{ fontSize: 11, color: "#94a3b8", background: "#f1f5f9", borderRadius: 6, padding: "2px 8px", fontWeight: 600 }}>{activeRoom.type}</span>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {loadingMsgs && <div style={{ color: "#94a3b8", textAlign: "center", padding: 20 }}>Loading messages…</div>}
              {!loadingMsgs && messages.length === 0 && (
                <div style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>No messages yet. Say hello!</div>
              )}
              {messages.map((m) => <Message key={m._id} msg={m} myId={myId} />)}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 10, alignItems: "flex-end" }}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKey}
                placeholder={`Message ${activeRoom.label}…`}
                rows={1}
                style={{
                  flex: 1, resize: "none", border: "1px solid #e2e8f0", borderRadius: 12,
                  padding: "10px 14px", fontSize: 13, fontFamily: "inherit", color: "#1e293b",
                  outline: "none", background: "#f8fafc", lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
                }}
              />
              <button onClick={sendMsg} disabled={!draft.trim() || sending}
                style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 12, padding: "10px 14px", cursor: "pointer", opacity: (!draft.trim() || sending) ? 0.5 : 1, display: "flex", alignItems: "center" }}>
                <Send size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* DM Search overlay */}
      {showDmSearch && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>New Direct Message</div>
              <button onClick={() => setShowDmSearch(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}><X size={18} /></button>
            </div>
            <div style={{ position: "relative", marginBottom: 12 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search by name or email…"
                style={{ width: "100%", padding: "9px 12px 9px 32px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              {filteredUsers.map((u) => (
                <button key={u._id} onClick={() => openDm(u)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, border: "none", background: "#f8fafc", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                  <Avatar name={u.name} size={32} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{u.role}</div>
                  </div>
                </button>
              ))}
              {filteredUsers.length === 0 && <div style={{ color: "#94a3b8", textAlign: "center", padding: 20, fontSize: 13 }}>No users found</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
