// Plain HSL lightness-shift color math — no dependency needed. Used to
// derive a tenant's light/mid/dark brand tints from the single primaryColor
// a Super Admin picks, the same way most dynamic-theme SaaS products avoid
// asking for 4-5 separate shade pickers.
export function hexToHsl(hex) {
  const clean = (hex || "#f7931e").replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToHex(h, s, l) {
  const sat = Math.min(100, Math.max(0, s)) / 100;
  const lig = Math.min(100, Math.max(0, l)) / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lig - c / 2;
  let [r, g, b] = [0, 0, 0];

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Given just a primary hex (and optionally secondary/accent), derive the
// light/mid/dark tint family a "brand" color family needs — mirrors the
// static shared.jsx palette's shape (brand/brandLight/brandMid) so it's a
// drop-in replacement wherever those keys are used.
export function buildBrandTints(primaryHex) {
  const { h, s } = hexToHsl(primaryHex);
  return {
    brand: primaryHex,
    brandLight: hslToHex(h, Math.max(s - 10, 15), 94),
    brandMid: hslToHex(h, s, 80),
    brandDark: hslToHex(h, s, Math.max(hexToHsl(primaryHex).l - 15, 10)),
  };
}
