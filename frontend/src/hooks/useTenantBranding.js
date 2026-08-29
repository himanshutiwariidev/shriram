import { useTenantBrandingContext, useBrandingFetch } from "../context/TenantBrandingContext";

// Reads the tenant's branding — shared via TenantBrandingProvider when one
// wraps the tree (the common case: one Provider per dashboard root, so N
// components calling this hook cost exactly one GET /tenant/branding, not
// N). Falls back to its own independent fetch if no Provider is present,
// so this hook still works correctly standalone; it just won't dedupe.
export default function useTenantBranding() {
  const ctx = useTenantBrandingContext();
  const standalone = useBrandingFetch(ctx !== null);
  return ctx || standalone;
}
