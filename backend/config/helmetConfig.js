// Helmet security header configuration.
// CSP is disabled because the React frontend uses Google Fonts CDN, inline
// Vite-injected styles, and SVG-based charts — enabling a strict CSP would
// require a large allow-list that still risks breaking the UI.  All other
// protective headers are enabled.
const helmetConfig = {
  // Disabled — requires large frontend allow-list
  contentSecurityPolicy: false,

  // Required for COEP (disabled alongside CSP to avoid blocking sub-resources)
  crossOriginEmbedderPolicy: false,

  // Uploaded tenant logos, favicons, profile photos, and attachments are
  // served by the API origin and embedded by the Vite/frontend origin
  // during local development, and may also be cross-origin in production.
  // Helmet's default "same-origin" resource policy blocks those <img> loads.
  crossOriginResourcePolicy: { policy: "cross-origin" },

  // Prevent browsers from pre-resolving DNS to reduce information leakage
  dnsPrefetchControl: { allow: false },

  // Prevent page from being loaded in an <iframe> — clickjacking protection
  frameguard: { action: "deny" },

  // Force HTTPS for 1 year; subdomains included; eligible for preload lists
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },

  // Prevent MIME-type sniffing attacks
  noSniff: true,

  // Strict referrer to avoid leaking paths to third parties
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },

  // Remove X-Powered-By: Express header (also done via app.disable below)
  hidePoweredBy: true,

  // Block Flash / PDF from reading responses cross-origin
  permittedCrossDomainPolicies: false,
};

module.exports = helmetConfig;
