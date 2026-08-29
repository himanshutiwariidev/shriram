// Mongoose plugin applied to every tenant-owned model. It is a safety net,
// not the primary scoping mechanism — controllers scope queries explicitly
// via `withTenant()` (see tenantQuery.js) so call sites stay greppable. This
// plugin catches anything a controller refactor missed.
//
// Enforcement is togglable via TENANT_SCOPE_ENFORCE so the rollout can ship
// schema changes ahead of the migration script without breaking unmigrated
// data (see backend/scripts/migrateToMultiTenant.js for the rollout order).
// Once the migration has run, set TENANT_SCOPE_ENFORCE=true (or leave unset
// in production) to make a missing tenantId filter a hard error instead of
// a warning.
const SCOPED_OPS = [
  "find",
  "findOne",
  "findOneAndUpdate",
  "findOneAndDelete",
  "findOneAndRemove",
  "count",
  "countDocuments",
  "updateMany",
  "updateOne",
  "deleteMany",
  "deleteOne",
];

module.exports = function tenantScopePlugin(schema) {
  SCOPED_OPS.forEach((op) => {
    // Query middleware in this Mongoose version resolves via return value /
    // thrown error, not a next() callback — a pre hook that expects `next`
    // never gets one and throws "next is not a function".
    schema.pre(op, function () {
      if (this.getOptions().skipTenantScope) return;

      const filter = this.getFilter();
      if (filter.tenantId !== undefined) return;

      const message = `Tenant scope violation: ${this.model?.modelName}.${op}() ran without tenantId in filter.`;
      if (process.env.TENANT_SCOPE_ENFORCE === "false") {
        console.warn(message);
        return;
      }
      throw new Error(message);
    });
  });
};
