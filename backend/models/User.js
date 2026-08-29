const mongoose = require("mongoose");
const bcrypt= require("bcryptjs");
const tenantScopePlugin = require("../utils/tenantScopePlugin");

const UserSchema= new mongoose.Schema(
    {
        name:{type:String,required:[true, "Name is required"],trim:true},
        email:{type:String,required:true,lowercase:true,trim:true,match:[/^\S+@\S+\.\S+$/, "Invalid email format"]},
        password:{type:String,required:true,minlength:6,select:false},
        role:{type:String,enum:["admin","user","hr","sales","client","superadmin","tenant_admin"],default:"user"},
        phone:{type:String,trim:true},
        clientId:{type:mongoose.Schema.Types.ObjectId,ref:"Client"},
        branchId:{type:mongoose.Schema.Types.ObjectId,ref:"Branch"},
        departmentId:{type:mongoose.Schema.Types.ObjectId,ref:"Department"},
        isActive:{type:Boolean,default:true},
        profileImage:{type:String,trim:true},
        designation:{type:String,trim:true},
        lastLogin:{type:Date},
        // Platform-level superadmin accounts have no tenantId; every other
        // role belongs to exactly one Organization.
        tenantId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Organization",
            required:function(){return this.role!=="superadmin";},
            index:true,
        },
        // ── Employee fields (non-client roles only) ────────────────────────
        employeeId:    { type: String, trim: true },
        dob:           { type: Date },
        bloodGroup:    { type: String, trim: true },
        gender:        { type: String, enum: ["Male","Female","Other",""] },
        emergencyContact: { type: String, trim: true },
        address:       { type: String, trim: true },
        aadhaar:       { type: String, trim: true },
        pan:           { type: String, trim: true, uppercase: true },
        qualification: { type: String, trim: true },
        experience:    { type: String, trim: true },
        resume:        { type: String, trim: true },
        joiningDate:   { type: Date },
        relievingDate: { type: Date },
        shiftId:       { type: mongoose.Schema.Types.ObjectId, ref: "Shift", default: null },
    },{timestamps:true}
);

// Email uniqueness is scoped per tenant, not global — two different
// organizations may have a user with the same email address.
UserSchema.index({ email: 1, tenantId: 1 }, { unique: true });

UserSchema.plugin(tenantScopePlugin);

module.exports=mongoose.model("User",UserSchema)
