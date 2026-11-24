# StudyMate – AI-Powered Campus Study Assistant

## 📖 Description

**StudyMate** is a web-based AI study assistant designed for university students. It helps B.Tech students understand lecture material quickly by summarizing notes, explaining concepts step-by-step, and answering study doubts through an interactive chatbot — all powered by Google's Gemini AI.

## 🎯 Objectives

- Help students **condense long notes** into clear, structured summaries.
- Provide **step-by-step explanations** of academic concepts with worked examples.
- Offer an **always-available study chatbot** for quick doubt resolution.
- Demonstrate practical **Prompt Engineering** techniques using the Gemini API.

## ✨ Features

### 1. Summarizer
- Paste text or upload a **PDF/TXT** file (drag-and-drop supported).
- PDFs are processed **entirely in the browser** using pdf.js — no file is uploaded to the server.
- Choose from three styles: **Short summary**, **Bullet points**, or **Exam revision notes**.
- Extracted PDF text is editable before summarizing.

### 2. Question Explainer
- Enter any academic question with a **detail level** (Simple / Detailed / Exam-style).
- Optionally specify the **subject** for more targeted explanations.
- Get a structured response: definition → explanation → worked example → common mistakes.

### 3. Study Chatbot
- Conversational AI that **remembers context** within the session.
- Supports follow-up questions for deeper understanding.
- **Politely refuses** non-academic questions and redirects to studying.
- **Clear chat** button to start fresh.

### General
- 🌙 **Dark/Light mode** toggle that persists across sessions.
- 📋 **Copy button** on every AI response.
- 📱 **Mobile-responsive** design (works on phones, tablets, and desktops).
- 🔒 **Secure**: API key never leaves the server; Markdown output is sanitized with DOMPurify.

## 🛠️ Tech Stack & AI Tools

| Layer     | Technology                                 |
|-----------|--------------------------------------------|
| Frontend  | HTML5, CSS3, Vanilla JavaScript            |
| Backend   | Vercel Serverless Function (Node.js 18+)   |
| AI Model  | Google Gemini 2.5 Flash (via REST API)     |
| PDF Parse | pdf.js 3.11.174 (CDN)                      |
| Markdown  | marked 9.1.6 (CDN)                         |
| Sanitizer | DOMPurify 3.0.6 (CDN)                      |
| Hosting   | Vercel                                     |

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      BROWSER                             │
│  ┌─────────┐  ┌───────────┐  ┌──────────┐               │
│  │Summarize│  │  Explain  │  │  Chatbot │               │
│  └────┬────┘  └─────┬─────┘  └────┬─────┘               │
│       │             │              │                     │
│       └─────────────┼──────────────┘                     │
│                     │                                    │
│              askAI(mode, messages)                        │
│                     │                                    │
│              POST /api/chat                              │
└─────────────────────┼────────────────────────────────────┘
                      │  JSON { mode, messages }
                      ▼
        ┌──────────────────────────┐
        │  Vercel Serverless Fn    │
        │      api/chat.js         │
        │                          │
        │  • Validates input       │
        │  • Selects system prompt │
        │  • Converts roles        │
        └────────────┬─────────────┘
                     │  POST (x-goog-api-key header)
                     ▼
        ┌──────────────────────────┐
        │  Google Gemini REST API  │
        │  generativelanguage      │
        │  .googleapis.com         │
        └────────────┬─────────────┘
                     │  JSON response
                     ▼
        ┌──────────────────────────┐
        │  { reply: "..." }        │──► Browser renders
        └──────────────────────────┘    as Markdown (DOMPurify)
```

## 📂 Project Structure

```
StudyMate/
├── index.html              # Single-page UI with 3 feature tabs
├── style.css               # Mobile-first responsive styles + dark mode
├── script.js               # Frontend logic, PDF extraction, API calls
├── api/
│   └── chat.js             # Vercel serverless function → Gemini API
├── package.json            # Node.js project config (type: module)
├── vercel.json             # Vercel routing configuration
├── .env.example            # API key placeholder (safe to commit)
├── .gitignore              # Excludes .env and node_modules
├── README.md               # This documentation file
├── prompts/
│   └── initial_prompt.txt  # The original prompt used to build this project
└── PROMPT_LOG.md           # Prompt engineering log and iterations
```

## 🚀 Setup & Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) version 18 or higher
- [Vercel CLI](https://vercel.com/cli): `npm install -g vercel`
- A Google Gemini API key (free tier available)

### Step 1: Get a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey).
2. Sign in with your Google account.
3. Click **"Create API key"** or **"Get API key"**.
4. Copy the generated key — you'll need it in the next step.

### Step 2: Clone and Configure

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/StudyMate.git
cd StudyMate

# Create your local environment file from the template
cp .env.example .env

# Edit .env and paste your Gemini API key
# GEMINI_API_KEY=your_actual_api_key_here
```

### Step 3: Run Locally

```bash
# Start the development server using Vercel CLI
vercel dev
```

The app will be available at `http://localhost:3000`.

> **Note:** `vercel dev` automatically reads your `.env` file and makes the variables available to the serverless function.

## ☁️ Deploying to Vercel

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: StudyMate AI study assistant"
git remote add origin https://github.com/YOUR_USERNAME/StudyMate.git
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **"Add New Project"** and import your StudyMate repository.
3. In the project settings, go to **Settings → Environment Variables**.
4. Add a new variable:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** your Gemini API key from Google AI Studio
5. Click **Deploy**.

Your app will be live at `https://your-project.vercel.app`.

> **Important:** Never commit your API key. It should only exist in your local `.env` file and in Vercel's environment variables dashboard.

## 📸 Screenshots & UI Previews

| Feature | Interface Description | Status |
| :--- | :--- | :--- |
| **Summarizer** | Dual input (pasted text & PDF/TXT dropzone), extracted page count badge, 3 style selector pills, sanitized Markdown view. | Ready for production preview |
| **Question Explainer** | Question textarea, detail level selector (Simple / Detailed / Exam-style), optional subject tag, structured 4-phase step-by-step tutorial. | Ready for production preview |
| **Study Chatbot** | Real-time message bubbles (user in indigo, AI in slate), conversational memory, off-topic question guardrails, clear chat action. | Ready for production preview |
| **Dark Mode** | High-contrast nocturnal palette (`#0b0f19`) reducing eye strain for late-night exam cramming, persistent in `localStorage`. | Verified |
| **Mobile View** | Fully responsive at 375px+ with sticky mobile navbar, touch-friendly tab pills, and full-width card layouts. | Verified |

*(Screenshots can be captured and placed in an `assets/` directory when creating pull requests or submitting final viva documentation).*

## 📄 License

This project was built as a college Prompt Engineering course project.
