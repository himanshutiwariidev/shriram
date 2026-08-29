import React from "react";
import { HelpCircle, LogOut, User } from "lucide-react";
import Dropdown from "./Dropdown";
import TenantLogo from "./TenantLogo";
import useTenantTheme from "../hooks/useTenantTheme";
import { resolveFileUrl } from "../utils/fileUrl";

const MenuItem = ({ icon: Icon, label, onClick, T, danger }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 16px",
      background: "none", border: "none", cursor: "pointer", textAlign: "left",
      fontSize: 13, fontWeight: 500, color: danger ? T.red : T.textSecondary, fontFamily: "inherit",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = danger ? T.redBg : T.brandLight; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
  >
    <Icon size={15} strokeWidth={1.8} />
    {label}
  </button>
);

// Deliberately just 3 actions — Profile, Help, Logout. Organization and
// Subscription used to be separate menu links here, but that data now
// lives inside the Profile page itself (MyProfileSection's Organization/
// Subscription tabs), so this stays a lean identity + navigation menu
// rather than duplicating org/plan stats that belong on the full page.
export default function ProfileDropdown({ user, roleLabel, subscription, onNavigate, onLogout }) {
  const { T } = useTenantTheme();
  const owner = subscription?.owner;
  const avatarUrl = user?.profileImage
    ? resolveFileUrl(user.profileImage)
    : owner?.profileImage
      ? resolveFileUrl(owner.profileImage)
      : null;

  return (
    <Dropdown
      panelStyle={{ width: 240 }}
      trigger={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${T.brand}, ${T.brandMid})`, display: "grid", placeItems: "center", boxShadow: `0 2px 10px ${T.brand}4d`, overflow: "hidden" }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={user?.name || owner?.name || "Profile"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : user?.name ? (
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{user.name.trim().charAt(0).toUpperCase()}</span>
            ) : (
              <User size={15} color="#fff" strokeWidth={2} />
            )}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, lineHeight: 1 }}>{user?.name || "—"}</div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{roleLabel}</div>
          </div>
        </div>
      }
    >
      {({ close }) => (
        <div style={{ padding: "8px 0" }}>
          <MenuItem T={T} icon={User} label="Profile" onClick={() => { onNavigate("myProfile"); close(); }} />
          <MenuItem T={T} icon={HelpCircle} label="Help" onClick={() => { window.location.href = "mailto:support@bharatbizmart.com"; close(); }} />
          <div style={{ borderTop: `1px solid ${T.borderLight}`, margin: "6px 0" }} />
          <MenuItem T={T} icon={LogOut} label="Logout" danger onClick={() => { close(); onLogout(); }} />
        </div>
      )}
    </Dropdown>
  );
}
