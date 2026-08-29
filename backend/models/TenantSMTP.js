const mongoose = require("mongoose");

// One document per tenant — no tenantScopePlugin needed because we always
// query by tenantId directly and there is no list endpoint.
const TenantSMTPSchema = new mongoose.Schema(
  {
    tenantId:    { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, unique: true, index: true },
    host:        { type: String, trim: true },
    port:        { type: Number, default: 587 },
    secure:      { type: Boolean, default: false },   // true = SSL/465, false = TLS/STARTTLS
    username:    { type: String, trim: true },
    // password is stored AES-256-CBC encrypted — never returned to the client
    passwordEnc: { type: String },
    passwordIv:  { type: String },
    fromName:    { type: String, trim: true },
    fromEmail:   { type: String, trim: true },
    enabled:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TenantSMTP", TenantSMTPSchema);
