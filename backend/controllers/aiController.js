const AiConfig = require("../models/AiConfig");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Project = require("../models/Project");
const Client = require("../models/Client");
const Salary = require("../models/salaryModel");
const Task = require("../models/Task");
const { withTenant, POPULATE_SKIP_TENANT } = require("../utils/tenantQuery");

/* ── Default model per provider (used when none saved yet) ───────────────── */
const DEFAULT_MODELS = {
  claude:  "claude-haiku-4-5-20251001",
  openai:  "gpt-4o-mini",
  gemini:  "gemini-3.6-flash",
  groq:    "llama-3.3-70b-versatile",
  mistral: "mistral-small-latest",
};

/* ── Translate raw API errors to user-friendly messages ─────────────────── */
function friendlyError(provider, status, errorData) {
  const raw = (errorData?.error?.message || errorData?.message || "").toLowerCase();

  if (status === 401 || raw.includes("invalid api key") || raw.includes("unauthorized") || raw.includes("authentication")) {
    return "Invalid API key. Please double-check the key you entered in AI settings.";
  }

  if (status === 429) {
    if (raw.includes("quota") || raw.includes("insufficient") || raw.includes("billing") || raw.includes("credit")) {
      const free = DEFAULT_MODELS[provider];
      return `Your API key's free quota has been exhausted. Upgrade your plan or switch to a free model (e.g. "${free}").`;
    }
    return "Rate limit reached. Please wait a moment and try again, or select a lower-tier model.";
  }

  if (status === 403) {
    if (raw.includes("billing") || raw.includes("plan") || raw.includes("paid")) {
      const free = DEFAULT_MODELS[provider];
      return `This model requires a paid API plan. Please upgrade your account or switch to a free model (e.g. "${free}").`;
    }
    return "Access denied. Your API key may not have permission to use this model.";
  }

  if (status === 404 || raw.includes("not found") || raw.includes("no longer available") || raw.includes("deprecated")) {
    return `This model is not available or has been deprecated. Please select a different model in AI settings.`;
  }

  if (raw.includes("billing") || raw.includes("insufficient_quota") || raw.includes("credit balance") || raw.includes("exceeded")) {
    const free = DEFAULT_MODELS[provider];
    return `Your account doesn't have access to this model — it likely requires a paid plan. Try switching to a free model like "${free}".`;
  }

  if (raw.includes("does not exist") || raw.includes("model_not_found")) {
    return `The selected model doesn't exist or is not accessible with your API key. Please choose a different model.`;
  }

  return errorData?.error?.message || errorData?.message || "Unknown AI provider error. Please try again.";
}

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/ai/config  —  return config for this tenant (key is masked)
───────────────────────────────────────────────────────────────────────────── */
exports.getConfig = async (req, res) => {
  try {
    const config = await AiConfig.findOne({ tenantId: req.tenantId }).lean();
    if (!config) {
      return res.json({
        provider:      "groq",
        apiKey:        "",
        model:         "llama-3.3-70b-versatile",
        isEnabled:     false,
        assistantName: "CRM Assistant",
        hasKey:        false,
      });
    }
    return res.json({
      provider:      config.provider,
      apiKey:        config.apiKey ? "•".repeat(Math.min(config.apiKey.length - 4, 20)) + config.apiKey.slice(-4) : "",
      model:         config.model || DEFAULT_MODELS[config.provider] || "",
      isEnabled:     config.isEnabled,
      assistantName: config.assistantName,
      hasKey:        !!config.apiKey,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load AI config", error: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/ai/config  —  save config (apiKey only updated if a real new value)
───────────────────────────────────────────────────────────────────────────── */
exports.saveConfig = async (req, res) => {
  try {
    const { provider, apiKey, model, isEnabled, assistantName } = req.body;
    const update = { provider, model, isEnabled, assistantName };
    if (apiKey && !apiKey.startsWith("•")) {
      update.apiKey = apiKey.trim();
    }

    const config = await AiConfig.findOneAndUpdate(
      { tenantId: req.tenantId },
      { $set: update },
      { new: true, upsert: true }
    );

    res.json({ success: true, isEnabled: config.isEnabled });
  } catch (err) {
    res.status(500).json({ message: "Failed to save AI config", error: err.message });
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/ai/chat  —  answer a question using live tenant data as context
───────────────────────────────────────────────────────────────────────────── */
exports.chat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required." });
    }

    const config = await AiConfig.findOne({ tenantId: req.tenantId }).lean();
    if (!config || !config.isEnabled) {
      return res.status(403).json({ message: "AI assistant is not enabled for your organisation." });
    }
    if (!config.apiKey) {
      return res.status(403).json({ message: "No API key configured. Please add your API key in AI settings." });
    }

    const model = config.model || DEFAULT_MODELS[config.provider] || DEFAULT_MODELS.groq;

    // ── Gather live tenant data ──────────────────────────────────────────────
    const now = new Date();
    const todayStr  = now.toISOString().slice(0, 10);
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [employees, todayAtt, monthAtt, projects, clients, tasks, salaries] = await Promise.all([
      User.find(withTenant({ role: { $ne: "superadmin" } }, req))
        .select("name email role department designation isActive createdAt").lean(),
      Attendance.find(withTenant({ date: todayStr }, req))
        .select("userId status loginTime logoutTime")
        .populate({ path: "userId", select: "name", options: POPULATE_SKIP_TENANT }).lean(),
      Attendance.find(withTenant({ date: { $regex: `^${thisMonth}` } }, req))
        .select("userId date status").lean(),
      Project.find(withTenant({}, req))
        .select("title status priority deadline budget assignedTo createdAt").lean(),
      Client.find(withTenant({}, req))
        .select("name status phone email createdAt").lean(),
      Task.find(withTenant({}, req))
        .select("title status priority assignedTo dueDate createdAt").lean(),
      Salary.find(withTenant({ salaryMonth: { $regex: `^${thisMonth}` } }, req))
        .select("userId salaryMonth netSalary status")
        .populate({ path: "userId", select: "name", options: POPULATE_SKIP_TENANT }).lean(),
    ]);

    // ── Attendance summaries ─────────────────────────────────────────────────
    const presentToday = new Set(todayAtt.map((a) => String(a.userId?._id || a.userId)));
    const absentToday  = employees.filter((e) => !presentToday.has(String(e._id)));
    const presentNames = todayAtt.map((a) => a.userId?.name || "Unknown");
    const absentNames  = absentToday.map((e) => e.name);
    const monthDays    = [...new Set(monthAtt.map((a) => a.date))];

    // ── Project summary ──────────────────────────────────────────────────────
    const proj = {
      total:     projects.length,
      active:    projects.filter((p) => ["active","in-progress","ongoing"].includes(p.status)).length,
      completed: projects.filter((p) => p.status === "completed").length,
      overdue:   projects.filter((p) => p.deadline && new Date(p.deadline) < now && p.status !== "completed").length,
    };

    // ── Client summary ───────────────────────────────────────────────────────
    const cli = {
      total:    clients.length,
      active:   clients.filter((c) => c.status === "active").length,
      inactive: clients.filter((c) => c.status === "inactive").length,
      new_this_month: clients.filter((c) => {
        const d = new Date(c.createdAt);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }).length,
    };

    // ── Task summary ─────────────────────────────────────────────────────────
    const tsk = {
      total:       tasks.length,
      pending:     tasks.filter((t) => ["pending","todo"].includes(t.status)).length,
      in_progress: tasks.filter((t) => ["in-progress","inprogress"].includes(t.status)).length,
      completed:   tasks.filter((t) => ["completed","done"].includes(t.status)).length,
      overdue:     tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && !["completed","done"].includes(t.status)).length,
    };

    // ── Salary ───────────────────────────────────────────────────────────────
    const totalSalary  = salaries.reduce((s, r) => s + (r.netSalary || 0), 0);
    const salPaid      = salaries.filter((r) => r.status === "paid").length;
    const salPending   = salaries.filter((r) => r.status !== "paid").length;

    // ── System prompt ────────────────────────────────────────────────────────
    const systemPrompt = `You are ${config.assistantName || "CRM Assistant"}, an AI analyst for Bharat Bizmart CRM. You have real-time access to live organisational data and answer precisely and concisely.

TODAY: ${now.toDateString()} (${todayStr}) | MONTH: ${thisMonth}

=== EMPLOYEES (${employees.length}) ===
${employees.map((e) => `- ${e.name} | ${e.role} | ${e.designation || "N/A"} | Active: ${e.isActive !== false}`).join("\n")}

=== TODAY'S ATTENDANCE (${todayStr}) ===
Present (${presentToday.size}): ${presentNames.join(", ") || "None"}
Absent  (${absentNames.length}): ${absentNames.join(", ") || "None"}

=== THIS MONTH ATTENDANCE (${thisMonth}) ===
Working days recorded: ${monthDays.length} | Records: ${monthAtt.length}

=== PROJECTS ===
Total: ${proj.total} | Active: ${proj.active} | Completed: ${proj.completed} | Overdue: ${proj.overdue}
${projects.slice(0, 10).map((p) => `- ${p.title} | ${p.status} | ${p.priority || "N/A"} | Deadline: ${p.deadline ? new Date(p.deadline).toDateString() : "N/A"}`).join("\n")}

=== CLIENTS ===
Total: ${cli.total} | Active: ${cli.active} | Inactive: ${cli.inactive} | New this month: ${cli.new_this_month}

=== TASKS ===
Total: ${tsk.total} | Pending: ${tsk.pending} | In-progress: ${tsk.in_progress} | Completed: ${tsk.completed} | Overdue: ${tsk.overdue}

=== SALARY (${thisMonth}) ===
Slips: ${salaries.length} | Total: ₹${totalSalary.toLocaleString("en-IN")} | Paid: ${salPaid} | Pending: ${salPending}

INSTRUCTIONS: Answer only what's asked. Use real numbers from the data above. Never fabricate. Format Indian rupees as ₹X,XX,XXX. Be concise unless asked for detail.`;

    // ── Build conversation ────────────────────────────────────────────────────
    const conversation = (history || []).slice(-10).map((m) => ({ role: m.role, content: m.content }));
    conversation.push({ role: "user", content: message });

    // ── Call AI provider ─────────────────────────────────────────────────────
    let aiReply = "";

    if (config.provider === "claude") {
      const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type":    "application/json",
          "x-api-key":       config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ model, max_tokens: 1024, system: systemPrompt, messages: conversation }),
      });
      const data = await apiRes.json();
      if (!apiRes.ok) {
        return res.status(502).json({ message: friendlyError("claude", apiRes.status, data) });
      }
      aiReply = data.content?.[0]?.text || "";

    } else if (config.provider === "openai") {
      const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model, max_tokens: 1024,
          messages: [{ role: "system", content: systemPrompt }, ...conversation],
        }),
      });
      const data = await apiRes.json();
      if (!apiRes.ok) {
        return res.status(502).json({ message: friendlyError("openai", apiRes.status, data) });
      }
      aiReply = data.choices?.[0]?.message?.content || "";

    } else if (config.provider === "gemini") {
      const apiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: conversation.map((m) => ({
              role:  m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            })),
          }),
        }
      );
      const data = await apiRes.json();
      if (!apiRes.ok) {
        return res.status(502).json({ message: friendlyError("gemini", apiRes.status, data) });
      }
      aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    } else if (config.provider === "groq") {
      // Groq is OpenAI-compatible
      const apiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model, max_tokens: 1024,
          messages: [{ role: "system", content: systemPrompt }, ...conversation],
        }),
      });
      const data = await apiRes.json();
      if (!apiRes.ok) {
        return res.status(502).json({ message: friendlyError("groq", apiRes.status, data) });
      }
      aiReply = data.choices?.[0]?.message?.content || "";

    } else if (config.provider === "mistral") {
      // Mistral is OpenAI-compatible
      const apiRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model, max_tokens: 1024,
          messages: [{ role: "system", content: systemPrompt }, ...conversation],
        }),
      });
      const data = await apiRes.json();
      if (!apiRes.ok) {
        return res.status(502).json({ message: friendlyError("mistral", apiRes.status, data) });
      }
      aiReply = data.choices?.[0]?.message?.content || "";

    } else {
      return res.status(400).json({ message: `Unknown AI provider: ${config.provider}` });
    }

    if (!aiReply) {
      return res.status(502).json({ message: "AI returned an empty response. Please try again." });
    }

    res.json({ reply: aiReply });
  } catch (err) {
    console.error("[AI Chat]", err.message);
    res.status(500).json({ message: "AI request failed: " + err.message });
  }
};
