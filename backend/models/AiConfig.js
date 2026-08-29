const mongoose = require("mongoose");

const aiConfigSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["claude", "openai", "gemini", "groq", "mistral"],
      default: "groq",
    },
    apiKey: {
      type: String,
      default: "",
    },
    model: {
      type: String,
      default: "",
    },
    isEnabled: {
      type: Boolean,
      default: false,
    },
    assistantName: {
      type: String,
      default: "CRM Assistant",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AiConfig", aiConfigSchema);
