// Explicit tenant-scoping helper used at every controller query call site.
// Kept as a plain function (rather than baked invisibly into the model) so
// scoped queries stay greppable and auditable in code review.
const withTenant = (filter = {}, req) => ({ ...filter, tenantId: req.tenantId });

// Mongoose populate() issues its own Model.find({ _id: { $in: [...] } })
// sub-query against the referenced model, which the tenantScopePlugin would
// otherwise reject for missing tenantId. It's safe to skip scoping here: the
// referenced _ids were only ever set on a document by our own controllers,
// which always write them from a user/client/etc. already inside the same
// tenant — so the lookup can't cross a tenant boundary. Spread into the
// `options` key of a populate() call, e.g. `.populate({ path: "userId", select: "name", options: POPULATE_SKIP_TENANT })`.
const POPULATE_SKIP_TENANT = { skipTenantScope: true };

module.exports = { withTenant, POPULATE_SKIP_TENANT };
