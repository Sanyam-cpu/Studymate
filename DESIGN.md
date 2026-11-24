# Design System: StudyMate AI Assistant
**Project ID:** `projects/5119944438529374777`
**Design System Name:** Monochrome Academic Utility

## 1. Visual Theme & Atmosphere
The design system delivers an ultra-focused, distraction-free environment engineered for sustained academic rigor and cognitive clarity. Drawing direct inspiration from classic Swiss typographic systems and modern generative conversational tools, the visual aesthetic prioritizes pure utility, textual cadence, and quiet authority over decorative indulgence.

The style is uncompromising **Minimalism**: stark black-and-white tonal balance, generous negative space, crisp hairline dividers, and an absolute absence of chromatic noise, glossy materials, or ornamental drop shadows. The interface retreats entirely into the background, ensuring intellectual output and source material occupy complete focus.

- **Mood:** Focused, disciplined, scholarly, architectural, and distraction-free.
- **Density:** High information density with structured whitespace (modular 4px/8px rhythm).
- **Aesthetic Philosophy:** Swiss typography meets modern conversational AI workspace.

---

## 2. Color Palette & Roles
The palette is built strictly from the real Stitch project design tokens (`designTheme.namedColors` and `designMd`):

| Token | Descriptive Name | Hex Code | Functional Role |
| :--- | :--- | :--- | :--- |
| `surface-container-lowest` | Pure Canvas White | `#FFFFFF` | Primary card background, active inputs, inner containers |
| `surface-container-low` | Soft Alabaster Tint | `#F4F3F3` | Sidebar background, secondary containers, message bubbles |
| `surface-container` | Neutral Grey Inset | `#EEEEEE` | Hover state backgrounds, segmented pill bars, chip backgrounds |
| `surface-container-high` | Cool Slate Accent | `#E8E8E8` | Badges, tags, counter chips, secondary button hovers |
| `surface-container-highest`| Crisp Divider Tone | `#E2E2E2` | Borders, subtle separators, chip fills |
| `surface` | Muted Chalk Background | `#F9F9F9` | Outer workspace canvas and nested response areas |
| `background` | Canvas Light Base | `#F9F9F9` | Viewport foundation background |
| `on-surface` / `primary` | Dominant Pitch Black | `#000000` / `#171717` | Primary typography, headers, primary action buttons, active icons |
| `on-surface-variant` | Charcoal Body Text | `#444748` | Longform body copy, explanatory text, list descriptions |
| `secondary` | Neutral Medium Slate | `#5E5E5E` / `#737373` | Subheadings, metadata, timestamps, input placeholders, icon accents |
| `outline` | Structural Muted Border | `#747878` | High-contrast borders and active focus boundaries |
| `outline-variant` | Hairline Frame Border | `#C4C7C7` / `#E5E5E5` | Structural 1px card borders, rail boundaries, divider lines |
| `primary-container` | Deep Charcoal Container | `#1C1B1B` | Icon badges, dark code snippet title bars |
| `on-primary` | Inverted Pure White | `#FFFFFF` | Text and icons on primary dark buttons and containers |
| `secondary-container` | Cool Silver Surface | `#E3E2E2` | Secondary active states and accent chips |
| `error` | Academic Crimson Alert | `#BA1A1A` | Validation errors, over-limit warnings, failed requests |
| `error-container` | Soft Rose Background | `#FFDAD6` | Error banner backgrounds |
| `on-error-container` | Deep Ruby Warning | `#93000A` | High-emphasis alert copy |

### Dark Mode Mapping (`.dark`)
When dark mode is active (`darkMode: "class"`):
- Background / Canvas shifts to deep charcoal / near-black (`#121212` / `#1a1a1a`).
- Surfaces and cards shift to dark slate containers (`#1c1b1b` / `#222222`).
- Borders transition to `#333333` / `#444748`.
- Text colors invert cleanly: headers and high-emphasis labels to `#ffffff` / `#f1f1f1`, secondary copy to `#a3a3a3`.

---

## 3. Typography Rules
Typography is executed exclusively in **Inter** to ensure maximum legibility across complex document hierarchies, math formulations, and generative text responses:

- **Font Family:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Monospace Family:** `'Roboto Mono', 'Fira Code', 'Cascadia Code', monospace` (for code snippets, token counts, keyboard shortcuts)

### Type Scale (from Stitch Project Typography)
| Role | Font Size | Line Height | Letter Spacing | Weight |
| :--- | :--- | :--- | :--- | :--- |
| `display-lg` | 48px | 56px | `-0.03em` | 600 (SemiBold) |
| `display-lg-mobile`| 32px | 40px | `-0.02em` | 600 (SemiBold) |
| `headline-lg` | 28px | 36px | `-0.02em` | 600 (SemiBold) |
| `headline-md` | 22px | 28px | `-0.015em` | 600 (SemiBold) |
| `headline-sm` | 18px | 24px | `-0.01em` | 600 (SemiBold) |
| `body-lg` | 16px | 26px | `-0.005em` | 400 (Regular) |
| `body-md` | 14px | 22px | `0em` | 400 (Regular) |
| `body-sm` | 13px | 18px | `0.005em` | 400 (Regular) |
| `label-lg` | 14px | 20px | `0em` | 500 (Medium) |
| `label-md` | 12px | 16px | `0.01em` | 500 (Medium) |
| `label-sm` | 11px | 14px | `0.04em` | 600 (SemiBold) |

---

## 4. Geometry, Shapes & Corner Radii
Curvature is disciplined and architecturally restrained:
- `DEFAULT` / `sm`: `0.125rem` (2px) to `0.25rem` (4px) — crisp micro-badges and subtle insets.
- `md`: `0.375rem` (6px) — compact inputs and table cells.
- `lg`: `0.5rem` (8px) — standard buttons, code blocks, and context chips.
- `xl`: `0.75rem` (12px) — segmented button groups, message attachments, and nested cards.
- `2xl`: `1rem` (16px) — primary feature cards, input docks, and main response panels.
- `full`: `9999px` — status badges, circular icon action buttons, and segmented pills.

---

## 5. Depth, Elevation & Shadows
The design system avoids gratuitous multi-layered dropshadows and glossy blurs:
- **Hairline Boundaries:** Hierarchy is defined through 1px border lines in `outline-variant` (`#E5E5E5` / `#C4C7C7`).
- **Cards & Containers:** Flat surfaces with subtle ambient elevation: `shadow-sm` (`0 1px 2px 0 rgba(0, 0, 0, 0.05)`) expanding to `shadow-md` on hover.
- **Floating Controls (Input Bar & Docks):** Soft diffused ground shadow: `box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04)`.

---

## 6. Layout Principles
- **Sidebar Rail (`aside`):** Fixed left rail (`w-64` / 256px) on desktop (hidden on mobile/tablet `< 768px`), featuring the StudyMate logo, Beta pill, "New Study Chat" CTA (`⌘K`), navigation links, Recent Notebooks history, and user profile drawer.
- **Top Header (`header`):** Fixed top bar (`h-14` / 56px, `md:left-64 right-0`), containing mobile hamburger toggle, workspace breadcrumb, AI Model selector pill, dark mode toggle (`themeToggle`), and profile avatar.
- **Main Reading Column (`main`):** Constrained optimal reading width (`max-w-4xl mx-auto`), padded at `px-6 md:px-8 py-10`, responsive down to `375px` on mobile.

---

## 7. Stitch Screen Inventory & Mappings

### 1. Dashboard (`759633b2b0df4945b1d484ac88fd0be6`) → **Home Screen**
- **Hero Header:** "Semester Workspace Active" status pill, "Your personal AI study companion.", "Understand better. Learn faster. Study smarter."
- **Quick Prompt Input Bar:** Clean floating search-style dock with attachment button, placeholder, Return shortcut hint, and upward arrow send button.
- **Quick Prompt Chips:** "P vs NP explained", "Keynesian vs Classical", "Resonance stabilization".
- **Core Tools Triad (3-column grid):**
  1. *Summarizer Card:* Document icon, description, "Start Summarizing →" button.
  2. *Question Explainer Card:* Lightbulb icon, description, "Explain a Question →" button.
  3. *Study Chatbot Card:* Chat bubble icon, description, "Start Chatting →" primary dark button.
- **Recent Study Notebooks & Activity:** Course cards (Computer Science, Economics, Chemistry) with last updated badges and action arrows.
- **Campus Study Pulse:** Weekly focus metrics banner ("14.6 hrs synthesized", "+28% Retention Velocity" SVG trend sparkline).

### 2. Summarizer (`ef6eabe98a174140ae405db56600f3d9`) → **Summarizer Screen**
- **Header:** "Study Synthesizer • Academic Engine v3.4" subtitle, "Summarize your study material" headline.
- **Format Selector:** Segmented 4-button pill bar ("Key Takeaways", "Bullet Points", "Executive Brief", "Flashcard Deck").
- **Source Input Box:** Status pill ("Source Input: CS445 Lecture 14"), "Load Alternate Sample" button, 7-row expandable textarea (`#summarizeInput`), character counter, file upload trigger (`#fileUpload` / `#fileDropZone`), clear button, and "Generate Summary" CTA (`#summarizeBtn`).
- **Processing State:** Animated circular loader with semantic status ("Extracting semantic hierarchies and exam-critical theorems...").
- **Output Container:** Rendered Markdown output (`#summarizeContent`) with "Copy Markdown" action button and keyboard shortcuts reference (`⌘+Enter`, `⌘+C`, `⌘+S`).

### 3. Question Explainer (`3ed55da2ebcc4b0c8546a1fdd22103cb`) → **Question Explainer Screen**
- **Header:** "Concept Diagnostic & Decomposition", "Understand any question".
- **Pedagogical Mode Tabs:** "Step-by-Step Breakdown", "Explain Like I'm 5", "First Principles", "Exam Solution".
- **Question Input Box:** Multi-line question textarea (`#explainInput`), char count, clear action, Subject Domain dropdown (`#explainSubject`: Computer Science, Discrete Math, Physics, Economics, Chemistry), and "Explain Question" CTA (`#explainBtn`).
- **AI Response Section:** Verified badge, "Copy Response" button (`#copy-btn`), step-by-step numbered breakdown cards (`01`, `02`, `03`), code snippet block with copy button, mathematical proof note, and follow-up query input bar.
- **Recommended Drill-Downs:** Follow-up concept cards (e.g., "Johnson's Algorithm", "A* Search Invariant").

### 4. Study Chatbot (`5fa9052343104b38b1ff31ce5a680a5f`) → **Study Chatbot Screen**
- **Context Header:** StudyMate AI, "GPT-Academic" badge, "Clear Chat" button (`#chatClearBtn`), and Export session button.
- **Conversation Stream:** Scrollable chat feed (`#chatMessages` / `#chatStream`) with timestamp pill, user message bubbles (`bg-surface-container-low`), AI response cards with neurological avatar, formatted markdown tables, callout formulas, and citation references.
- **Chat Dock:** Floating input card with multi-line textarea (`#chatInput`), attachment button, "Academic Web" toggle button (`#webSearchToggle`), dictation button, and round dark send button (`#chatSendBtn`).
