// Single source of truth for the Proposal Services Builder. Every one of the
// 13 top-level services is expressed as a tree of plain data nodes — the
// renderer (NestedServiceRenderer.jsx) walks this tree generically, so
// adding a 14th service or a new field to an existing one is an edit here,
// never a change to renderer/component logic.
//
// Node shape:
//   {
//     key, label, icon?,
//     type: "group" | "optionLeaf",
//     fields?: [ fieldDescriptor ],      // rendered on this node directly
//     gate?: { key, label, type: "radio"|"select"|"multiselect", options, required },
//     gateMode?: "reveal" | "filter",    // "reveal": show all children once gate answered
//                                        // "filter": show only the child whose label matches the gate value
//     children?: [ node ],
//   }
//
// A node may have `fields`, `gate`, and `children` at the same time — the
// renderer handles all three unconditionally, so no node is special-cased.
//
// `type: "optionLeaf"` is a rendering hint only (compact single-row card,
// and the renderer automatically prepends an implicit Enable checkbox — do
// NOT declare an "enabled" field in an optionLeaf's `fields`, the renderer
// owns that). `type: "group"` renders as a full nested card.
//
// fieldDescriptor: { key, label, type: "text"|"textarea"|"number"|"toggle"|
//   "select"|"multiselect"|"radio"|"tags"|"date", options?, default? }

const slug = (label) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

// ── field factories ─────────────────────────────────────────────────────
const text = (key, label) => ({ key, label, type: "text" });
const textarea = (key, label) => ({ key, label, type: "textarea" });
const number = (key, label) => ({ key, label, type: "number" });
const toggle = (key, label) => ({ key, label, type: "toggle", default: false });
const select = (key, label, options) => ({ key, label, type: "select", options });
const multiselect = (key, label, options) => ({ key, label, type: "multiselect", options });
const radio = (key, label, options) => ({ key, label, type: "radio", options });
const tags = (key, label) => ({ key, label, type: "tags" });
const date = (key, label) => ({ key, label, type: "date" });
const remarks = () => textarea("remarks", "Remarks");

// ═══════════════════════════════════════════════════════════════════════
// 1. SOCIAL MEDIA
// ═══════════════════════════════════════════════════════════════════════

const SOCIAL_STANDARD_OPTIONS = [
  "Graphic Creatives", "AI Creatives", "AI Reels", "Templated Reels", "Shooted Reels",
  "After Effects Videos", "Blogs", "Long Videos (2 Minutes)", "GIF", "Stories", "Go Live",
];

const socialOptionLeaf = (label) => ({
  key: slug(label),
  label,
  type: "optionLeaf",
  fields: [
    number("quantityPerMonth", "Quantity Per Month"),
    select("priority", "Priority", ["Low", "Medium", "High"]),
    remarks(),
  ],
});

const socialPlatform = (key, label) => ({
  key,
  label,
  type: "group",
  children: SOCIAL_STANDARD_OPTIONS.map(socialOptionLeaf),
});

const YOUTUBE_OPTIONS = [
  "Shorts", "Upload Existing Reels as Shorts", "Shooted Reels", "Shooted Long Videos", "AI Shorts", "AI Videos",
];

const youtubeOptionLeaf = (label) => ({
  key: slug(label),
  label,
  type: "optionLeaf",
  fields: [number("quantityPerMonth", "Quantity Per Month"), remarks()],
});

export const socialMediaService = {
  key: "socialMedia",
  label: "Social Media",
  icon: "Share2",
  type: "group",
  children: [
    socialPlatform("facebook", "Facebook"),
    socialPlatform("instagram", "Instagram"),
    socialPlatform("linkedin", "LinkedIn"),
    { key: "youtube", label: "YouTube", type: "group", children: YOUTUBE_OPTIONS.map(youtubeOptionLeaf) },
    socialPlatform("threads", "Threads"),
    socialPlatform("other", "Other"),
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// 2. RANKING OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════

const KEYWORD_TYPES = ["Long Tail Keywords", "Short Tail Keywords", "Luxury Keywords"];

const keywordTypeLeaf = (label) => ({
  key: slug(label),
  label,
  type: "optionLeaf",
  fields: [
    number("numberOfKeywords", "Number of Keywords"),
    tags("keywordTags", "Keyword Tags"),
    text("targetUrl", "Target URL"),
    remarks(),
  ],
});

export const rankingOptimizationService = {
  key: "rankingOptimization",
  label: "Ranking Optimization",
  icon: "TrendingUp",
  type: "group",
  gate: { key: "scope", label: "Scope", type: "radio", options: ["Domestic", "International"], required: true },
  gateMode: "reveal",
  children: [
    { key: "seo", label: "SEO", type: "group", children: KEYWORD_TYPES.map(keywordTypeLeaf) },
    { key: "aeo", label: "AEO", type: "group", fields: [text("targetPages", "Target Pages"), tags("keywords", "Keywords"), remarks()] },
    { key: "geo", label: "GEO", type: "group", fields: [text("targetPages", "Target Pages"), tags("keywords", "Keywords"), remarks()] },
    {
      key: "localSeo", label: "Local SEO", type: "group",
      fields: [text("country", "Country"), text("state", "State"), text("city", "City"), tags("multipleCities", "Multiple Cities")],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// 3. SPONSORED ADS
// ═══════════════════════════════════════════════════════════════════════

const googleAdsFields = () => [
  number("monthlyBudget", "Monthly Budget"),
  text("campaignDuration", "Campaign Duration"),
  text("audience", "Audience"),
  text("location", "Location"),
  text("objective", "Objective"),
  remarks(),
];

const googleAdsOptionLeaf = (label) => ({ key: slug(label), label, type: "optionLeaf", fields: googleAdsFields() });

const googleAdsService = {
  key: "googleAds",
  label: "Google Ads",
  type: "group",
  children: [
    googleAdsOptionLeaf("Search Ads"),
    googleAdsOptionLeaf("Shopping Ads"),
    googleAdsOptionLeaf("Remarketing"),
    googleAdsOptionLeaf("Website Traffic"),
    googleAdsOptionLeaf("YouTube Banner Ads"),
    {
      key: "youtube_views", label: "YouTube Views", type: "group",
      children: [
        { key: "skippable", label: "Skippable", type: "optionLeaf", fields: googleAdsFields() },
        { key: "non_skippable", label: "Non Skippable", type: "optionLeaf", fields: googleAdsFields() },
      ],
    },
    googleAdsOptionLeaf("YouTube Subscribers"),
    googleAdsOptionLeaf("YouTube Traffic"),
    googleAdsOptionLeaf("App Downloads"),
    googleAdsOptionLeaf("Google Maps Ads"),
  ],
};

const META_ADS_OPTIONS = [
  "Page Likes", "Post Likes", "Followers", "Post Engagement", "Video/Reels Views", "Subscriptions",
  "Shopping Ads", "One Click Form Ads", "QA Form Ads", "WhatsApp Lead Ads", "Call Lead Ads", "Website Visit Ads",
];

const metaAdsOptionLeaf = (label) => ({
  key: slug(label),
  label,
  type: "optionLeaf",
  fields: [number("budget", "Budget"), text("duration", "Duration"), text("audience", "Audience"), text("objective", "Objective"), remarks()],
});

const metaAdsService = {
  key: "metaAds",
  label: "Meta Ads",
  type: "group",
  children: META_ADS_OPTIONS.map(metaAdsOptionLeaf),
};

const ottAdsService = {
  key: "ottAds",
  label: "OTT Ads",
  type: "group",
  fields: [
    text("platform", "Platform"),
    number("budget", "Budget"),
    text("duration", "Duration"),
    text("region", "Region"),
    text("language", "Language"),
    text("audience", "Audience"),
    text("videoDuration", "Video Duration"),
    remarks(),
  ],
};

export const sponsoredAdsService = {
  key: "sponsoredAds",
  label: "Sponsored Ads",
  icon: "Megaphone",
  type: "group",
  gate: { key: "channel", label: "Channel", type: "select", options: ["Google Ads", "Meta Ads", "OTT Ads"], required: true },
  gateMode: "filter",
  children: [googleAdsService, metaAdsService, ottAdsService],
};

// ═══════════════════════════════════════════════════════════════════════
// 4. GOOGLE MY BUSINESS
// ═══════════════════════════════════════════════════════════════════════

const GMB_OPTIONS = ["Monthly Posting", "Reviews", "Map Creation", "Optimization"];

const gmbOptionLeaf = (label) => ({
  key: slug(label),
  label,
  type: "optionLeaf",
  fields: [number("quantity", "Quantity"), text("duration", "Duration"), remarks()],
});

export const googleMyBusinessService = {
  key: "googleMyBusiness",
  label: "Google My Business",
  icon: "MapPin",
  type: "group",
  children: GMB_OPTIONS.map(gmbOptionLeaf),
};

// ═══════════════════════════════════════════════════════════════════════
// 5. WEBSITE DEVELOPMENT
// ═══════════════════════════════════════════════════════════════════════

export const websiteDevelopmentService = {
  key: "websiteDevelopment",
  label: "Website Development",
  icon: "Globe",
  type: "group",
  fields: [
    multiselect("platforms", "Platforms", ["Custom Code", "Shopify", "WordPress", "Wix"]),
    multiselect("developmentTypes", "Development Types", [
      "Landing Page", "5 Page Website", "10 Page Website", "Ecommerce Website", "Custom Web Application",
    ]),
    text("hosting", "Hosting"),
    text("domain", "Domain"),
    toggle("ssl", "SSL"),
    text("maintenance", "Maintenance"),
    text("timeline", "Timeline"),
    remarks(),
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// 6. MOBILE APP DEVELOPMENT
// ═══════════════════════════════════════════════════════════════════════

export const mobileAppDevelopmentService = {
  key: "mobileAppDevelopment",
  label: "Mobile App Development",
  icon: "Smartphone",
  type: "group",
  fields: [
    multiselect("platforms", "Platforms", ["Android", "iOS", "Hybrid"]),
    multiselect("applicationTypes", "Application Types", [
      "Ecommerce", "CRM", "Healthcare", "Booking", "Education", "Finance", "Custom",
    ]),
    number("screens", "Screens"),
    toggle("apiIntegration", "API Integration"),
    toggle("adminPanel", "Admin Panel"),
    text("timeline", "Timeline"),
    remarks(),
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// 7. TELECAST
// ═══════════════════════════════════════════════════════════════════════

export const telecastService = {
  key: "telecast",
  label: "Telecast",
  icon: "Tv",
  type: "group",
  fields: [
    text("channelName", "Telecast Channel Name"),
    select("advertisementType", "Advertisement Type", ["Video Ad", "L Band"]),
    text("duration", "Duration"),
    text("rodp", "RODP"),
    toggle("primeTime", "Prime Time"),
    text("location", "Location"),
    text("campaignDates", "Campaign Dates"),
    remarks(),
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// 8. BROADCAST
// ═══════════════════════════════════════════════════════════════════════

export const broadcastService = {
  key: "broadcast",
  label: "Broadcast",
  icon: "Radio",
  type: "group",
  fields: [
    text("radioName", "Radio Name"),
    text("duration", "Duration"),
    text("rodp", "RODP"),
    toggle("primeTime", "Prime Time"),
    text("location", "Location"),
    text("campaignDates", "Campaign Dates"),
    remarks(),
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// 9. AI SERVICES
// ═══════════════════════════════════════════════════════════════════════

const AI_SERVICES_OPTIONS = [
  "AI Reels", "AI Short Film", "AI Film", "AI Product Demo",
  "AI Chatbot", "AI Robot Calling", "AI Framework", "Other AI Services",
];

const aiServiceOptionLeaf = (label) => ({
  key: slug(label),
  label,
  type: "optionLeaf",
  fields: [
    textarea("brief", "Brief"),
    text("duration", "Duration"),
    textarea("prompt", "Prompt"),
    text("platform", "Platform"),
    text("timeline", "Timeline"),
    remarks(),
  ],
});

export const aiServicesService = {
  key: "aiServices",
  label: "AI Services",
  icon: "Sparkles",
  type: "group",
  children: AI_SERVICES_OPTIONS.map(aiServiceOptionLeaf),
};

// ═══════════════════════════════════════════════════════════════════════
// 10. FILM PRODUCTION
// ═══════════════════════════════════════════════════════════════════════

const FILM_PRODUCTION_OPTIONS = ["TV Advertisement", "Corporate Film", "Music Album", "Short Film", "AI Advertisement"];

const filmProductionOptionLeaf = (label) => ({
  key: slug(label),
  label,
  type: "optionLeaf",
  fields: [
    textarea("brief", "Brief"),
    text("duration", "Duration"),
    toggle("script", "Script"),
    toggle("storyboard", "Storyboard"),
    toggle("voiceOver", "Voice Over"),
    text("actors", "Actors"),
    text("location", "Location"),
    toggle("editing", "Editing"),
    toggle("vfx", "VFX"),
    text("timeline", "Timeline"),
    number("budget", "Budget"),
    remarks(),
  ],
});

export const filmProductionService = {
  key: "filmProduction",
  label: "Film Production",
  icon: "Film",
  type: "group",
  children: FILM_PRODUCTION_OPTIONS.map(filmProductionOptionLeaf),
};

// ═══════════════════════════════════════════════════════════════════════
// 11. CELEBRITY ENROLLMENT/MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════

export const celebrityEnrollmentManagementService = {
  key: "celebrityEnrollmentManagement",
  label: "Celebrity Enrollment/Management",
  icon: "Star",
  type: "group",
  fields: [
    text("celebrityName", "Celebrity Name"),
    toggle("exclusive", "Exclusive"),
    toggle("nonExclusive", "Non Exclusive"),
    toggle("tvAdvertisement", "TV Advertisement"),
    toggle("selfFilm", "Self Film"),
    toggle("oldPhotos", "Old Photos"),
    toggle("newPhotos", "New Photos"),
    toggle("other", "Other"),
    toggle("agreement", "Agreement"),
    text("duration", "Duration"),
    number("cost", "Cost"),
    remarks(),
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// 12. INFLUENCER MARKETING
// ═══════════════════════════════════════════════════════════════════════

const INFLUENCER_MARKETING_OPTIONS = ["Collaboration Reel", "Tag Reel", "Visit Reel"];

const influencerMarketingOptionLeaf = (label) => ({
  key: slug(label),
  label,
  type: "optionLeaf",
  fields: [
    text("influencerName", "Influencer Name"),
    text("platform", "Platform"),
    number("followers", "Followers"),
    text("category", "Category"),
    textarea("deliverables", "Deliverables"),
    text("timeline", "Timeline"),
    number("cost", "Cost"),
    remarks(),
  ],
});

export const influencerMarketingService = {
  key: "influencerMarketing",
  label: "Influencer Marketing",
  icon: "Users",
  type: "group",
  children: INFLUENCER_MARKETING_OPTIONS.map(influencerMarketingOptionLeaf),
};

// ═══════════════════════════════════════════════════════════════════════
// 13. EVENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════

const EVENT_MANAGEMENT_OPTIONS = [
  "Corporate Event", "Product Launch", "Brand Activation", "Road Show", "Exhibition",
  "Seminar", "Conference", "Mall Activity", "Celebrity Event", "College Event", "Other",
];

const eventManagementOptionLeaf = (label) => ({
  key: slug(label),
  label,
  type: "optionLeaf",
  fields: [
    text("venue", "Venue"),
    text("location", "Location"),
    date("date", "Date"),
    toggle("branding", "Branding"),
    toggle("led", "LED"),
    toggle("photography", "Photography"),
    toggle("videography", "Videography"),
    text("artists", "Artists"),
    text("anchor", "Anchor"),
    number("guests", "Guests"),
    number("budget", "Budget"),
    text("timeline", "Timeline"),
    remarks(),
  ],
});

export const eventManagementService = {
  key: "eventManagement",
  label: "Event Management",
  icon: "CalendarDays",
  type: "group",
  children: EVENT_MANAGEMENT_OPTIONS.map(eventManagementOptionLeaf),
};

// ═══════════════════════════════════════════════════════════════════════
// Registry
// ═══════════════════════════════════════════════════════════════════════

export const SERVICES_CONFIG = [
  socialMediaService,
  rankingOptimizationService,
  sponsoredAdsService,
  googleMyBusinessService,
  websiteDevelopmentService,
  mobileAppDevelopmentService,
  telecastService,
  broadcastService,
  aiServicesService,
  filmProductionService,
  celebrityEnrollmentManagementService,
  influencerMarketingService,
  eventManagementService,
];

export const getServiceConfig = (serviceKey) => SERVICES_CONFIG.find((s) => s.key === serviceKey);

export { slug };
