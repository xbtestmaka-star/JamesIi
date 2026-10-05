import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always load the .env file from this project's root folder.
const envResult = dotenv.config({
  path: path.join(__dirname, ".env")
});

if (envResult.error && envResult.error.code !== "ENOENT") {
  console.warn("Could not load .env:", envResult.error.message);
}

const app = express();
const PORT = Number(process.env.PORT || 3000);


// Allow the frontend to call the API when index.html is opened in Chrome,
// VS Code Live Server, or directly as a file:// page.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function normalizeKey(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .trim();
}

const apiKey = normalizeKey(process.env.OPENAI_API_KEY);
const model = process.env.OPENAI_MODEL || "gpt-6-luna";
const client = apiKey ? new OpenAI({ apiKey }) : null;

if (!apiKey) {
  console.warn("WARNING: OPENAI_API_KEY is missing in .env");
}

const SYSTEM_INSTRUCTIONS = `
You are James AI, a helpful general-purpose AI assistant.

Answer naturally and accurately like a modern chat assistant.

You can help with:
- General questions
- Programming and coding
- School and study subjects
- Translation
- Writing, rewriting and proofreading
- Mathematics
- Explaining difficult topics simply
- Myanmar/Burmese questions and answers
- English questions and answers

Language behavior:
- If the user writes Burmese, answer in natural Burmese.
- If the user writes English, answer in natural English.
- If the user asks for translation, translate faithfully.
- Burmese + English technical terms are fine when useful.

Programming:
- Give runnable code when requested.
- Clearly say which file code belongs in.
- Never claim code was tested unless it was actually tested.

Math:
- Show important steps and check the calculation.

General:
- Be friendly, concise, and useful.
- Do not invent facts.
`;

function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(m =>
      m &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string"
    )
    .slice(-24)
    .map(m => ({
      role: m.role,
      content: m.content.slice(0, 12000)
    }));
}

function safeErrorMessage(error) {
  const status = error?.status;
  const code = error?.code;
  const message = String(error?.message || "Unknown API error");

  if (status === 401 || code === "invalid_api_key") {
    return "OpenAI API key မမှန်ပါ။ .env ထဲက OPENAI_API_KEY ကို ပြန်စစ်ပါ။";
  }
  if (status === 429) {
    return "OpenAI API limit / billing ပြဿနာ ဖြစ်နေပါတယ်။ API account ရဲ့ billing/limits ကို စစ်ပါ။";
  }
  if (status === 403) {
    return "ဒီ API key မှာ ဒီ request ကိုလုပ်ခွင့်မရှိပါ။ Project/permissions ကို စစ်ပါ။";
  }
  if (status >= 500) {
    return "OpenAI server ဘက်က ခဏပြဿနာဖြစ်နေပါတယ်။ ခဏနေရင် ထပ်စမ်းပါ။";
  }

  return message;
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    name: "James AI",
    apiConfigured: Boolean(client),
    model,
    keyPrefix: apiKey ? apiKey.slice(0, 7) + "..." : null
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!client) {
      return res.status(500).json({
        ok: false,
        error: "OPENAI_API_KEY မတွေ့ပါ။ Project folder ထဲက .env ဖိုင်ကို စစ်ပါ။"
      });
    }

    const message = typeof req.body?.message === "string"
      ? req.body.message.trim()
      : "";

    if (!message) {
      return res.status(400).json({
        ok: false,
        error: "Message is empty."
      });
    }

    const history = cleanHistory(req.body?.history);

    const response = await client.responses.create({
      model,
      instructions: SYSTEM_INSTRUCTIONS,
      input: [
        ...history,
        { role: "user", content: message }
      ]
    });

    const reply = String(response.output_text || "").trim();

    if (!reply) {
      return res.status(502).json({
        ok: false,
        error: "AI က အဖြေဗလာ ပြန်လာပါတယ်။ ထပ်စမ်းကြည့်ပါ။"
      });
    }

    return res.json({
      ok: true,
      name: "James AI",
      reply
    });
  } catch (error) {
    console.error("James AI API error:", error);
    return res.status(Number(error?.status) || 500).json({
      ok: false,
      error: safeErrorMessage(error)
    });
  }
});

// Keep API errors JSON so the browser never gets an empty/non-JSON response.
app.use((err, _req, res, _next) => {
  console.error("Express error:", err);
  res.status(500).json({
    ok: false,
    error: err?.message || "Server error."
  });
});

const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log("");
  console.log("================================");
  console.log("          James AI Server");
  console.log("================================");
  console.log(`http://localhost:${PORT}`);
  console.log(`Chrome / Live Server API: http://127.0.0.1:${PORT}/api/health`);
  console.log(`Model: ${model}`);
  console.log(`API key: ${apiKey ? "FOUND" : "MISSING"}`);
  console.log("");
});
