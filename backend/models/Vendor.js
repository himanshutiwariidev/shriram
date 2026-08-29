const mongoose = require("mongoose");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

const VendorSchema = new mongoose.Schema(
  {
    tenantId:     { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name:         { type: String, required: true, trim: true },
    email:        { type: String, trim: true, lowercase: true },
    phone:        { type: String, trim: true },
    gstNumber:    { type: String, trim: true },
    pan:          { type: String, trim: true, uppercase: true },
    address:      { type: String, trim: true },
    paymentTerms: { type: String, trim: true },
    notes:        { type: String, trim: true },
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

VendorSchema.index({ tenantId: 1, name: 1 }, { unique: true });
VendorSchema.plugin(tenantScopePlugin);

module.exports = mongoose.model("Vendor", VendorSchema);
