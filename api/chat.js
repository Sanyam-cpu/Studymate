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
  try { dns.setDefaultResultOrder("ipv4first"); } catch {}
}

// ─── Model Configuration ───────────────────────────────────────────
// Verify the current model name at https://aistudio.google.com/
// Defaults to gemini-3.5-flash-lite for responsive, high-availability study assistance.
// (gemini-2.5-flash was deprecated for new accounts in Google AI Studio).
const MODEL = "gemini-3.5-flash-lite";

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
  const apiKey = process.env.GEMINI_API_KEY;
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
    // Convert our message format to Gemini's format:
    // - Our "assistant" role → Gemini's "model" role
    // - Gemini expects "parts" array with text objects
    let geminiMessages = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // For chat mode, limit to the last 20 messages to stay within token limits
    if (mode === "chat" && geminiMessages.length > 20) {
      geminiMessages = geminiMessages.slice(-20);
    }

    // Gemini requires the conversation to start with a "user" turn.
    // If it starts with "model", we prepend a user message.
    if (geminiMessages[0].role === "model") {
      geminiMessages.unshift({
        role: "user",
        parts: [{ text: "Hello" }],
      });
    }

    // Build the request body for Gemini API
    const requestBody = {
      // System instruction tells the AI what role to play
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPTS[mode] }],
      },
      // The conversation history
      contents: geminiMessages,
      // Control the AI's output behaviour
      generationConfig: {
        temperature: 0.4,       // Lower = more focused/deterministic
        maxOutputTokens: 2048,  // Cap the response length
      },
    };

    // For gemini-2.5 models, disable "thinking" to prevent empty replies.
    // The thinking process can consume all output tokens, leaving nothing
    // for the actual response.
    if (MODEL.includes("2.5")) {
      requestBody.generationConfig.thinkingConfig = {
        thinkingBudget: 0,
      };
    }

    // --- Call the Gemini API with a 25-second timeout ---
    // AbortController lets us cancel the request if it takes too long
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    const geminiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,  // API key sent in header (not query param)
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,  // Attach the abort signal
    });

    clearTimeout(timeout);  // Cancel the timeout if request completed

    // --- Handle Gemini API errors ---
    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || "Gemini API request failed.";
      console.error("Gemini API error:", geminiResponse.status, errorMsg);
      return res.status(502).json({
        error: `AI service error: ${errorMsg}`,
      });
    }

    // --- Extract the text from Gemini's response ---
    const data = await geminiResponse.json();

    // Navigate the response structure to find the actual text
    const candidate = data?.candidates?.[0];
    const text = candidate?.content?.parts
      ?.filter((p) => p.text)       // Filter out non-text parts (e.g. thinking)
      ?.map((p) => p.text)          // Extract the text from each part
      ?.join("")                     // Join all text parts together
      ?.trim();

    // Check if the response was blocked or empty
    if (!text) {
      const blockReason = candidate?.finishReason || "unknown";
      console.error("Empty AI reply. Finish reason:", blockReason);
      return res.status(502).json({
        error: "The AI could not generate a response. It may have been blocked by safety filters. Please rephrase your input.",
      });
    }

    // --- Success! Return the AI's reply ---
    return res.status(200).json({ reply: text });

  } catch (err) {
    // Handle specific error types
    if (err.name === "AbortError") {
      return res.status(502).json({
        error: "The AI took too long to respond. Please try again with a shorter input.",
      });
    }

    // Log the error for debugging (this stays on the server, never sent to client)
    console.error("Unexpected server error:", err);
    return res.status(502).json({
      error: "Something went wrong while contacting the AI service. Please try again.",
    });
  }
}
