import React from "react";

// Renders a tenant's uploaded logo, or a generic initials placeholder when
// none is set — deliberately never falls back to the platform's own logo
// file, since showing that inside a tenant's panel is exactly the bug this
// component exists to avoid.
export default function TenantLogo({ logoUrl, name, primaryColor, size = 34, style }) {
  if (logoUrl) {
    return <img src={logoUrl} alt={name || "Organization logo"} style={{ height: size, width: "auto", maxWidth: size * 3, objectFit: "contain", display: "block", ...style }} />;
  }

  const initials = (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
  const accent = primaryColor || "#f7931e";

  return (
    <div
      style={{
        height: size, width: size, borderRadius: size / 4, flexShrink: 0,
        background: accent,
        display: "grid", placeItems: "center",
        color: "#fff", fontWeight: 700, fontSize: size * 0.4,
        fontFamily: "'Syne', 'Bebas Neue', sans-serif",
        ...style,
      }}
    >
      {initials}
    </div>
  );
}
