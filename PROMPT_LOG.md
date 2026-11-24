# PROMPT_LOG.md – StudyMate Prompt Engineering Log

## Tool Contribution Table

| Tool / Service   | Role in Project                                                             |
| :--------------- | :-------------------------------------------------------------------------- |
| Google Gemini    | AI foundation model (`gemini-3.5-flash-lite`) for summaries, explanations, and doubts |
| pdf.js 3.11.174  | In-browser client-side text extraction from PDF lecture notes               |
| marked 9.1.6     | Client-side Markdown rendering for rich educational content formatting      |
| DOMPurify 3.0.6  | HTML sanitization to prevent XSS attacks before inserting into the DOM      |
| Vercel Serverless| Node.js 18+ serverless edge execution proxying requests securely to Gemini |

---

## Initial Prompt Breakdown

The original prompt is archived in [`prompts/initial_prompt.txt`](file:///d:/StudyMate/prompts/initial_prompt.txt).
- **Core Persona:** Senior Full-Stack Engineer and UI/UX Designer writing viva-defendable code for B.Tech students.
- **Features Required:**
  1. *Summarizer:* Notes input (pasted, `.txt`, or `.pdf` via `pdf.js`), 3 distinct styles, formatted Markdown output.
  2. *Question Explainer:* Academic question, 3 depth levels (Simple / Detailed / Exam-style), optional subject context, step-by-step with worked examples.
  3. *Study Chatbot:* Session-persistent chat history, follow-up doubt clearing, polite refusal of off-topic questions.
- **Constraints:** Vanilla JS frontend (no build step, no React), single serverless endpoint `api/chat.js`, pinned cdnjs libraries, zero hardcoded replies, API key hidden exclusively in `process.env.GEMINI_API_KEY`.

---

## Prompt Iterations

| # | Feature / Mode | Iteration / Change Made | Technical & Educational Reason |
| :- | :--- | :--- | :--- |
| 1 | Summarizer | Added strict rule: *"NEVER add information that is not present in original text"*. | Prevents AI hallucination when summarizing engineering formulas and definitions. |
| 2 | Summarizer | Mandated output structure: Heading → Summary → Exactly 3 Takeaways prefixed with 🔑. | Guarantees consistent revision structure for students preparing for semester exams. |
| 3 | Explainer | Structured into 4 distinct phases: Definition → Step-by-Step → Worked Example → Common Mistakes. | Mirrors academic viva and university exam scoring rubrics. |
| 4 | Chatbot | Added refusal clause: Polite redirection when non-study questions (e.g. pizza recipes) are asked. | Keeps the campus tool strictly bounded to educational assistance. |
| 5 | Model Configuration | Updated default model constant to `gemini-3.5-flash-lite`. | Google AI Studio deprecated `gemini-2.5-flash` for new accounts with a 404 response. |
| 6 | Prompt Leeway | Added `PROMPT_BUFFER_MARGIN = 250` in server-side character checking. | Prevents frontend framing wrappers (e.g. style selection prefixes) from falsely tripping the 30,000 char limit. |

---

## System Prompts per Mode

### 1. Summarizer (`mode: "summarize"`)
```text
You are an expert note-taker and academic summarizer. Your job is to help university students by condensing their study material.

Rules:
- Keep ONLY the key ideas, definitions, formulas, and important facts from the given text.
- NEVER add information that is not present in the original text.
- Use clear, simple language that a first-year B.Tech student can understand.

Output format:
1. A clear heading that describes the topic.
2. A concise summary in the requested style (short summary, bullet points, or exam revision notes).
3. Exactly 3 "Key Takeaways" at the end, each on its own line starting with "🔑".

Use Markdown formatting for headings, bold, lists, and code blocks where appropriate.
```

### 2. Question Explainer (`mode: "explain"`)
```text
You are a patient and knowledgeable university tutor. Your job is to explain academic concepts clearly to B.Tech students.

Rules:
- Always assume the student is encountering this concept for the first time.
- Use simple language, real-world analogies, and practical examples.
- If a subject is specified, tailor your explanation to that subject's context.

Output format (always follow this structure):
1. **Simple Definition** – A one-or-two sentence plain-English definition.
2. **Step-by-Step Explanation** – Break the concept down into numbered steps.
3. **Worked Example** – One concrete, fully worked-out example with calculations or code if relevant.
4. **Common Exam Mistakes** – 2-3 mistakes students often make in exams, and how to avoid them.

Use Markdown formatting for headings, bold, lists, and code blocks where appropriate.
```

### 3. Study Chatbot (`mode: "chat"`)
```text
You are a friendly and helpful study assistant called StudyMate. You help university students (especially B.Tech first and second year) with their academic doubts and study-related questions.

Rules:
- Answer ONLY academic, educational, and study-related questions.
- If a student asks something unrelated to academics or studying (like recipes, entertainment, personal advice, etc.), politely decline and redirect them back to studying. For example: "That's an interesting question, but I'm designed to help with academic topics! 📚 Feel free to ask me about any subject or concept you're studying."
- Use simple language, examples, and analogies when explaining.
- Be encouraging and supportive.
- Use Markdown formatting for headings, bold, lists, and code blocks where appropriate.
- Keep responses focused and not overly long unless the student asks for detail.
```

---

## Errors and Fixes

| # | Error Encountered | Root Cause | Solution & Fix Applied |
| :- | :--- | :--- | :--- |
| 1 | `(404) Not Found: models/gemini-2.5-flash is no longer available to new users` | Google AI Studio retired `gemini-2.5-flash` for new accounts in favor of 3.x series models. | Updated `MODEL` constant to `gemini-3.5-flash-lite`, which is active, supported, and fast. |
| 2 | `UND_ERR_CONNECT_TIMEOUT` on Windows during API calls | Undici fetch on Windows occasionally stalls attempting IPv6 addresses for Google APIs. | Added `dns.setDefaultResultOrder('ipv4first')` in `api/chat.js` and `dev-server.js`. |
| 3 | Input over character limit rejection on 30,000 char notes | The frontend prepends `Please summarize the following text in the style of "..."`, pushing length to 30,050 chars. | Added `PROMPT_BUFFER_MARGIN = 250` server-side so student input up to 30,000 chars is accepted cleanly. |
| 4 | PDF Page limit error showed generic failure | Generic catch block in `script.js` did not differentiate page count error from corrupted files. | Added specific check for `exceeds the maximum of 50 pages` in `handleFile` to show exact page limit error. |
| 5 | Free tier quota spike (503 / 429) during rapid automated tests | Firing 7 consecutive model calls within 5 seconds triggered Gemini's per-minute free tier threshold. | Added 2.5s pacing in automated test suites and switched to `gemini-3.5-flash-lite`. |

---

## Testing Log

| # | Test Case Description | Expected Result | Actual Result | Status |
| :- | :--- | :--- | :--- | :--- |
| 1 | Non-POST HTTP request (`GET /api/chat`) | HTTP 405 Method Not Allowed | Status: 405 Method Not Allowed | **PASS** |
| 2 | Missing API key in environment | HTTP 500 with friendly message | Status: 500, friendly JSON error | **PASS** |
| 3 | Invalid mode parameter (`mode: "invalid"`) | HTTP 400 Bad Request | Status: 400 Bad Request | **PASS** |
| 4 | Empty or whitespace-only messages | HTTP 400 Bad Request | Status: 400 Bad Request | **PASS** |
| 5 | Input over 8000 characters in chat mode | HTTP 400 with character count | Status: 400 Bad Request | **PASS** |
| 6 | Summarizer with "Short summary" style | Real AI summary with 3 takeaways | Real Markdown response received | **PASS** |
| 7 | Summarizer with "Bullet points" style | Real bulleted AI summary | Real Markdown response received | **PASS** |
| 8 | Summarizer with "Exam revision notes" style | Structured exam notes with key formulas | Real Markdown response received | **PASS** |
| 9 | Question Explainer (Simple level) | Plain-English definition and steps | Real AI tutorial output received | **PASS** |
| 10| Question Explainer (Detailed level) | Deep conceptual breakdown + examples | Real AI tutorial output received | **PASS** |
| 11| Question Explainer (Exam-style level) | Rigorous exam answer + common traps | Real AI tutorial output received | **PASS** |
| 12| Chatbot conversational memory | Answers follow-up using previous turn | Follow-up referenced earlier KCL turn | **PASS** |
| 13| Chatbot off-topic rejection ("best pizza recipe?") | Polite refusal redirecting to studies | Responded redirecting to academic topics | **PASS** |
| 14| Dark/light mode theme toggle | Switches styling and persists across reloads | `localStorage` saves and restores `dark` class | **PASS** |
| 15| Markdown rendering & Sanitization | Renders HTML sanitized via DOMPurify | Sanitized through `DOMPurify.sanitize(marked.parse())` | **PASS** |
| 16| Clipboard Copy button | Copies text and provides user feedback | Copies to clipboard, toggles `✅ Copied!` | **PASS** |
| 17| PDF text extraction in browser | Extracts text without server upload | Extracted cleanly via `pdf.js` worker | **PASS** |
| 18| Scanned PDF detection (<50 chars) | Friendly error advising text-based file | Shows friendly scanned document banner | **PASS** |
| 19| File rejection for non-PDF/non-TXT (e.g. `.png`)| Friendly rejection banner | Rejection message: only .pdf and .txt | **PASS** |
| 20| PDF file size limit (>10MB) or pages (>50) | Rejection banner before processing | Enforces 10MB and 50 page boundaries | **PASS** |
