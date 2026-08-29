import React, { createContext, useContext, useEffect, useState } from "react";
import API from "../services/api";
import { resolveFileUrl } from "../utils/fileUrl";

const TenantBrandingContext = createContext(null);
const BRANDING_REFRESH_MS = 60000;

// The actual fetch + favicon/title side effect (moved here from
// useTenantBranding.js unchanged) — `skip` lets a standalone caller (no
// Provider ancestor) still work correctly while a Provider-wrapped caller
// no-ops this and reads the shared context value instead. This is what
// collapses what used to be one GET /tenant/branding per component instance
// (dozens per dashboard mount once useTenantTheme() was rolled out broadly —
// enough to trip the API rate limiter) down to exactly one per dashboard.
function useBrandingFetch(skip) {
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(!skip);

  useEffect(() => {
    if (skip) return undefined;
    let cancelled = false;

    const fetchBranding = () => {
      API.get("/tenant/branding")
        .then(({ data }) => { if (!cancelled) setBranding(data); })
        .catch(() => { if (!cancelled) setBranding(null); })
        .finally(() => { if (!cancelled) setLoading(false); });
    };

    fetchBranding();
    const interval = setInterval(fetchBranding, BRANDING_REFRESH_MS);

    return () => { cancelled = true; clearInterval(interval); };
  }, [skip]);

  useEffect(() => {
    if (skip || !branding) return undefined;

    const originalTitle = document.title;
    const faviconLink = document.querySelector('link[rel="icon"]');
    const originalFavicon = faviconLink?.getAttribute("href");

    if (branding.name) {
      document.title = branding.name;
    }
    if (branding.faviconUrl && faviconLink) {
      faviconLink.setAttribute("href", resolveFileUrl(branding.faviconUrl));
    }

    return () => {
      document.title = originalTitle;
      if (originalFavicon && faviconLink) {
        faviconLink.setAttribute("href", originalFavicon);
      }
    };
  }, [skip, branding]);

  return {
    loading,
    name: branding?.name || null,
    logoUrl: branding?.logoUrl ? resolveFileUrl(branding.logoUrl) : null,
    primaryColor: branding?.primaryColor || null,
    secondaryColor: branding?.secondaryColor || null,
    accentColor: branding?.accentColor || null,
    footerText: branding?.footerText || null,
  };
}

// Wrap once near the root of each tenant-facing dashboard (AdminDashboard,
// UserDashboard, SalesDashboard, ClientDashboard). Every descendant calling
// useTenantBranding()/useTenantTheme() — however many, including sibling
// sub-components within the same section file — shares this single fetch.
export function TenantBrandingProvider({ children }) {
  const branding = useBrandingFetch(false);
  return <TenantBrandingContext.Provider value={branding}>{children}</TenantBrandingContext.Provider>;
}

// Used by useTenantBranding.js — returns the shared value when rendered
// under a Provider, or null when not (caller falls back to its own fetch).
export function useTenantBrandingContext() {
  return useContext(TenantBrandingContext);
}

export { useBrandingFetch };
