/**
 * api/chat.js – Vercel Serverless Function
 * 
 * This is the ONLY backend file. It receives a POST request from the frontend,
 * adds the right system prompt based on the mode (summarize / explain / chat),
 * forwards the request to Google Gemini API, and returns the AI's response.
 * 
 * Architecture: Browser → POST /api/chat → This function → Gemini REST API → JSON reply → Browser
 * 
 * Security: The API key is read from process.env and NEVER sent to the client.
 */

import dns from "node:dns";

// Prefer IPv4 connections to prevent network connection delays on Windows
if (dns && dns.setDefaultResultOrder) {
  try { dns.setDefaultResultOrder("ipv4first"); } catch { }
}

// ─── Model Configuration ───────────────────────────────────────────
// Primary model plus optional fallbacks, configurable from Vercel env vars.
// Verify current model names at https://aistudio.google.com/
const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || "gemini-3.5-flash")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

// Temporary Google-side errors worth retrying: rate limit, server error, overload, timeout
const RETRYABLE_STATUS = [429, 500, 503, 504];
const ATTEMPT_TIMEOUT_MS = 10000; // max time for one attempt
const TOTAL_BUDGET_MS = 25000;    // max time for all attempts together
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One call to the Gemini API for a given model.
 * Never throws: returns { ok, status, data?, message? } so the caller can decide
 * whether to retry, fall back to another model, or give up.
 */
async function callGemini(model, apiKey, baseBody, timeoutMs) {
  const body = structuredClone(baseBody);

  // gemini-2.5 models: disable "thinking" so it can't use up all output tokens
  if (model.includes("2.5")) {
    body.generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        ok: false,
        status: response.status,
        message: errorData?.error?.message || "Gemini API request failed.",
      };
    }
    return { ok: true, data: await response.json() };
  } catch (err) {
    // Timeout (AbortError) or network failure: treat as a temporary error
    return {
      ok: false,
      status: err.name === "AbortError" ? 504 : 503,
      message: err.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Character Limits ──────────────────────────────────────────────
// summarize mode allows longer text (full documents), other modes are shorter
// PROMPT_BUFFER_MARGIN accounts for frontend framing prefixes (e.g., style / subject options)
const CHAR_LIMITS = {
  summarize: 30000,
  explain: 8000,
  chat: 8000,
};
const PROMPT_BUFFER_MARGIN = 250;

// ─── System Prompts ────────────────────────────────────────────────
// Each mode has a carefully crafted system prompt that tells the AI
// how to behave and format its response. These are sent as
// "systemInstruction" in the Gemini API request.
const SYSTEM_PROMPTS = {
  summarize: `You are an expert note-taker and academic summarizer. Your job is to help university students by condensing their study material.

Rules:
- Keep ONLY the key ideas, definitions, formulas, and important facts from the given text.
- NEVER add information that is not present in the original text.
- Use clear, simple language that a first-year B.Tech student can understand.

Output format:
1. A clear heading that describes the topic.
2. A concise summary in the requested style (short summary, bullet points, or exam revision notes).
3. Exactly 3 "Key Takeaways" at the end, each on its own line starting with "🔑".

Use Markdown formatting for headings, bold, lists, and code blocks where appropriate.`,

  explain: `You are a patient and knowledgeable university tutor. Your job is to explain academic concepts clearly to B.Tech students.

Rules:
- Always assume the student is encountering this concept for the first time.
- Use simple language, real-world analogies, and practical examples.
- If a subject is specified, tailor your explanation to that subject's context.

Output format (always follow this structure):
1. **Simple Definition** – A one-or-two sentence plain-English definition.
2. **Step-by-Step Explanation** – Break the concept down into numbered steps.
3. **Worked Example** – One concrete, fully worked-out example with calculations or code if relevant.
4. **Common Exam Mistakes** – 2-3 mistakes students often make in exams, and how to avoid them.

Use Markdown formatting for headings, bold, lists, and code blocks where appropriate.`,

  chat: `You are a friendly and helpful study assistant called StudyMate. You help university students (especially B.Tech first and second year) with their academic doubts and study-related questions.

Rules:
- Answer ONLY academic, educational, and study-related questions.
- If a student asks something unrelated to academics or studying (like recipes, entertainment, personal advice, etc.), politely decline and redirect them back to studying. For example: "That's an interesting question, but I'm designed to help with academic topics! 📚 Feel free to ask me about any subject or concept you're studying."
- Use simple language, examples, and analogies when explaining.
- Be encouraging and supportive.
- Use Markdown formatting for headings, bold, lists, and code blocks where appropriate.
- Keep responses focused and not overly long unless the student asks for detail.`,
};

// ─── Main Handler ──────────────────────────────────────────────────
/**
 * Vercel serverless function entry point.
 * Accepts: POST { mode: string, messages: Array<{role, content}> }
 * Returns: JSON { reply: string } or { error: string }
 */
export default async function handler(req, res) {
  // --- Method check: only POST is allowed ---
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // --- Read the API key from environment variables ---
  // KEY-BY-MODE: explain uses its own key, other modes use the chat key, old key is the fallback
  const requestedMode = req.body && req.body.mode;
  const apiKey =
    (requestedMode === "explain"
      ? process.env.GEMINI_API_KEY_EXPLAINER
      : process.env.GEMINI_API_KEY_CHAT) || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // 500: server misconfiguration – the key should be set in Vercel dashboard
    return res.status(500).json({
      error: "Server configuration error. The API key is not set. Please contact the administrator.",
    });
  }

  // --- Parse and validate the request body ---
  const { mode, messages } = req.body || {};

  // Validate mode
  const validModes = ["summarize", "explain", "chat"];
  if (!mode || !validModes.includes(mode)) {
    return res.status(400).json({
      error: `Invalid mode. Must be one of: ${validModes.join(", ")}.`,
    });
  }

  // Validate messages array
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: "Messages array is required and must not be empty.",
    });
  }

  // Validate each message in the array has the correct shape
  for (const msg of messages) {
    if (
      !msg ||
      typeof msg !== "object" ||
      !["user", "assistant"].includes(msg.role) ||
      typeof msg.content !== "string"
    ) {
      return res.status(400).json({
        error: "Each message must have a 'role' (user/assistant) and a 'content' string.",
      });
    }
  }

  // Check that the last message (the actual user input) is not empty
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage.content.trim()) {
    return res.status(400).json({
      error: "Input cannot be empty. Please type something.",
    });
  }

  // Enforce character limit based on the mode (allowing prompt buffer margin)
  const charLimit = CHAR_LIMITS[mode];
  const maxAllowed = charLimit + PROMPT_BUFFER_MARGIN;
  const lastContentLength = lastMessage.content.length;
  if (lastContentLength > maxAllowed) {
    return res.status(400).json({
      error: `Input is too long (${lastContentLength} characters). Maximum for ${mode} mode is ${charLimit} characters.`,
    });
  }

  // --- Build the Gemini API request ---
  try {
    // Convert our message format to Gemini's: "assistant" -> "model", text in "parts"
    let geminiMessages = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // Chat mode: keep only the last 20 messages to stay within token limits
    if (mode === "chat" && geminiMessages.length > 20) {
      geminiMessages = geminiMessages.slice(-20);
    }

    // Gemini requires the conversation to start with a "user" turn
    if (geminiMessages[0].role === "model") {
      geminiMessages.unshift({ role: "user", parts: [{ text: "Hello" }] });
    }

    const requestBody = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPTS[mode] }] },
      contents: geminiMessages,
      generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
    };

    // --- Try: primary model (twice), then each fallback model once ---
    const attempts = [PRIMARY_MODEL, PRIMARY_MODEL, ...FALLBACK_MODELS];
    const deadline = Date.now() + TOTAL_BUDGET_MS;
    let success = null;
    let lastError = null;

    for (let i = 0; i < attempts.length; i++) {
      const remaining = deadline - Date.now();
      if (remaining < 2000) break; // not enough time left for another attempt

      const result = await callGemini(
        attempts[i],
        apiKey,
        requestBody,
        Math.min(ATTEMPT_TIMEOUT_MS, remaining)
      );

      if (result.ok) {
        success = { data: result.data, model: attempts[i] };
        break;
      }

      lastError = result;
      console.error(`Gemini error (model ${attempts[i]}, attempt ${i + 1}):`, result.status, result.message);

      // 404 = model name not available: skip straight to the next model.
      // Other non-retryable errors (400/401/403) will not improve, so stop.
      if (result.status !== 404 && !RETRYABLE_STATUS.includes(result.status)) break;

      // Short pause before retrying the SAME model
      if (attempts[i + 1] === attempts[i]) await sleep(1000);
    }

    // --- All attempts failed ---
    if (!success) {
      if (!lastError || RETRYABLE_STATUS.includes(lastError.status) || lastError.status === 404) {
        return res.status(503).json({
          error: "The AI is busy right now. Please try again in a few seconds.",
        });
      }
      return res.status(502).json({ error: `AI service error: ${lastError.message}` });
    }

    console.log("Answered by model:", success.model); // no keys or user text logged

    // --- Extract the text from Gemini's response ---
    const candidate = success.data?.candidates?.[0];
    const text = candidate?.content?.parts
      ?.filter((p) => p.text)
      ?.map((p) => p.text)
      ?.join("")
      ?.trim();

    if (!text) {
      console.error("Empty AI reply. Finish reason:", candidate?.finishReason || "unknown");
      return res.status(502).json({
        error: "The AI could not generate a response. It may have been blocked by safety filters. Please rephrase your input.",
      });
    }

    return res.status(200).json({ reply: text });
  } catch (err) {
    // Last-resort safety net: log on the server only, never send details to the client
    console.error("Unexpected server error:", err);
    return res.status(502).json({
      error: "Something went wrong while contacting the AI service. Please try again.",
    });
  }
}