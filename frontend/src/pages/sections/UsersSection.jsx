import React, { useMemo, useState } from "react";
import {
  Pencil, Shield, Trash2, UserPlus, Users, Search, Filter,
  ChevronDown, ChevronLeft, ChevronRight, Phone, Mail, MapPin,
  Calendar, Droplets, GraduationCap, Briefcase, FileText, CreditCard,
  UserCheck, Download,
} from "lucide-react";
import { IconBtn } from "./shared";
import useTenantTheme from "../../hooks/useTenantTheme";

const ROLE_ACCENT = {
  admin:  { color: "var(--tenant-brand)", bg: "var(--tenant-brand-light)", border: "var(--tenant-brand-mid)" },
  hr:     { color: "#0d9488", bg: "#ccfbf1", border: "#99f6e4" },
  sales:  { color: "#16a34a", bg: "#dcfce7", border: "#bbf7d0" },
  user:   { color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  client: { color: "#db2777", bg: "#fce7f3", border: "#fbcfe8" },
};

const ROLE_OPTIONS = [
  { value: "all", label: "All Roles" },
  { value: "hr", label: "HR" },
  { value: "sales", label: "Sales" },
  { value: "user", label: "User" },
  { value: "client", label: "Client" },
];

const PAGE_SIZE = 9;

const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null);
const fmtJoined = (d) => fmt(d) || "—";
const backendBase = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:4050";

// ── small info row ─────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, mono }) {
  const { T } = useTenantTheme();
  if (!value) return null;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 5 }}>
      <Icon size={12} strokeWidth={2} color={T.textMuted} style={{ marginTop: 1, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {label && <span style={{ fontSize: 9.5, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}: </span>}
        <span style={{ fontSize: 12, color: T.textPrimary, fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-word" }}>{value}</span>
      </div>
    </div>
  );
}

// ── Employee ID Card ──────────────────────────────────────────────────────

function EmployeeCard({ user, openEditUser, setDeleteUser, i }) {
  const { T } = useTenantTheme();
  const [expanded, setExpanded] = useState(false);
  const accent = ROLE_ACCENT[user.role] || ROLE_ACCENT.user;
  const initials = user.name ? user.name.trim().split(/\s+/).map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "??";
  const photoSrc = user.profileImage ? `${backendBase}${user.profileImage}` : null;

  return (
    <div
      className="card-in"
      style={{
        background: "#fff", borderRadius: 16, overflow: "hidden",
        border: `1.5px solid ${T.border}`, boxShadow: "0 2px 12px rgba(0,0,0,.06)",
        animationDelay: `${i * 35}ms`, display: "flex", flexDirection: "column",
      }}
    >
      {/* ── Card top bar ── */}
      <div style={{
        background: `linear-gradient(135deg, ${accent.color}22, ${accent.color}0a)`,
        borderBottom: `1.5px solid ${accent.border}`,
        padding: "12px 14px 10px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: accent.color, textTransform: "uppercase", letterSpacing: ".12em" }}>
          {user.role?.toUpperCase()} ID CARD
        </span>
        {user.employeeId && (
          <span style={{ fontSize: 10, fontWeight: 700, color: accent.color, background: "#fff", padding: "2px 8px", borderRadius: 99, border: `1px solid ${accent.border}` }}>
            {user.employeeId}
          </span>
        )}
      </div>

      {/* ── Photo + Name ── */}
      <div style={{ padding: "16px 16px 12px", display: "flex", gap: 13, alignItems: "flex-start" }}>
        <div style={{
          width: 64, height: 64, borderRadius: 12, flexShrink: 0, overflow: "hidden",
          border: `2px solid ${accent.border}`, background: accent.bg,
          display: "grid", placeItems: "center",
        }}>
          {photoSrc ? (
            <img src={photoSrc} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: accent.color }}>{initials}</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14.5, color: T.textPrimary, lineHeight: 1.2 }}>{user.name}</div>
          {user.designation && <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>{user.designation}</div>}
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>{user.email}</div>
          {user.phone && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: T.textMuted, marginTop: 2 }}>
              <Phone size={10} strokeWidth={2} /> {user.phone}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <IconBtn icon={Pencil} color={T.brand} bg={T.brandLight} hoverBg={T.brandMid} onClick={() => openEditUser(user)} title="Edit" />
          <IconBtn icon={Trash2} color={T.red} bg={T.redBg} hoverBg={T.redBorder} onClick={() => setDeleteUser(user)} title="Delete" />
        </div>
      </div>

      {/* ── Tags row ── */}
      <div style={{ padding: "0 16px 10px", display: "flex", gap: 6, flexWrap: "wrap" }}>
        {user.gender && (
          <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#f0f4ff", color: "#3730a3", border: "1px solid #c7d2fe" }}>
            {user.gender}
          </span>
        )}
        {user.bloodGroup && (
          <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3" }}>
            {user.bloodGroup}
          </span>
        )}
        {user.dob && (
          <span style={{ fontSize: 9.5, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: T.inputBg, color: T.textMuted, border: `1px solid ${T.inputBorder}` }}>
            DOB: {fmt(user.dob)}
          </span>
        )}
      </div>

      {/* ── Quick info ── */}
      <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.borderLight}` }}>
        <InfoRow icon={Calendar} label="Joined" value={user.joiningDate ? fmt(user.joiningDate) : fmtJoined(user.createdAt)} />
        {user.qualification && <InfoRow icon={GraduationCap} label="Qualification" value={user.qualification} />}
        {user.experience && <InfoRow icon={Briefcase} label="Experience" value={user.experience} />}
        {user.address && <InfoRow icon={MapPin} label="Address" value={user.address} />}
      </div>

      {/* ── Expandable identity ── */}
      {(user.aadhaar || user.pan || user.emergencyContact || user.resume || user.relievingDate) && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            style={{ background: "none", border: "none", borderTop: `1px solid ${T.borderLight}`, padding: "8px 16px", cursor: "pointer", fontSize: 11, color: T.brand, fontWeight: 600, fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 5 }}
          >
            <ChevronDown size={12} strokeWidth={2.5} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
            {expanded ? "Hide details" : "More details"}
          </button>
          {expanded && (
            <div style={{ padding: "10px 16px 14px", borderTop: `1px solid ${T.borderLight}` }}>
              {user.emergencyContact && <InfoRow icon={Phone} label="Emergency" value={user.emergencyContact} />}
              {user.aadhaar && <InfoRow icon={CreditCard} label="Aadhaar" value={user.aadhaar} mono />}
              {user.pan && <InfoRow icon={CreditCard} label="PAN" value={user.pan} mono />}
              {user.relievingDate && <InfoRow icon={Calendar} label="Relieving" value={fmt(user.relievingDate)} />}
              {user.resume && (
                <a
                  href={`${backendBase}${user.resume}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 11.5, color: T.brand, fontWeight: 600, textDecoration: "none", background: T.brandLight, padding: "5px 10px", borderRadius: 7, border: `1px solid ${T.brandMid}` }}
                >
                  <FileText size={12} strokeWidth={2} /> View Resume
                  <Download size={11} strokeWidth={2} />
                </a>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Client User Card ──────────────────────────────────────────────────────

function ClientCard({ user, client, openEditUser, setDeleteUser, i }) {
  const { T } = useTenantTheme();
  const accent = ROLE_ACCENT.client;
  const initials = user.name ? user.name.trim().split(/\s+/).map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "??";

  return (
    <div
      className="card-in"
      style={{
        background: "#fff", borderRadius: 16, overflow: "hidden",
        border: `1.5px solid ${T.border}`, boxShadow: "0 2px 12px rgba(0,0,0,.06)",
        animationDelay: `${i * 35}ms`, display: "flex", flexDirection: "column",
      }}
    >
      {/* ── Top bar ── */}
      <div style={{
        background: `linear-gradient(135deg, ${accent.color}22, ${accent.color}0a)`,
        borderBottom: `1.5px solid ${accent.border}`,
        padding: "12px 14px 10px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: accent.color, textTransform: "uppercase", letterSpacing: ".12em" }}>CLIENT PORTAL</span>
        {client?.status && (
          <span style={{
            fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 99, border: `1px solid ${accent.border}`,
            background: client.status === "active" ? "#dcfce7" : "#fef2f2",
            color: client.status === "active" ? "#16a34a" : "#dc2626",
          }}>
            {client.status?.toUpperCase()}
          </span>
        )}
      </div>

      {/* ── Avatar + Name ── */}
      <div style={{ padding: "16px 16px 12px", display: "flex", gap: 13, alignItems: "flex-start" }}>
        <div style={{
          width: 64, height: 64, borderRadius: 12, flexShrink: 0, overflow: "hidden",
          border: `2px solid ${accent.border}`, background: accent.bg,
          display: "grid", placeItems: "center",
        }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: accent.color }}>{initials}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14.5, color: T.textPrimary, lineHeight: 1.2 }}>{user.name}</div>
          {(client?.businessName || client?.company) && (
            <div style={{ fontSize: 12, color: T.brand, fontWeight: 600, marginTop: 2 }}>{client?.businessName || client?.company}</div>
          )}
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{user.email}</div>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <IconBtn icon={Pencil} color={T.brand} bg={T.brandLight} hoverBg={T.brandMid} onClick={() => openEditUser(user)} title="Edit" />
          <IconBtn icon={Trash2} color={T.red} bg={T.redBg} hoverBg={T.redBorder} onClick={() => setDeleteUser(user)} title="Delete" />
        </div>
      </div>

      {/* ── Client details ── */}
      {client ? (
        <div style={{ padding: "10px 16px 14px", borderTop: `1px solid ${T.borderLight}`, display: "flex", flexDirection: "column", gap: 1 }}>
          {client.phone && <InfoRow icon={Phone} label="Phone" value={client.phone} />}
          {client.businessType && <InfoRow icon={Briefcase} label="Business Type" value={client.businessType} />}
          {client.address && <InfoRow icon={MapPin} label="Address" value={client.address} />}
          {client.gstNumber && <InfoRow icon={CreditCard} label="GST" value={client.gstNumber} mono />}
          <InfoRow icon={Calendar} label="Client since" value={fmtJoined(client.createdAt)} />
        </div>
      ) : (
        <div style={{ padding: "10px 16px 14px", borderTop: `1px solid ${T.borderLight}`, fontSize: 12, color: T.textMuted }}>
          No client profile linked
        </div>
      )}
    </div>
  );
}

// ── Filter dropdown ───────────────────────────────────────────────────────

function FilterDropdown({ icon: Icon, value, onChange, options }) {
  const { T } = useTenantTheme();
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <Icon size={14} strokeWidth={2} color={T.textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
      <select
        className="inp"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ appearance: "none", cursor: "pointer", padding: "10px 32px 10px 34px", background: "#fff", border: `1.5px solid ${T.inputBorder}`, borderRadius: 10, color: T.textPrimary, fontSize: 13, fontWeight: 500, outline: "none", fontFamily: "inherit" }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} strokeWidth={2} color={T.textMuted} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────

export default function UsersSection({ users, tasks, clients = [], setTab, openEditUser, setDeleteUser }) {
  const { T } = useTenantTheme();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);

  const resetAnd = (setter) => (val) => { setter(val); setPage(1); };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (u.role === "admin" || u.role === "tenant_admin") return false;
      if (q && !(u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      return true;
    });
  }, [users, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageUsers = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(filtered.length, safePage * PAGE_SIZE);

  // Pre-index clients by _id for O(1) lookup
  const clientMap = useMemo(() => {
    const map = {};
    (clients || []).forEach((c) => { map[String(c._id)] = c; });
    return map;
  }, [clients]);

  return (
    <div className="fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 14 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>All Users</h2>
          <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>{users.length} registered member{users.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="pri-btn" onClick={() => setTab("createUser")} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: `linear-gradient(135deg, ${T.brand}, ${T.brandDark})`, color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}>
          <UserPlus size={15} strokeWidth={2} /> New User
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 260px" }}>
          <Search size={15} strokeWidth={2} color={T.textMuted} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            className="inp"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => resetAnd(setSearch)(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px 10px 38px", background: T.inputBg, border: `1.5px solid ${T.inputBorder}`, borderRadius: 10, color: T.textPrimary, fontSize: 13.5, outline: "none", fontFamily: "inherit" }}
          />
        </div>
        <FilterDropdown icon={Filter} value={roleFilter} onChange={resetAnd(setRoleFilter)} options={ROLE_OPTIONS} />
      </div>

      {/* ── Cards ── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <Users size={48} strokeWidth={1} color={T.textMuted} style={{ margin: "0 auto 16px", display: "block" }} />
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, color: T.textSecondary }}>No users match your filters</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {pageUsers.map((user, i) => {
            if (user.role === "client") {
              const client = user.clientId ? clientMap[String(user.clientId?._id || user.clientId)] : null;
              return <ClientCard key={user._id} user={user} client={client} openEditUser={openEditUser} setDeleteUser={setDeleteUser} i={i} />;
            }
            return <EmployeeCard key={user._id} user={user} openEditUser={openEditUser} setDeleteUser={setDeleteUser} i={i} />;
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {filtered.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24, flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 12.5, color: T.textMuted }}>
            Showing <strong style={{ color: T.textSecondary }}>{rangeStart}</strong>–<strong style={{ color: T.textSecondary }}>{rangeEnd}</strong> of <strong style={{ color: T.textSecondary }}>{filtered.length}</strong>
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} style={{ width: 34, height: 34, borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: "#fff", color: safePage === 1 ? T.borderLight : T.textSecondary, cursor: safePage === 1 ? "not-allowed" : "pointer", display: "grid", placeItems: "center" }}>
              <ChevronLeft size={15} strokeWidth={2} />
            </button>
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)} style={{ width: 34, height: 34, borderRadius: 9, cursor: "pointer", background: p === safePage ? `linear-gradient(135deg, ${T.brand}, ${T.brandDark})` : "#fff", color: p === safePage ? "#fff" : T.textSecondary, fontWeight: 700, fontSize: 13, fontFamily: "'Syne', sans-serif", border: p === safePage ? "none" : `1.5px solid ${T.inputBorder}` }}>
                {p}
              </button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} style={{ width: 34, height: 34, borderRadius: 9, border: `1.5px solid ${T.inputBorder}`, background: "#fff", color: safePage === totalPages ? T.borderLight : T.textSecondary, cursor: safePage === totalPages ? "not-allowed" : "pointer", display: "grid", placeItems: "center" }}>
              <ChevronRight size={15} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
