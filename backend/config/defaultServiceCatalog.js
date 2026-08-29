// Default service catalog seeded into ServiceCatalog on first startup.
// Mirrors the legacy frontend servicesConfig.js exactly so no data is lost
// when switching from hardcoded to DB-driven.

const slug = (label) =>
  label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const text = (key, label) => ({ key, label, type: "text" });
const textarea = (key, label) => ({ key, label, type: "textarea" });
const number = (key, label) => ({ key, label, type: "number" });
const toggle = (key, label) => ({ key, label, type: "toggle", default: false });
const select = (key, label, options) => ({ key, label, type: "select", options });
const multiselect = (key, label, options) => ({ key, label, type: "multiselect", options });
const tags = (key, label) => ({ key, label, type: "tags" });
const date = (key, label) => ({ key, label, type: "date" });
const remarks = () => ({ key: "remarks", label: "Remarks", type: "textarea" });

const SOCIAL_STANDARD_OPTIONS = [
  "Graphic Creatives", "AI Creatives", "AI Reels", "Templated Reels", "Shooted Reels",
  "After Effects Videos", "Blogs", "Long Videos (2 Minutes)", "GIF", "Stories", "Go Live",
];
const socialOptionLeaf = (label) => ({
  key: slug(label), label, type: "optionLeaf",
  fields: [number("quantityPerMonth", "Quantity Per Month"), select("priority", "Priority", ["Low", "Medium", "High"]), remarks()],
});
const socialPlatform = (key, label) => ({ key, label, type: "group", children: SOCIAL_STANDARD_OPTIONS.map(socialOptionLeaf) });

const YOUTUBE_OPTIONS = ["Shorts", "Upload Existing Reels as Shorts", "Shooted Reels", "Shooted Long Videos", "AI Shorts", "AI Videos"];
const youtubeOptionLeaf = (label) => ({ key: slug(label), label, type: "optionLeaf", fields: [number("quantityPerMonth", "Quantity Per Month"), remarks()] });

const KEYWORD_TYPES = ["Long Tail Keywords", "Short Tail Keywords", "Luxury Keywords"];
const keywordTypeLeaf = (label) => ({
  key: slug(label), label, type: "optionLeaf",
  fields: [number("numberOfKeywords", "Number of Keywords"), tags("keywordTags", "Keyword Tags"), text("targetUrl", "Target URL"), remarks()],
});

const googleAdsFields = () => [
  number("monthlyBudget", "Monthly Budget"), text("campaignDuration", "Campaign Duration"),
  text("audience", "Audience"), text("location", "Location"), text("objective", "Objective"), remarks(),
];
const googleAdsOptionLeaf = (label) => ({ key: slug(label), label, type: "optionLeaf", fields: googleAdsFields() });

const META_ADS_OPTIONS = [
  "Page Likes", "Post Likes", "Followers", "Post Engagement", "Video/Reels Views", "Subscriptions",
  "Shopping Ads", "One Click Form Ads", "QA Form Ads", "WhatsApp Lead Ads", "Call Lead Ads", "Website Visit Ads",
];
const metaAdsOptionLeaf = (label) => ({
  key: slug(label), label, type: "optionLeaf",
  fields: [number("budget", "Budget"), text("duration", "Duration"), text("audience", "Audience"), text("objective", "Objective"), remarks()],
});

const GMB_OPTIONS = ["Monthly Posting", "Reviews", "Map Creation", "Optimization"];
const gmbOptionLeaf = (label) => ({
  key: slug(label), label, type: "optionLeaf",
  fields: [number("quantity", "Quantity"), text("duration", "Duration"), remarks()],
});

const AI_SERVICES_OPTIONS = ["AI Reels", "AI Short Film", "AI Film", "AI Product Demo", "AI Chatbot", "AI Robot Calling", "AI Framework", "Other AI Services"];
const aiServiceOptionLeaf = (label) => ({
  key: slug(label), label, type: "optionLeaf",
  fields: [textarea("brief", "Brief"), text("duration", "Duration"), textarea("prompt", "Prompt"), text("platform", "Platform"), text("timeline", "Timeline"), remarks()],
});

const FILM_PRODUCTION_OPTIONS = ["TV Advertisement", "Corporate Film", "Music Album", "Short Film", "AI Advertisement"];
const filmProductionOptionLeaf = (label) => ({
  key: slug(label), label, type: "optionLeaf",
  fields: [
    textarea("brief", "Brief"), text("duration", "Duration"),
    toggle("script", "Script"), toggle("storyboard", "Storyboard"), toggle("voiceOver", "Voice Over"),
    text("actors", "Actors"), text("location", "Location"), toggle("editing", "Editing"), toggle("vfx", "VFX"),
    text("timeline", "Timeline"), number("budget", "Budget"), remarks(),
  ],
});

const INFLUENCER_MARKETING_OPTIONS = ["Collaboration Reel", "Tag Reel", "Visit Reel"];
const influencerMarketingOptionLeaf = (label) => ({
  key: slug(label), label, type: "optionLeaf",
  fields: [
    text("influencerName", "Influencer Name"), text("platform", "Platform"), number("followers", "Followers"),
    text("category", "Category"), textarea("deliverables", "Deliverables"), text("timeline", "Timeline"), number("cost", "Cost"), remarks(),
  ],
});

const EVENT_MANAGEMENT_OPTIONS = [
  "Corporate Event", "Product Launch", "Brand Activation", "Road Show", "Exhibition",
  "Seminar", "Conference", "Mall Activity", "Celebrity Event", "College Event", "Other",
];
const eventManagementOptionLeaf = (label) => ({
  key: slug(label), label, type: "optionLeaf",
  fields: [
    text("venue", "Venue"), text("location", "Location"), date("date", "Date"),
    toggle("branding", "Branding"), toggle("led", "LED"), toggle("photography", "Photography"), toggle("videography", "Videography"),
    text("artists", "Artists"), text("anchor", "Anchor"), number("guests", "Guests"), number("budget", "Budget"),
    text("timeline", "Timeline"), remarks(),
  ],
});

const DEFAULT_SERVICES = [
  {
    key: "socialMedia", label: "Social Media", icon: "Share2", sortOrder: 0,
    config: {
      key: "socialMedia", label: "Social Media", icon: "Share2", type: "group",
      children: [
        socialPlatform("facebook", "Facebook"), socialPlatform("instagram", "Instagram"),
        socialPlatform("linkedin", "LinkedIn"),
        { key: "youtube", label: "YouTube", type: "group", children: YOUTUBE_OPTIONS.map(youtubeOptionLeaf) },
        socialPlatform("threads", "Threads"), socialPlatform("other", "Other"),
      ],
    },
  },
  {
    key: "rankingOptimization", label: "Ranking Optimization", icon: "TrendingUp", sortOrder: 1,
    config: {
      key: "rankingOptimization", label: "Ranking Optimization", icon: "TrendingUp", type: "group",
      gate: { key: "scope", label: "Scope", type: "radio", options: ["Domestic", "International"], required: true },
      gateMode: "reveal",
      children: [
        { key: "seo", label: "SEO", type: "group", children: KEYWORD_TYPES.map(keywordTypeLeaf) },
        { key: "aeo", label: "AEO", type: "group", fields: [text("targetPages", "Target Pages"), tags("keywords", "Keywords"), remarks()] },
        { key: "geo", label: "GEO", type: "group", fields: [text("targetPages", "Target Pages"), tags("keywords", "Keywords"), remarks()] },
        { key: "localSeo", label: "Local SEO", type: "group", fields: [text("country", "Country"), text("state", "State"), text("city", "City"), tags("multipleCities", "Multiple Cities")] },
      ],
    },
  },
  {
    key: "sponsoredAds", label: "Sponsored Ads", icon: "Megaphone", sortOrder: 2,
    config: {
      key: "sponsoredAds", label: "Sponsored Ads", icon: "Megaphone", type: "group",
      gate: { key: "channel", label: "Channel", type: "select", options: ["Google Ads", "Meta Ads", "OTT Ads"], required: true },
      gateMode: "filter",
      children: [
        {
          key: "googleAds", label: "Google Ads", type: "group",
          children: [
            googleAdsOptionLeaf("Search Ads"), googleAdsOptionLeaf("Shopping Ads"), googleAdsOptionLeaf("Remarketing"),
            googleAdsOptionLeaf("Website Traffic"), googleAdsOptionLeaf("YouTube Banner Ads"),
            { key: "youtube_views", label: "YouTube Views", type: "group", children: [
              { key: "skippable", label: "Skippable", type: "optionLeaf", fields: googleAdsFields() },
              { key: "non_skippable", label: "Non Skippable", type: "optionLeaf", fields: googleAdsFields() },
            ]},
            googleAdsOptionLeaf("YouTube Subscribers"), googleAdsOptionLeaf("YouTube Traffic"),
            googleAdsOptionLeaf("App Downloads"), googleAdsOptionLeaf("Google Maps Ads"),
          ],
        },
        { key: "metaAds", label: "Meta Ads", type: "group", children: META_ADS_OPTIONS.map(metaAdsOptionLeaf) },
        {
          key: "ottAds", label: "OTT Ads", type: "group",
          fields: [
            text("platform", "Platform"), number("budget", "Budget"), text("duration", "Duration"),
            text("region", "Region"), text("language", "Language"), text("audience", "Audience"),
            text("videoDuration", "Video Duration"), remarks(),
          ],
        },
      ],
    },
  },
  {
    key: "googleMyBusiness", label: "Google My Business", icon: "MapPin", sortOrder: 3,
    config: {
      key: "googleMyBusiness", label: "Google My Business", icon: "MapPin", type: "group",
      children: GMB_OPTIONS.map(gmbOptionLeaf),
    },
  },
  {
    key: "websiteDevelopment", label: "Website Development", icon: "Globe", sortOrder: 4,
    config: {
      key: "websiteDevelopment", label: "Website Development", icon: "Globe", type: "group",
      fields: [
        multiselect("platforms", "Platforms", ["Custom Code", "Shopify", "WordPress", "Wix"]),
        multiselect("developmentTypes", "Development Types", ["Landing Page", "5 Page Website", "10 Page Website", "Ecommerce Website", "Custom Web Application"]),
        text("hosting", "Hosting"), text("domain", "Domain"), toggle("ssl", "SSL"),
        text("maintenance", "Maintenance"), text("timeline", "Timeline"), remarks(),
      ],
    },
  },
  {
    key: "mobileAppDevelopment", label: "Mobile App Development", icon: "Smartphone", sortOrder: 5,
    config: {
      key: "mobileAppDevelopment", label: "Mobile App Development", icon: "Smartphone", type: "group",
      fields: [
        multiselect("platforms", "Platforms", ["Android", "iOS", "Hybrid"]),
        multiselect("applicationTypes", "Application Types", ["Ecommerce", "CRM", "Healthcare", "Booking", "Education", "Finance", "Custom"]),
        number("screens", "Screens"), toggle("apiIntegration", "API Integration"), toggle("adminPanel", "Admin Panel"),
        text("timeline", "Timeline"), remarks(),
      ],
    },
  },
  {
    key: "telecast", label: "Telecast", icon: "Tv", sortOrder: 6,
    config: {
      key: "telecast", label: "Telecast", icon: "Tv", type: "group",
      fields: [
        text("channelName", "Telecast Channel Name"),
        select("advertisementType", "Advertisement Type", ["Video Ad", "L Band"]),
        text("duration", "Duration"), text("rodp", "RODP"), toggle("primeTime", "Prime Time"),
        text("location", "Location"), text("campaignDates", "Campaign Dates"), remarks(),
      ],
    },
  },
  {
    key: "broadcast", label: "Broadcast", icon: "Radio", sortOrder: 7,
    config: {
      key: "broadcast", label: "Broadcast", icon: "Radio", type: "group",
      fields: [
        text("radioName", "Radio Name"), text("duration", "Duration"), text("rodp", "RODP"),
        toggle("primeTime", "Prime Time"), text("location", "Location"), text("campaignDates", "Campaign Dates"), remarks(),
      ],
    },
  },
  {
    key: "aiServices", label: "AI Services", icon: "Sparkles", sortOrder: 8,
    config: {
      key: "aiServices", label: "AI Services", icon: "Sparkles", type: "group",
      children: AI_SERVICES_OPTIONS.map(aiServiceOptionLeaf),
    },
  },
  {
    key: "filmProduction", label: "Film Production", icon: "Film", sortOrder: 9,
    config: {
      key: "filmProduction", label: "Film Production", icon: "Film", type: "group",
      children: FILM_PRODUCTION_OPTIONS.map(filmProductionOptionLeaf),
    },
  },
  {
    key: "celebrityEnrollmentManagement", label: "Celebrity Enrollment/Management", icon: "Star", sortOrder: 10,
    config: {
      key: "celebrityEnrollmentManagement", label: "Celebrity Enrollment/Management", icon: "Star", type: "group",
      fields: [
        text("celebrityName", "Celebrity Name"), toggle("exclusive", "Exclusive"), toggle("nonExclusive", "Non Exclusive"),
        toggle("tvAdvertisement", "TV Advertisement"), toggle("selfFilm", "Self Film"),
        toggle("oldPhotos", "Old Photos"), toggle("newPhotos", "New Photos"), toggle("other", "Other"),
        toggle("agreement", "Agreement"), text("duration", "Duration"), number("cost", "Cost"), remarks(),
      ],
    },
  },
  {
    key: "influencerMarketing", label: "Influencer Marketing", icon: "Users", sortOrder: 11,
    config: {
      key: "influencerMarketing", label: "Influencer Marketing", icon: "Users", type: "group",
      children: INFLUENCER_MARKETING_OPTIONS.map(influencerMarketingOptionLeaf),
    },
  },
  {
    key: "eventManagement", label: "Event Management", icon: "CalendarDays", sortOrder: 12,
    config: {
      key: "eventManagement", label: "Event Management", icon: "CalendarDays", type: "group",
      children: EVENT_MANAGEMENT_OPTIONS.map(eventManagementOptionLeaf),
    },
  },
];

module.exports = DEFAULT_SERVICES;
