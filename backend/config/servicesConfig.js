// Backend-side mirror of frontend/src/config/servicesConfig.js — trimmed to
// just {key, label, children} (no field-type metadata, which only the form
// renderer needs) since the only thing servicesToDeliverables.js needs from
// the config is the label hierarchy to build a readable deliverable title.
//
// The frontend file is an ES module (import/export) and the backend is
// CommonJS with a fully separate package.json/toolchain (no shared-code
// mechanism exists anywhere in this project) — a direct require() across
// that boundary isn't viable, so this is a deliberate, documented
// duplication. MUST be kept in sync (key + label + nesting shape only) any
// time a service is added or relabeled on the frontend.

const slug = (label) =>
  label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const SOCIAL_STANDARD_OPTIONS = [
  "Graphic Creatives", "AI Creatives", "AI Reels", "Templated Reels", "Shooted Reels",
  "After Effects Videos", "Blogs", "Long Videos (2 Minutes)", "GIF", "Stories", "Go Live",
];
const socialOptionLeaf = (label) => ({ key: slug(label), label });
const socialPlatform = (key, label) => ({ key, label, children: SOCIAL_STANDARD_OPTIONS.map(socialOptionLeaf) });

const YOUTUBE_OPTIONS = ["Shorts", "Upload Existing Reels as Shorts", "Shooted Reels", "Shooted Long Videos", "AI Shorts", "AI Videos"];

const socialMediaService = {
  key: "socialMedia", label: "Social Media",
  children: [
    socialPlatform("facebook", "Facebook"),
    socialPlatform("instagram", "Instagram"),
    socialPlatform("linkedin", "LinkedIn"),
    { key: "youtube", label: "YouTube", children: YOUTUBE_OPTIONS.map((l) => ({ key: slug(l), label: l })) },
    socialPlatform("threads", "Threads"),
    socialPlatform("other", "Other"),
  ],
};

const KEYWORD_TYPES = ["Long Tail Keywords", "Short Tail Keywords", "Luxury Keywords"];

const rankingOptimizationService = {
  key: "rankingOptimization", label: "Ranking Optimization",
  children: [
    { key: "seo", label: "SEO", children: KEYWORD_TYPES.map((l) => ({ key: slug(l), label: l })) },
    { key: "aeo", label: "AEO" },
    { key: "geo", label: "GEO" },
    { key: "localSeo", label: "Local SEO" },
  ],
};

const googleAdsService = {
  key: "googleAds", label: "Google Ads",
  children: [
    { key: "search_ads", label: "Search Ads" },
    { key: "shopping_ads", label: "Shopping Ads" },
    { key: "remarketing", label: "Remarketing" },
    { key: "website_traffic", label: "Website Traffic" },
    { key: "youtube_banner_ads", label: "YouTube Banner Ads" },
    { key: "youtube_views", label: "YouTube Views", children: [{ key: "skippable", label: "Skippable" }, { key: "non_skippable", label: "Non Skippable" }] },
    { key: "youtube_subscribers", label: "YouTube Subscribers" },
    { key: "youtube_traffic", label: "YouTube Traffic" },
    { key: "app_downloads", label: "App Downloads" },
    { key: "google_maps_ads", label: "Google Maps Ads" },
  ],
};

const META_ADS_OPTIONS = [
  "Page Likes", "Post Likes", "Followers", "Post Engagement", "Video/Reels Views", "Subscriptions",
  "Shopping Ads", "One Click Form Ads", "QA Form Ads", "WhatsApp Lead Ads", "Call Lead Ads", "Website Visit Ads",
];
const metaAdsService = { key: "metaAds", label: "Meta Ads", children: META_ADS_OPTIONS.map((l) => ({ key: slug(l), label: l })) };
const ottAdsService = { key: "ottAds", label: "OTT Ads" };

const sponsoredAdsService = {
  key: "sponsoredAds", label: "Sponsored Ads",
  children: [googleAdsService, metaAdsService, ottAdsService],
};

const GMB_OPTIONS = ["Monthly Posting", "Reviews", "Map Creation", "Optimization"];
const googleMyBusinessService = {
  key: "googleMyBusiness", label: "Google My Business",
  children: GMB_OPTIONS.map((l) => ({ key: slug(l), label: l })),
};

const websiteDevelopmentService = { key: "websiteDevelopment", label: "Website Development" };

const mobileAppDevelopmentService = { key: "mobileAppDevelopment", label: "Mobile App Development" };

const telecastService = { key: "telecast", label: "Telecast" };

const broadcastService = { key: "broadcast", label: "Broadcast" };

const AI_SERVICES_OPTIONS = [
  "AI Reels", "AI Short Film", "AI Film", "AI Product Demo",
  "AI Chatbot", "AI Robot Calling", "AI Framework", "Other AI Services",
];
const aiServicesService = {
  key: "aiServices", label: "AI Services",
  children: AI_SERVICES_OPTIONS.map((l) => ({ key: slug(l), label: l })),
};

const FILM_PRODUCTION_OPTIONS = ["TV Advertisement", "Corporate Film", "Music Album", "Short Film", "AI Advertisement"];
const filmProductionService = {
  key: "filmProduction", label: "Film Production",
  children: FILM_PRODUCTION_OPTIONS.map((l) => ({ key: slug(l), label: l })),
};

const celebrityEnrollmentManagementService = { key: "celebrityEnrollmentManagement", label: "Celebrity Enrollment/Management" };

const INFLUENCER_MARKETING_OPTIONS = ["Collaboration Reel", "Tag Reel", "Visit Reel"];
const influencerMarketingService = {
  key: "influencerMarketing", label: "Influencer Marketing",
  children: INFLUENCER_MARKETING_OPTIONS.map((l) => ({ key: slug(l), label: l })),
};

const EVENT_MANAGEMENT_OPTIONS = [
  "Corporate Event", "Product Launch", "Brand Activation", "Road Show", "Exhibition",
  "Seminar", "Conference", "Mall Activity", "Celebrity Event", "College Event", "Other",
];
const eventManagementService = {
  key: "eventManagement", label: "Event Management",
  children: EVENT_MANAGEMENT_OPTIONS.map((l) => ({ key: slug(l), label: l })),
};

const SERVICES_CONFIG = [
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

const getServiceConfig = (serviceKey) => SERVICES_CONFIG.find((s) => s.key === serviceKey);

module.exports = { SERVICES_CONFIG, getServiceConfig };
