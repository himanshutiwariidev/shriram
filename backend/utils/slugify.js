const Organization = require("../models/Organization");

const slugify = (name) =>
  String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const buildUniqueSlug = async (organizationName) => {
  const base = slugify(organizationName) || "org";
  let slug = base;
  let suffix = 0;

  // Collision-safe: append a short random suffix rather than looping forever.
  while (await Organization.findOne({ slug })) {
    suffix += 1;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    if (suffix > 5) break; // extremely unlikely, but never loop indefinitely
  }

  return slug;
};

module.exports = { slugify, buildUniqueSlug };
