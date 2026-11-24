/**
 * script.js – StudyMate Frontend Logic
 * Rebuilt for Stitch Monochrome Academic Utility Design System
 * 
 * Features:
 * - 4 Stitch-mapped views: Home (Dashboard), Summarizer, Question Explainer, Study Chatbot
 * - In-browser PDF/TXT text extraction via pdf.js
 * - Safe Markdown rendering via marked & DOMPurify
 * - Single DRY API call (askAI -> /api/chat proxy to Gemini)
 * - Full Dark/Light mode with local persistence
 * - Mobile responsive drawer navigation (down to 375px)
 */

// ─── pdf.js Worker Configuration ───────────────────────────────────
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

// ─── Constants ─────────────────────────────────────────────────────
const MAX_FILE_SIZE = 10 * 1024 * 1024;  // 10 MB in bytes
const MAX_PDF_PAGES = 50;
const CHAR_LIMIT_SUMMARIZE = 30000;
const CHAR_LIMIT_DEFAULT = 8000;

// ─── Chat History ──────────────────────────────────────────────────
let chatHistory = [];

// ─── DOM References Helper ─────────────────────────────────────────
const $ = (id) => document.getElementById(id);

// Theme & Navigation
const themeToggle = $("themeToggle");
const sidebar = $("sidebar");
const mobileMenuBtn = $("mobileMenuBtn");
const closeSidebarBtn = $("closeSidebarBtn");
const sidebarOverlay = $("sidebarOverlay");
const newChatSidebarBtn = $("newChatSidebarBtn");

// Home Elements
const studyQueryInput = $("study-query-input");
const sendPromptBtn = $("send-prompt-btn");

// Summarizer Elements
const fileDropZone = $("fileDropZone");
const fileInput = $("fileInput");
const fileInfo = $("fileInfo");
const fileName = $("fileName");
const filePages = $("filePages");
const fileClear = $("fileClear");
const fileStatus = $("fileStatus");
const summarizeInput = $("summarizeInput");
const summarizeCharCount = $("summarizeCharCount");
const summaryStyle = $("summaryStyle");
const summarizeBtn = $("summarizeBtn");
const summarizeOutput = $("summarizeOutput");
const summarizeContent = $("summarizeContent");
const summarizeEmpty = $("summarizeEmpty");
const sampleBtn = $("sampleBtn");
const sourceTitle = $("sourceTitle");
const saveNotebookBtn = $("saveNotebookBtn");
const clearBtn = $("clearBtn");

// Question Explainer Elements
const explainInput = $("explainInput");
const explainCharCount = $("explainCharCount");
const explainLevel = $("explainLevel");
const explainSubject = $("explainSubject");
const explainBtn = $("explainBtn");
const explainOutput = $("explainOutput");
const explainContent = $("explainContent");
const explainEmpty = $("explainEmpty");
const followUpInput = $("follow-up-input");
const sendFollowUpBtn = $("sendFollowUpBtn");

// Chatbot Elements
const chatMessages = $("chatMessages");
const chatEmpty = $("chatEmpty");
const chatInput = $("chatInput");
const chatCharCount = $("chatCharCount");
const chatSendBtn = $("chatSendBtn");
const chatClearBtn = $("chatClearBtn");
const exportChatBtn = $("exportChatBtn");
const webSearchToggle = $("webSearchToggle");

// ═══════════════════════════════════════════════════════════════════
// SECTION 1: THEME (DARK / LIGHT MODE)
// ═══════════════════════════════════════════════════════════════════

function initTheme() {
  const savedTheme = localStorage.getItem("studymate-theme");
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = savedTheme === "dark" || (!savedTheme && prefersDark);

  if (isDark) {
    document.documentElement.classList.add("dark");
    document.body.classList.add("dark");
    if (themeToggle) {
      const icon = themeToggle.querySelector(".theme-icon");
      if (icon) icon.textContent = "☀️";
    }
  } else {
    document.documentElement.classList.remove("dark");
    document.body.classList.remove("dark");
    if (themeToggle) {
      const icon = themeToggle.querySelector(".theme-icon");
      if (icon) icon.textContent = "🌙";
    }
  }
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    document.documentElement.classList.toggle("dark", isDark);
    const icon = themeToggle.querySelector(".theme-icon");
    if (icon) icon.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("studymate-theme", isDark ? "dark" : "light");
  });
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 2: NAVIGATION & TAB SWITCHING
// ═══════════════════════════════════════════════════════════════════

/**
 * Switches the active screen to the requested tab
 * @param {"home"|"summarizer"|"explainer"|"chatbot"} tabName
 */
function switchTab(tabName) {
  // Update nav buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const isActive = btn.dataset.tab === tabName;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");

    if (isActive) {
      btn.classList.add("bg-surface-container", "dark:bg-[#2c2c2c]", "text-on-surface", "dark:text-white", "font-semibold");
      btn.classList.remove("text-on-surface-variant", "dark:text-[#a0a0a0]");
    } else {
      btn.classList.remove("bg-surface-container", "dark:bg-[#2c2c2c]", "text-on-surface", "dark:text-white", "font-semibold");
      btn.classList.add("text-on-surface-variant", "dark:text-[#a0a0a0]");
    }
  });

  // Switch panels
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    const match = panel.id === `tab-${tabName}`;
    panel.classList.toggle("active", match);
    panel.classList.toggle("hidden", !match);
  });

  // Close mobile sidebar if open
  closeMobileSidebar();

  // Scroll to top or stream bottom
  if (tabName === "chatbot" && chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// Attach event listeners to all navigation buttons
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.tab) {
      switchTab(btn.dataset.tab);
    }
  });
});

// Mobile menu opening / closing
function openMobileSidebar() {
  if (sidebar) sidebar.classList.add("open");
  if (sidebarOverlay) sidebarOverlay.classList.remove("hidden");
}

function closeMobileSidebar() {
  if (sidebar) sidebar.classList.remove("open");
  if (sidebarOverlay) sidebarOverlay.classList.add("hidden");
}

if (mobileMenuBtn) mobileMenuBtn.addEventListener("click", openMobileSidebar);
if (closeSidebarBtn) closeSidebarBtn.addEventListener("click", closeMobileSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeMobileSidebar);

// New study chat sidebar button
if (newChatSidebarBtn) {
  newChatSidebarBtn.addEventListener("click", () => {
    switchTab("chatbot");
    if (chatInput) chatInput.focus();
  });
}

// Global ⌘K / Ctrl+K keyboard shortcut to open chat
window.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    switchTab("chatbot");
    if (chatInput) chatInput.focus();
  }
});

// ═══════════════════════════════════════════════════════════════════
// SECTION 3: HOME DASHBOARD INTERACTIONS
// ═══════════════════════════════════════════════════════════════════

// Home quick prompt input
function handleHomePromptSend() {
  if (!studyQueryInput) return;
  const q = studyQueryInput.value.trim();
  if (!q) {
    studyQueryInput.focus();
    return;
  }
  studyQueryInput.value = "";
  switchTab("chatbot");
  if (chatInput) {
    chatInput.value = q;
    updateCharCount(chatInput, chatCharCount, CHAR_LIMIT_DEFAULT);
    sendChatMessage();
  }
}

if (sendPromptBtn) {
  sendPromptBtn.addEventListener("click", handleHomePromptSend);
}

if (studyQueryInput) {
  studyQueryInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleHomePromptSend();
    }
  });
}

// Quick context chips on Home
document.querySelectorAll(".quick-chip-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const prompt = btn.dataset.prompt;
    if (studyQueryInput) {
      studyQueryInput.value = prompt;
      studyQueryInput.focus();
    }
  });
});

// Recent notebook buttons
document.querySelectorAll(".recent-notebook-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const prompt = btn.dataset.prompt;
    switchTab("chatbot");
    if (chatInput) {
      chatInput.value = prompt;
      updateCharCount(chatInput, chatCharCount, CHAR_LIMIT_DEFAULT);
      sendChatMessage();
    }
  });
});

function openSampleStudy(topic) {
  switchTab("explainer");
  if (explainInput) {
    explainInput.value = `Explain ${topic} in detail with step-by-step logic and intuition.`;
    updateCharCount(explainInput, explainCharCount, CHAR_LIMIT_DEFAULT);
    explainBtn.click();
  }
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 4: CHARACTER COUNTING
// ═══════════════════════════════════════════════════════════════════

function updateCharCount(input, display, limit) {
  if (!input || !display) return;
  const len = input.value.length;
  display.textContent = `${len.toLocaleString()} / ${limit.toLocaleString()} characters`;
  display.classList.toggle("over-limit", len > limit);
}

if (summarizeInput && summarizeCharCount) {
  summarizeInput.addEventListener("input", () =>
    updateCharCount(summarizeInput, summarizeCharCount, CHAR_LIMIT_SUMMARIZE)
  );
}
if (explainInput && explainCharCount) {
  explainInput.addEventListener("input", () =>
    updateCharCount(explainInput, explainCharCount, CHAR_LIMIT_DEFAULT)
  );
}
if (chatInput && chatCharCount) {
  chatInput.addEventListener("input", () =>
    updateCharCount(chatInput, chatCharCount, CHAR_LIMIT_DEFAULT)
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 5: FILE UPLOAD & PDF TEXT EXTRACTION
// ═══════════════════════════════════════════════════════════════════

if (fileDropZone && fileInput) {
  fileDropZone.addEventListener("click", () => fileInput.click());
  fileDropZone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  fileDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    fileDropZone.classList.add("drag-over");
  });

  fileDropZone.addEventListener("dragleave", () => {
    fileDropZone.classList.remove("drag-over");
  });

  fileDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    fileDropZone.classList.remove("drag-over");
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });
}

if (fileClear) {
  fileClear.addEventListener("click", () => {
    if (fileInput) fileInput.value = "";
    if (fileInfo) fileInfo.hidden = true;
    if (fileStatus) fileStatus.hidden = true;
    if (fileName) fileName.textContent = "";
    if (filePages) filePages.textContent = "";
  });
}

async function handleFile(file) {
  hideFileStatus();
  if (fileInfo) fileInfo.hidden = true;

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isTxt = file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt") || file.name.toLowerCase().endsWith(".md");

  if (!isPdf && !isTxt) {
    showFileStatus("Only .pdf, .txt, and .md files are supported.", "error");
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    showFileStatus(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 10 MB.`, "error");
    return;
  }

  if (isTxt) {
    showFileStatus("Reading text file...", "loading");
    try {
      const text = await file.text();
      summarizeInput.value = text;
      updateCharCount(summarizeInput, summarizeCharCount, CHAR_LIMIT_SUMMARIZE);

      if (fileName) fileName.textContent = file.name;
      if (filePages) filePages.textContent = "(text file)";
      if (fileInfo) fileInfo.hidden = false;
      if (sourceTitle) sourceTitle.textContent = `Source Input: ${file.name}`;

      if (text.length > CHAR_LIMIT_SUMMARIZE) {
        summarizeInput.value = text.substring(0, CHAR_LIMIT_SUMMARIZE);
        updateCharCount(summarizeInput, summarizeCharCount, CHAR_LIMIT_SUMMARIZE);
        showFileStatus(`Text truncated to ${CHAR_LIMIT_SUMMARIZE.toLocaleString()} chars.`, "warning");
      } else {
        showFileStatus("File loaded successfully!", "success");
        setTimeout(() => hideFileStatus(), 3000);
      }
    } catch {
      showFileStatus("Failed to read file.", "error");
    }
    return;
  }

  showFileStatus("Extracting text from PDF via pdf.js... ⏳", "loading");
  try {
    const { text, pageCount } = await extractTextFromPdf(file);

    if (fileName) fileName.textContent = file.name;
    if (filePages) filePages.textContent = `(${pageCount} page${pageCount !== 1 ? "s" : ""})`;
    if (fileInfo) fileInfo.hidden = false;
    if (sourceTitle) sourceTitle.textContent = `Source Input: ${file.name}`;

    if (text.length < 50) {
      showFileStatus("This PDF appears scanned or image-based. Please use a text-based PDF.", "error");
      return;
    }

    if (text.length > CHAR_LIMIT_SUMMARIZE) {
      summarizeInput.value = text.substring(0, CHAR_LIMIT_SUMMARIZE);
      showFileStatus(`PDF text truncated to ${CHAR_LIMIT_SUMMARIZE.toLocaleString()} characters.`, "warning");
    } else {
      summarizeInput.value = text;
      showFileStatus("PDF text extracted successfully!", "success");
      setTimeout(() => hideFileStatus(), 4000);
    }
    updateCharCount(summarizeInput, summarizeCharCount, CHAR_LIMIT_SUMMARIZE);
  } catch (err) {
    showFileStatus(err.message || "Could not read this PDF.", "error");
  }
}

async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageCount = pdf.numPages;

  if (pageCount > MAX_PDF_PAGES) {
    throw new Error(`PDF has ${pageCount} pages (limit is ${MAX_PDF_PAGES}).`);
  }

  const pageTexts = [];
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    pageTexts.push(pageText);
  }
  return { text: pageTexts.join("\n\n"), pageCount };
}

function showFileStatus(message, type) {
  if (!fileStatus) return;
  fileStatus.textContent = message;
  fileStatus.className = `status-msg ${type}`;
  fileStatus.hidden = false;
}

function hideFileStatus() {
  if (fileStatus) fileStatus.hidden = true;
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 6: API CALL & SAFE MARKDOWN
// ═══════════════════════════════════════════════════════════════════

async function askAI(mode, messages) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, messages }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed. Please try again.");
  }
  return data.reply;
}

function renderMarkdown(markdown) {
  const rawHtml = marked.parse(markdown);
  return DOMPurify.sanitize(rawHtml);
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 7: COPY BUTTON & LOADING HELPERS
// ═══════════════════════════════════════════════════════════════════

document.addEventListener("click", async (e) => {
  const copyBtn = e.target.closest(".copy-btn");
  if (!copyBtn) return;

  const targetId = copyBtn.dataset.target;
  let textToCopy = "";

  if (targetId) {
    const targetEl = $(targetId);
    if (targetEl) textToCopy = targetEl.innerText;
  } else {
    const contentDiv = copyBtn.closest(".chat-bubble")?.querySelector(".output-content");
    if (contentDiv) textToCopy = contentDiv.innerText;
  }

  if (!textToCopy) return;

  try {
    await navigator.clipboard.writeText(textToCopy);
    const originalText = copyBtn.innerHTML;
    copyBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">check</span><span>Copied!</span>';
    setTimeout(() => { copyBtn.innerHTML = originalText; }, 2000);
  } catch {
    copyBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">error</span><span>Failed</span>';
    setTimeout(() => { copyBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">content_copy</span><span>Copy</span>'; }, 2000);
  }
});

function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  const text = btn.querySelector(".btn-text");
  const loader = btn.querySelector(".btn-loader");
  if (text) text.classList.toggle("hidden", loading);
  if (loader) loader.classList.toggle("hidden", !loading);
}

function showOutputError(contentEl, outputEl, emptyEl, message) {
  if (!contentEl || !outputEl) return;
  contentEl.innerHTML = "";
  const errorDiv = document.createElement("div");
  errorDiv.className = "status-msg error";
  errorDiv.textContent = message;
  contentEl.appendChild(errorDiv);
  outputEl.hidden = false;
  if (emptyEl) emptyEl.hidden = true;
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 8: SUMMARIZER LOGIC & SAMPLES
// ═══════════════════════════════════════════════════════════════════

const sampleSummaries = [
  {
    title: "CS445 Lecture 14 — Distributed Consensus (Raft)",
    text: `In distributed computing systems, achieving consensus among independent nodes in the presence of uncoordinated hardware crashes or network partitions represents a fundamental challenge. The Raft consensus protocol addresses this by decomposing state machine replication into distinct, mutually intelligible subproblems: Leader Election, Log Replication, and Safety invariants.\n\nUnlike Paxos, which presents notorious difficulty in practical implementation due to symmetric node responsibilities, Raft designates a singular leader elected through randomized election timeouts. During active operations, all client mutations must flow exclusively via the leader, which sequences entries into an append-only log, disseminates heartbeats through AppendEntries RPCs, and tracks replication across a strict majority quorum before committing states.\n\nCrucially, the Raft Safety property guarantees that if any server commits a log entry at a given index, no other server will ever commit a different entry for that exact index, thereby preventing split-brain divergence across transient network isolations.`
  },
  {
    title: "Cognitive Psychology — Multi-Component Working Memory",
    text: `Working memory capacity represents a central construct in cognitive psychology, describing the computational workspace required to simultaneously maintain, manipulate, and update task-relevant information. The seminal multi-component model by Baddeley and Hitch replaced the archaic concept of a unitary short-term memory store with three modular components: the Central Executive, the Phonological Loop, and the Visuospatial Sketchpad, later supplemented by the Episodic Buffer.\n\nNeuroimaging studies consistently implicate bilateral dorsolateral prefrontal cortex (dlPFC) alongside posterior parietal networks during dual-task and n-back paradigms. Individual variances in working memory capacity predict higher-order fluid intelligence, analytical reasoning, and reading comprehension. Cognitive load theory further stipulates that intrinsic, extraneous, and germane cognitive loads directly modulate task acquisition efficiency, making task decomposition vital for pedagogical instructional design.`
  }
];

let sampleIndex = 0;
if (sampleBtn) {
  sampleBtn.addEventListener("click", () => {
    sampleIndex = (sampleIndex + 1) % sampleSummaries.length;
    const s = sampleSummaries[sampleIndex];
    if (summarizeInput) {
      summarizeInput.value = s.text;
      updateCharCount(summarizeInput, summarizeCharCount, CHAR_LIMIT_SUMMARIZE);
    }
    if (sourceTitle) {
      sourceTitle.textContent = `Source Input: ${s.title}`;
    }
  });
}

// Format button toggles
document.querySelectorAll(".format-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".format-btn").forEach((b) => {
      b.className = "format-btn flex items-center justify-center gap-space-xs py-2 px-space-sm rounded-xl font-label-lg text-label-lg transition-all text-secondary dark:text-[#999] hover:text-on-surface dark:hover:text-white hover:bg-surface-container-low dark:hover:bg-[#252525] font-medium";
    });
    btn.className = "format-btn flex items-center justify-center gap-space-xs py-2 px-space-sm rounded-xl font-label-lg text-label-lg transition-all bg-surface-container-lowest dark:bg-[#2b2b2b] text-on-surface dark:text-white shadow-sm font-semibold active";

    if (summaryStyle) {
      const fmt = btn.dataset.format;
      if (fmt === "takeaways") summaryStyle.value = "key takeaways";
      else if (fmt === "bullets") summaryStyle.value = "bullet points";
      else if (fmt === "executive") summaryStyle.value = "executive brief";
      else if (fmt === "flashcards") summaryStyle.value = "flashcards";
    }
  });
});

if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    if (summarizeInput) {
      summarizeInput.value = "";
      updateCharCount(summarizeInput, summarizeCharCount, CHAR_LIMIT_SUMMARIZE);
      summarizeInput.focus();
    }
    if (fileClear) fileClear.click();
    if (sourceTitle) sourceTitle.textContent = "Source Input: Paste study material or upload file";
  });
}

if (saveNotebookBtn) {
  saveNotebookBtn.addEventListener("click", () => {
    const orig = saveNotebookBtn.innerHTML;
    saveNotebookBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">check</span><span>Saved!</span>';
    setTimeout(() => { saveNotebookBtn.innerHTML = orig; }, 1800);
  });
}

// Generate Summary Action
if (summarizeBtn) {
  summarizeBtn.addEventListener("click", async () => {
    const text = summarizeInput.value.trim();
    if (!text) {
      showOutputError(summarizeContent, summarizeOutput, summarizeEmpty, "Please paste some study text or upload a file first.");
      return;
    }
    if (text.length > CHAR_LIMIT_SUMMARIZE) {
      showOutputError(summarizeContent, summarizeOutput, summarizeEmpty, `Text exceeds ${CHAR_LIMIT_SUMMARIZE.toLocaleString()} character limit.`);
      return;
    }

    const style = summaryStyle ? summaryStyle.value : "key takeaways";
    const prompt = `Please summarize the following study material in the style of "${style}":\n\n${text}`;

    setLoading(summarizeBtn, true);
    const procState = $("processingState");
    if (procState) procState.classList.remove("hidden");
    if (summarizeOutput) summarizeOutput.classList.add("opacity-40");

    try {
      const reply = await askAI("summarize", [{ role: "user", content: prompt }]);
      summarizeContent.innerHTML = renderMarkdown(reply);
      summarizeOutput.hidden = false;
      if (summarizeEmpty) summarizeEmpty.hidden = true;
      summarizeOutput.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      showOutputError(summarizeContent, summarizeOutput, summarizeEmpty, err.message);
    } finally {
      setLoading(summarizeBtn, false);
      if (procState) procState.classList.add("hidden");
      if (summarizeOutput) summarizeOutput.classList.remove("opacity-40");
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 9: QUESTION EXPLAINER LOGIC
// ═══════════════════════════════════════════════════════════════════

// Explainer mode tabs
document.querySelectorAll(".mode-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".mode-tab").forEach((t) => {
      t.className = "mode-tab px-3.5 py-1.5 rounded-full font-label-md text-label-md bg-surface-container-low dark:bg-[#252525] text-on-surface-variant dark:text-[#a0a0a0] hover:bg-surface-container dark:hover:bg-[#2c2c2c] transition-all";
    });
    tab.className = "mode-tab px-3.5 py-1.5 rounded-full font-label-md text-label-md bg-primary dark:bg-white text-on-primary dark:text-black transition-all active";

    if (explainLevel && tab.dataset.level) {
      explainLevel.value = tab.dataset.level;
    }
  });
});

// Sample Question button
const sampleQuestionBtn = document.querySelector(".sample-question-btn");
if (sampleQuestionBtn) {
  sampleQuestionBtn.addEventListener("click", () => {
    if (explainInput) {
      explainInput.value = "How does Dijkstra's algorithm guarantee finding the shortest path in a graph with non-negative weights, and what happens if negative edges are introduced?";
      updateCharCount(explainInput, explainCharCount, CHAR_LIMIT_DEFAULT);
      if (explainSubject) explainSubject.value = "Computer Science / Algorithms";
    }
  });
}

// Explain Question Action
if (explainBtn) {
  explainBtn.addEventListener("click", async () => {
    const question = explainInput.value.trim();
    if (!question) {
      showOutputError(explainContent, explainOutput, explainEmpty, "Please enter an academic question first.");
      return;
    }
    if (question.length > CHAR_LIMIT_DEFAULT) {
      showOutputError(explainContent, explainOutput, explainEmpty, `Question exceeds ${CHAR_LIMIT_DEFAULT.toLocaleString()} character limit.`);
      return;
    }

    const level = explainLevel ? explainLevel.value : "detailed";
    const subject = explainSubject ? explainSubject.value.trim() : "";
    let prompt = `Explain this at a "${level}" level:\n\n${question}`;
    if (subject) {
      prompt += `\n\nSubject domain: ${subject}`;
    }

    setLoading(explainBtn, true);
    try {
      const reply = await askAI("explain", [{ role: "user", content: prompt }]);
      explainContent.innerHTML = renderMarkdown(reply);
      explainOutput.hidden = false;
      if (explainEmpty) explainEmpty.hidden = true;
      explainOutput.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      showOutputError(explainContent, explainOutput, explainEmpty, err.message);
    } finally {
      setLoading(explainBtn, false);
    }
  });
}

// Follow-up input on explanation
if (sendFollowUpBtn && followUpInput) {
  sendFollowUpBtn.addEventListener("click", () => {
    const q = followUpInput.value.trim();
    if (!q) return;
    followUpInput.value = "";
    switchTab("chatbot");
    if (chatInput) {
      chatInput.value = q;
      updateCharCount(chatInput, chatCharCount, CHAR_LIMIT_DEFAULT);
      sendChatMessage();
    }
  });

  followUpInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendFollowUpBtn.click();
    }
  });
}

function askConceptInChat(conceptPrompt) {
  switchTab("chatbot");
  if (chatInput) {
    chatInput.value = conceptPrompt;
    updateCharCount(chatInput, chatCharCount, CHAR_LIMIT_DEFAULT);
    sendChatMessage();
  }
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 10: STUDY CHATBOT LOGIC
// ═══════════════════════════════════════════════════════════════════

async function sendChatMessage() {
  if (!chatInput) return;
  const text = chatInput.value.trim();
  if (!text) return;

  if (text.length > CHAR_LIMIT_DEFAULT) {
    showChatError(`Message exceeds limit (${CHAR_LIMIT_DEFAULT.toLocaleString()} chars).`);
    return;
  }

  if (chatEmpty) chatEmpty.hidden = true;

  // Append user message
  chatHistory.push({ role: "user", content: text });
  addChatBubble(text, "user");
  chatInput.value = "";
  updateCharCount(chatInput, chatCharCount, CHAR_LIMIT_DEFAULT);

  setLoading(chatSendBtn, true);
  try {
    const reply = await askAI("chat", chatHistory);
    chatHistory.push({ role: "assistant", content: reply });
    addChatBubble(reply, "ai");
  } catch (err) {
    addChatBubble(`⚠️ ${err.message}`, "ai", true);
  } finally {
    setLoading(chatSendBtn, false);
  }
}

if (chatSendBtn) {
  chatSendBtn.addEventListener("click", (e) => {
    e.preventDefault();
    sendChatMessage();
  });
}

if (chatInput) {
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
}

function addChatBubble(text, sender, isError = false) {
  if (!chatMessages) return;
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${sender}`;

  if (sender === "user") {
    const inner = document.createElement("div");
    inner.textContent = text;
    bubble.appendChild(inner);
  } else if (isError) {
    const inner = document.createElement("div");
    inner.className = "output-content text-error";
    inner.textContent = text;
    bubble.appendChild(inner);
  } else {
    const contentDiv = document.createElement("div");
    contentDiv.className = "output-content";
    contentDiv.innerHTML = renderMarkdown(text);

    const actionRow = document.createElement("div");
    actionRow.className = "flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/40";

    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.innerHTML = '<span class="material-symbols-outlined text-[14px]">content_copy</span><span>Copy</span>';

    actionRow.appendChild(copyBtn);
    bubble.appendChild(contentDiv);
    bubble.appendChild(actionRow);
  }

  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showChatError(message) {
  if (chatHistory.length === 0 && chatEmpty) {
    chatEmpty.hidden = false;
  }
  addChatBubble(`⚠️ ${message}`, "ai", true);
}

// Clear Chat Action
if (chatClearBtn) {
  chatClearBtn.addEventListener("click", () => {
    chatHistory = [];
    if (chatMessages) {
      const bubbles = chatMessages.querySelectorAll(".chat-bubble");
      bubbles.forEach((b) => b.remove());
    }
    if (chatEmpty) chatEmpty.hidden = false;
  });
}

// Export Chat Action
if (exportChatBtn) {
  exportChatBtn.addEventListener("click", () => {
    if (chatHistory.length === 0) {
      alert("No conversation to export yet!");
      return;
    }
    let transcript = "# StudyMate AI — Session Transcript\n\n";
    chatHistory.forEach((msg) => {
      const speaker = msg.role === "user" ? "## Student" : "## StudyMate AI";
      transcript += `${speaker}\n\n${msg.content}\n\n---\n\n`;
    });
    const blob = new Blob([transcript], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `StudyMate-Session-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

// Academic Web search toggle button
if (webSearchToggle) {
  let webActive = true;
  webSearchToggle.addEventListener("click", () => {
    webActive = !webActive;
    webSearchToggle.classList.toggle("bg-primary", webActive);
    webSearchToggle.classList.toggle("text-on-primary", webActive);
    webSearchToggle.classList.toggle("dark:bg-white", webActive);
    webSearchToggle.classList.toggle("dark:text-black", webActive);
  });
}

// Suggestion chips in Chatbot
document.querySelectorAll(".chat-suggestion-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const prompt = chip.dataset.prompt;
    if (chatInput) {
      chatInput.value = prompt;
      updateCharCount(chatInput, chatCharCount, CHAR_LIMIT_DEFAULT);
      sendChatMessage();
    }
  });
});

// Keyboard shortcut: ⌘+Enter to submit in summarizer or explainer
window.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    const activePanel = document.querySelector(".tab-panel.active");
    if (activePanel) {
      if (activePanel.id === "tab-summarizer" && summarizeBtn) {
        e.preventDefault();
        summarizeBtn.click();
      } else if (activePanel.id === "tab-explainer" && explainBtn) {
        e.preventDefault();
        explainBtn.click();
      }
    }
  }
});

// ═══════════════════════════════════════════════════════════════════
// SECTION 11: INITIALISATION
// ═══════════════════════════════════════════════════════════════════

initTheme();
updateCharCount(summarizeInput, summarizeCharCount, CHAR_LIMIT_SUMMARIZE);
updateCharCount(explainInput, explainCharCount, CHAR_LIMIT_DEFAULT);
updateCharCount(chatInput, chatCharCount, CHAR_LIMIT_DEFAULT);

// Default to Home screen
switchTab("home");
