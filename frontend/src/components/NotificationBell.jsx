import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Bell, Calendar, CreditCard, Building2, UserPlus, ClipboardList,
  CalendarDays, Clock, Megaphone, CheckCheck,
} from "lucide-react";
import Dropdown from "./Dropdown";
import useNotifications from "../hooks/useNotifications";
import useTenantTheme from "../hooks/useTenantTheme";
import { useAuth } from "../context/AuthContext";

const TYPE_META = {
  meeting: { Icon: Calendar, color: "#2563eb" },
  subscription_expiry: { Icon: CreditCard, color: "#d97706" },
  org_update: { Icon: Building2, color: "#7c3aed" },
  new_user: { Icon: UserPlus, color: "#16a34a" },
  task: { Icon: ClipboardList, color: "#0891b2" },
  leave: { Icon: CalendarDays, color: "#d97706" },
  attendance: { Icon: Clock, color: "#64748b" },
  announcement: { Icon: Megaphone, color: "#dc2626" },
};

const FILTERS = [
  { key: "", label: "All" },
  { key: "meeting", label: "Meetings" },
  { key: "task", label: "Tasks" },
  { key: "leave", label: "Leave" },
  { key: "subscription_expiry", label: "Billing" },
];

// Role → canonical app root, so notification links never land on the wrong ProtectedRoute.
const ROLE_BASE = { admin: "/admin", tenant_admin: "/admin", hr: "/hr", sales: "/sales", user: "/dashboard", client: "/client/dashboard" };

export default function NotificationBell() {
  const { T } = useTenantTheme();
  const { role: userRole } = useAuth();
  const { unreadCount, notifications, loading, markAsRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState("");
  const navigate = useNavigate();

  const filtered = filter ? notifications.filter((n) => n.type === filter) : notifications;

  const resolveLink = (link) => {
    if (!link) return null;
    // Rewrite stale /dashboard links and /admin links to the user's actual base path.
    // Old notifications stored in DB may point to the wrong route.
    const base = ROLE_BASE[userRole];
    if (!base) return link;
    return link.replace(/^\/(dashboard|admin|hr|sales)/, base);
  };

  const handleClick = (n, close) => {
    if (!n.isRead) markAsRead(n._id);
    const link = resolveLink(n.link);
    if (link) navigate(link);
    close();
  };

  return (
    <Dropdown
      panelStyle={{ width: 380, maxHeight: 480, display: "flex", flexDirection: "column", overflow: "hidden" }}
      trigger={
        <div style={{ position: "relative", width: 38, height: 38, borderRadius: "50%", display: "grid", placeItems: "center", background: T.inputBg, border: `1px solid ${T.inputBorder}` }}>
          <Bell size={16} strokeWidth={1.8} color={T.textSecondary} />
          {unreadCount > 0 && (
            <span style={{ position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, background: T.red, color: "#fff", fontSize: 9.5, fontWeight: 700, display: "grid", placeItems: "center", padding: "0 3px", border: "2px solid #fff" }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      }
    >
      {({ close }) => (
        <>
          <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${T.borderLight}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: T.textPrimary }}>Notifications</div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 600, color: T.brand, padding: 0 }}>
                <CheckCheck size={12} strokeWidth={2} /> Mark all read
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 6, padding: "18px 18px", overflowX: "auto", borderBottom: `1px solid ${T.borderLight}` }}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center",
                  padding: "11px 14px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                  border: `1.5px solid ${filter === f.key ? T.brand : T.inputBorder}`,
                  background: filter === f.key ? T.brandLight : "transparent",
                  color: filter === f.key ? T.brand : T.textSecondary,
                  whiteSpace: "nowrap", lineHeight: 1, outline: "none", boxSizing: "border-box",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {loading && notifications.length === 0 ? (
              <p style={{ padding: 20, fontSize: 12.5, color: T.textMuted, textAlign: "center" }}>Loading…</p>
            ) : filtered.length === 0 ? (
              <p style={{ padding: 20, fontSize: 12.5, color: T.textMuted, textAlign: "center" }}>No notifications</p>
            ) : (
              filtered.map((n) => {
                const meta = TYPE_META[n.type] || TYPE_META.announcement;
                const Icon = meta.Icon;
                return (
                  <div
                    key={n._id}
                    onClick={() => handleClick(n, close)}
                    style={{
                      display: "flex", gap: 12, padding: "12px 18px", cursor: "pointer",
                      background: n.isRead ? "transparent" : T.brandLight + "55",
                      borderBottom: `1px solid ${T.borderLight}`,
                    }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center", background: `${meta.color}1a` }}>
                      <Icon size={14} strokeWidth={2} color={meta.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                      <div style={{ fontSize: 12.5, fontWeight: n.isRead ? 500 : 700, color: T.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</div>
                      <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{n.message}</div>
                      <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 4 }}>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</div>
                    </div>
                    {!n.isRead && <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.brand, flexShrink: 0, marginTop: 5 }} />}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </Dropdown>
  );
}
