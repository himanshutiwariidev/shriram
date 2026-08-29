import { useEffect } from "react";
import useTenantBranding from "./useTenantBranding";
import { T as staticT } from "../pages/sections/shared";
import { buildBrandTints } from "../utils/colorTheme";

const CSS_VARS = ["--tenant-brand", "--tenant-brand-light", "--tenant-brand-mid", "--tenant-brand-dark", "--tenant-secondary", "--tenant-accent"];

// Drop-in dynamic replacement for `import { T } from "./shared"` on
// tenant-facing pages: same key shape as the static platform T, but
// brand/brandLight/brandMid are derived from the tenant's own saved
// primaryColor instead of the hardcoded platform orange. Also sets CSS
// custom properties on the document root (cleaned up on unmount, same
// pattern as useTenantBranding's favicon/title side effect) so plain
// hardcoded-hex spots that aren't wired through T can use var(--tenant-brand)
// instead. Never imported by Super Admin-only pages — those keep the
// static `shared.T` so tenant colors can't leak into the platform's own
// panel.
export default function useTenantTheme() {
  const branding = useTenantBranding();
  const primary = branding.primaryColor || staticT.brand;
  const tints = buildBrandTints(primary);

  useEffect(() => {
    if (branding.loading) return undefined;
    const root = document.documentElement;
    root.style.setProperty("--tenant-brand", tints.brand);
    root.style.setProperty("--tenant-brand-light", tints.brandLight);
    root.style.setProperty("--tenant-brand-mid", tints.brandMid);
    root.style.setProperty("--tenant-brand-dark", tints.brandDark);
    root.style.setProperty("--tenant-secondary", branding.secondaryColor || tints.brandDark);
    root.style.setProperty("--tenant-accent", branding.accentColor || tints.brand);

    return () => {
      CSS_VARS.forEach((name) => root.style.removeProperty(name));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branding.loading, tints.brand, tints.brandLight, tints.brandMid, tints.brandDark, branding.secondaryColor, branding.accentColor]);

  const T = {
    ...staticT,
    brand: tints.brand,
    brandLight: tints.brandLight,
    brandMid: tints.brandMid,
    brandDark: tints.brandDark,
  };

  return { T, loading: branding.loading, branding };
}
