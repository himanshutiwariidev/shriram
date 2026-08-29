const mongoose = require("mongoose")
const tenantScopePlugin = require("../utils/tenantScopePlugin")

const taskSchema= new mongoose.Schema({
tenantId:{type:mongoose.Schema.Types.ObjectId,ref:"Organization",required:true,index:true},
title:{type:String,required:true,trim:true},
description:{type:String,trim:true},
assignedTo:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
createdBy:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
status:{type:String,enum:["pending","in-progress","completed"],default:"pending"},
priority:{type:String,enum: ["low", "medium", "high"],default:"medium"},
dueDate:{type:Date}
},{timestamps:true});

taskSchema.index({assignedTo:1, status:1})

taskSchema.plugin(tenantScopePlugin)

module.exports= mongoose.model("Task",taskSchema)