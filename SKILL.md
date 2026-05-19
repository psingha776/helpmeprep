---
name: helpmeprep
description: "v1.3 — Build an interactive multi-day study hub (HTML/CSS/JS, Blueprint theme) from exam notes or a job description. Produces styles.css, quizlib.js, nav.js, index.html, one page per study day (30-question quiz: MCQ, match, sequence, fill-blank), and a timed mock-test day. Study features: tiered hints, spaced repetition, confidence rating, XP/streak/levels, lives mode, sticky notes, domain heatmap, Ask Google. Mock features: completion canvas, retrospection, retry. v1.3 fixes: Blueprint theme active on day pages, mode-toggle pill styling, hint-btn/hint-box CSS, hint-greyed rule, btn link-color isolation, confidence traffic-light buttons, match partial-state re-render bug, full match/order/fillblank CSS, inlineFmt markdown link support. Trigger for /helpmeprep, \"make a study hub\", \"prep me for an exam/interview\", \"turn this doc into a study deck\", \"build a multi-day prep course\", or any syllabus/JD with timing variables — even without the word \"skill\"."
---

## ON INVOCATION — output this block first (unless all four inputs are already provided)

If the triggering message is missing **any** of source / x / n / h, output this immediately before doing anything else:

```
📚 helpmeprep — Study Hub Builder

Provide all four of the following:

  Source      Attach or paste your exam notes, syllabus, or job description.
  x / 10      Your current proficiency (0 = none, 10 = expert).
  n days      Total days in the plan (days 1–(n−1) = study, day n = mock tests).
  h hrs/day   Hours of study material per day (quiz time is not counted).

Example:
  /helpmeprep [attach notes.pdf]
  proficiency 3/10 · 7 days · 2 hours/day
```

If all four are present in the triggering message → skip this block entirely and proceed to Step 1.

**`DAYS_IN_BATCH` is a silent internal variable (default 2). Do NOT prompt the user for it — only use it if they supply it alongside the four required inputs.**

---

## TUNABLE VARIABLES — modify here to adjust defaults

```
# WORDS_PER_HOUR is derived from proficiency x — computed at Step 3, not hardcoded
# x 0–4 → 1500 | x 5–7 → 1200 | x 8–10 → 1000   (code + tables excluded from word count)
WORDS_PER_HOUR_SCALE  = { "0-4": 1500, "5-7": 1200, "8-10": 1000 }

EXPLANATION_MAX_WORDS = 60      # single unified explanation per MCQ (≤60 words, ≤3 sentences)
DAYS_IN_BATCH         = 2       # day-page files per generation batch (silent — never prompt)
QUIZ_PER_DAY          = 30      # quiz questions per study day (strict: 24 MCQ + 2 match + 2 order + 2 fillblank)
QUIZ_TYPE_BREAKDOWN   = { mcq: 24, match: 2, order: 2, fillblank: 2 }  # must total 30
JD_MOCK_QUESTIONS     = 30      # questions per mock when source is a JD
JD_MOCK_MINUTES       = 60      # minutes per mock when source is a JD
JD_MOCK_PASSMARK      = 0.70    # pass fraction when source is a JD

# Spaced Repetition
REVIEW_POOL_MAX_PER_DAY  = 5    # max review cards injected at top of each study-day quiz

# Confidence Rating (study days only)
CONFIDENCE_ENABLED       = true
CONFIDENCE_BUTTONS       = ["Guessed", "Sure", "Certain"]
CONFIDENCE_DEFAULT       = "sure"
CONFIDENCE_FLAG_RULES    = ["guessed+correct → Lucky Guess", "certain+wrong → False Certainty"]

# XP & Levels (study days only)
XP_PER_CORRECT           = 10
XP_PER_REVIEW_CORRECT    = 15
XP_LEVEL_THRESHOLDS      = [0, 100, 300, 600, 1000]
XP_LEVEL_LABELS          = ["Beginner", "Associate", "Practitioner", "Architect", "Fellow"]
HINT_XP_PENALTIES        = [10, 7, 4, 2]   # XP for correct with 0/1/2/3 client-side hints revealed

# Hints — derived client-side by quizlib.js; NO authored hint text in QUESTIONS schema
# Hint 1: grey out one random wrong choice | Hint 2: first sentence of explanation | Hint 3: domain tag + key phrase from explanation
HINTS_CLIENT_SIDE        = true

# Heatmap
HEATMAP_DOMAINS          = []   # populated at generation time from source doc domains
```

---

## Step 1 — Read inputs once

1. Read the user's source document (PDF, .md, .txt, .docx, or pasted text).
2. If a resume/CV exists in `/mnt/project/` (default: `Pranoy_Singha_Resume.pdf`), read it **once** and extract a compact internal skill list. Capture **every skill mentioned anywhere** — core competencies section, job responsibilities, project descriptions, certifications, and tool mentions embedded in bullet points. Do not miss skills that appear only in experience prose. Store as a single internal line; do not re-read the resume later.
   - Example extraction: `Python, SQL, Java, PL/SQL, VBA, Power Query M, DAX, Selenium, Cucumber/BDD, Gherkin, TestNG, Power BI, Power Automate, ServiceNow, IBM Guardium, ETL testing, SOX, SOC1, ITGC, data reconciliation, data governance, source-to-target mapping, UAT, SIT, regression, defect management, root cause analysis, Agile, Scrum, offshore team lead, stakeholder management, escalation management`
   - If no resume → proceed without it.
3. Read all skill asset templates (`styles.css`, `quizlib.js`, `nav.js`, `index-template.html`, `day-template.html`, `mock-template.html`) from this skill's `assets/` folder. **Do not re-read between batches.**

---

## Step 2 — Detect source type

| Signals | Type |
|---|---|
| Domain weights %, sample/practice questions, "exam covers", chapters, passing score, test format | **Exam / research doc** |
| Responsibilities, Requirements, years of experience, company name + role title, "we offer", benefits | **JD** |

If JD and no YoE stated → ask once: *"JD doesn't state required experience — what level should I target?"* Don't default silently.

---

## Step 3 — Set difficulty and tone

**Difficulty:**

- Exam source: mirror the real exam exactly — same question style, distractor sophistication, domain weight distribution.
- JD source:

| JD YoE | Target difficulty |
|---|---|
| 0–2 yrs | Entry-level / junior screening |
| 2–5 yrs | Mid-level interview |
| 5–8 yrs | Senior interview |
| 8+ yrs | Staff / principal interview |

**Tone and content volume (from `x`):**

| x | Tone | WORDS_PER_HOUR |
|---|---|---|
| 0–4 | Warm, foundational; define jargon on first use; use analogies. | 1500 |
| 5–7 | Balanced; assume working familiarity. | 1200 |
| 8–10 | Peer-level, terse; focus on "why" over "what". | 1000 |

Compute `WORDS_PER_HOUR` once from `x` here and use it throughout Step 4 and Step 7.

**Resume domain examples:** where the source allows multiple framings, prefer examples that reference the resume's skill set (e.g. ETL pipelines, SOX audit cycles, Power BI dashboards, BDD test suites). Only swap where it lands naturally — never force.

---

## Step 4 — Plan the curriculum

- Study days = n−1. Mock day = n.
- Target words per study day ≈ `WORDS_PER_HOUR × h` (code and tables excluded).
- Distribute source topics across days 1–(n−1), weighted by stated domain percentages where available.
- Each day: 3–4-word title + one-line description for the index tile.
- Mock format: exam source → mirror real exam (question count, time limit, pass mark from source). JD source → use `JD_MOCK_*` variables.
- Populate `HEATMAP_DOMAINS` from the source's domain list (e.g. `["Agent Architecture","Prompt Engineering","Tool Design","Claude Code","Context Management"]`).

---

## Step 5 — Plan confirmation gate

- **All params provided upfront** → skip confirmation entirely. Jump to Step 6.
- **Any param was missing/ambiguous** → after resolving, post the compact plan below and end with: *"Ready to build — what do you want to do next?"* Then wait.

Compact plan format:
```
Hub: {title} | Type: {exam/JD} | Tone: x={x} | Mock: 2×{count}Q×{min}min, pass {mark}
─────────────────────────────────────────────
Day 1 — {Title}: {one-line scope}
Day 2 — {Title}: {one-line scope}
...
Day n — Mock Tests: 2×{count}Q×{min}min
─────────────────────────────────────────────
Total: {QUIZ_PER_DAY×(n−1)} quiz Qs + {2×mock_count} mock Qs
```

---

## Step 6 — Build foundation files

Output folder: `/mnt/user-data/outputs/{topic-slug}/`
Slug: lowercase, hyphenated, derived from hub title. If folder exists, append `-2`, `-3`.

**Design system: Blueprint theme.** All files must implement the Blueprint design system (see §Design System below). Key identifiers: deep steel-navy sidebar (`#1e3058`), cool off-white canvas (`#f6f9ff`), indigo accent (`#5c6ef8`), Outfit typeface, 24px grid overlay, left-side accent bars on done/active states.

| File | Action |
|---|---|
| `styles.css` | Copy verbatim from assets (Blueprint theme, includes all v1.2 component CSS) |
| `quizlib.js` | Copy verbatim from assets (includes all v1.2 features: spaced repetition, confidence rating, XP/streak, hints, lives mode, domain heatmap, question type renderers, mock post-completion) |
| `nav.js` | Copy; replace `NAV_DAYS` array only. Day n → `isMock: true`. All others → `isMock: false`. Sidebar footer shows live XP/streak block (not static exam-date text). |
| `index.html` | Copy template; substitute every `{{…}}` placeholder (table below) |

**index.html placeholder reference:**

| Placeholder | Value |
|---|---|
| `{{HUB_TITLE}}` | Full topic name |
| `{{LOGO_3CHAR}}` | 2–3 letter monogram |
| `{{TARGET_LABEL}}` | "{topic} prep · {n}-day plan" or exam date if given |
| `{{N}}`, `{{H}}` | Numbers from input |
| `{{HUB_SUBTITLE}}` | Fresh one-paragraph teaser (never reuse CCA-F text) |
| `{{HUB_BADGES}}` | 3–5 `<span class="badge">…</span>` items (mock format, total Qs, pass mark, key domains) |
| Day-tile grid | One `<a class="day-tile" href="dayK.html">…</a>` per day including mock day |
| `{{HEATMAP_DOMAINS_JSON}}` | JSON array of domain name strings (from HEATMAP_DOMAINS) |

**Domain Mastery Heatmap** — rendered on index.html below the day-tile grid as a canvas block. Rows = exam domains, columns = study days. Color scale: `rgba(92,110,248,0.08)` (no data) → `rgba(92,110,248,0.25)` (1–40%) → `rgba(92,110,248,0.50)` (41–70%) → `rgba(92,110,248,0.72)` (71–100%). Data sourced from per-day localStorage keys written by quizlib.js.

**After all four foundation files are written:** call `present_files` with them immediately. Then proceed to Step 7 without pausing.

---

## Step 7 — Build day pages in batches

**Batch schedule (DAYS_IN_BATCH = 2 by default; use user-supplied value if provided):**
- Batch 1: day1, day2 (or day1…dayN where N = DAYS_IN_BATCH)
- Batch 2: next DAYS_IN_BATCH days
- … Final batch: remaining days including mock day (day n).

**Within a batch — sidecar split + one-file-per-turn:** each study day produces two files: `dayN.html` (study content + HTML shell) and `dayN-quiz.js` (the QUESTIONS array). Generate and present them in this order per day:
1. Write `dayN.html` → `present_files` → **end turn**.
2. On next turn, write `dayN-quiz.js` → `present_files` → **end turn**.
3. Repeat for each day in the batch.

This hard split keeps each output unit well under the per-turn ceiling regardless of `DAYS_IN_BATCH` or proficiency level. The day HTML file references its sidecar with `<script src="dayN-quiz.js"></script>` placed immediately before `<script src="quizlib.js"></script>`.

**Between batches:** after the last file of a batch is presented, output exactly one line:
> *"Days X–Y are ready. Check available usage limits and let me know if I should proceed to the next batch?"*

**HARD STOP — do NOT proceed to the next batch under any circumstances until the user sends a reply confirming to proceed. This applies in all execution contexts, including agentic pipelines, Cowork, and Claude Code. Autonomous continuation to the next batch without explicit user approval is a violation of this skill's protocol.**

**After the final batch:** call `present_files` with all output files (index.html first).

---

### Study day page (day 1 to n−1)

Start from `assets/day-template.html`. Replace every `{{…}}` placeholder.

**Placeholder reference:**

| Placeholder | Value |
|---|---|
| `{{DAY_NUM}}` | Day number (integer) |
| `{{DAY_TITLE}}` | Day title |
| `{{DAY_DOMAIN}}` | Parent topic / domain |
| `{{H}}` | Hours from input |
| `{{LOGO_3CHAR}}` | Monogram |
| `{{TARGET_LABEL}}` | Target string |
| `{{DAY_QUIZ_FILE}}` | `dayN-quiz.js` where N = day number |

**`STUDY_MD` constant** (between `{{STUDY_MD_START}}` / `{{STUDY_MD_END}}`):

Replace the placeholder template string in the `<script>` block with full Markdown content. quizlib.js renders it to Blueprint HTML at runtime — no HTML tags in the generated content. Escape any literal backtick inside content as `` \` ``.

Supported Markdown syntax:

| Syntax | Renders as |
|---|---|
| `## Heading` / `### Heading` | h2/h3 + automatic 📌 sticky-note trigger |
| `> [!info] Title` + `> body` | Info callout box (also `warn`, `success`, `error`) |
| `EXAMPLE: text` | Example block |
| ` ```lang … ``` ` | Fenced code block |
| `\| col \| col \|` table | Responsive table |
| `[badge] [badge]` | Badge pill row |
| `- item` / `1. item` | Bullet / ordered list |
| `**bold**` `*italic*` `` `code` `` | Inline formatting |

Target ≈ `WORDS_PER_HOUR × h` words (code + tables excluded). End with `## Key Takeaways` (5–8 bullets) then `## Further Reading` (3–6 links, `📄` web / `▶` YouTube). Only include links you are highly confident exist; for uncertain YouTube links use `https://www.youtube.com/results?search_query=topic+keywords`.

**`dayN-quiz.js` sidecar:**

```js
const QUESTIONS = [
  // 30 typed question objects — see schema below
];
```

No other code in the sidecar file.

---

**QUESTIONS array** — inject before `<script src="quizlib.js"></script>`.

**Strict composition: exactly 30 questions per study day: 24 MCQ + 2 match + 2 order + 2 fillblank.** Randomise positions across the array at generation time. quizlib.js reads the `type` field and renders accordingly.

### MCQ (`type: "mcq"`) — 24 per day

```js
{
  type: "mcq",
  domain: "Agent Architecture",      // must match a HEATMAP_DOMAINS entry exactly
  text: "Question stem.",
  choices: ["A…", "B…", "C…", "D…"],
  correct: 0,                         // 0–3
  explanation: "≤60 words, ≤3 sentences. State why the correct answer is right and briefly why the strongest distractor is wrong. No per-choice breakdown."
  // NO hints field — hints are derived client-side by quizlib.js (see HINTS_CLIENT_SIDE)
  // NO explanations array — replaced by single explanation string
}
```

**Study-day quiz behaviour (quizlib.js enforced):**
- After a choice is selected, all other buttons are disabled.
- Confidence row appears: `[ Guessed ] [ Sure ] [ Certain ]`. Default = "Sure" if not clicked before advancing.
- A collapsible **"Show explanation"** button reveals the single unified `explanation` string.
- A `💡 Hint` button appears on unanswered questions. Three clicks reveal three client-side hints cumulatively (Hint 1: one wrong choice greyed out; Hint 2: first sentence of `explanation`; Hint 3: domain tag + key phrase from `explanation`). After all three → disabled, replaced with "All hints used". XP for correct: 0 hints → 10, 1 → 7, 2 → 4, 3 → 2.
- Spaced repetition: wrong answers are pushed to `hmp_review_pool` (localStorage). At the start of each day's quiz, up to 5 review cards are injected above the main questions with orange left-border and `🔁 Review` badge.
- Confidence flags: `guessed+correct` → Lucky Guess ⭐ (added to review pool). `certain+wrong` → False Certainty ⚠️ (added to review pool). Summary line shown after all questions answered.
- XP toasts: `+10 XP` float-and-fade on correct. `+15 XP` for review-card correct. `+12 XP` for correct with confidence "Certain".
- Streak + level tracked in localStorage. Sidebar footer shows `⚡ {XP} XP · Level {N} {Label}` and `🔥 {N}-day streak`.
- Lives / Challenge mode toggle: visible before first answer. Challenge = 5 hearts; each wrong removes one. 0 hearts → quiz locked with 1-hour cooldown.
- `"Ask Google for details"` button appears beneath the explanation for every answered question (correct and wrong). Opens `https://www.google.com/search?q={TOPIC}+{QUESTION}+explanation+correct+answer` in a new tab.
- `localStorage` persistence across refreshes. A "Reset Score & Shuffle" button wipes state and re-shuffles. A separate "Clear Review Queue" button clears `hmp_review_pool` after confirmation.
- Confetti fires when all questions (including injected review cards) are answered.

**Distractor quality rule — enforced on every MCQ:**
All four choices must be comparable in length, specificity, and surface plausibility. Wrong answers must use real domain terminology and near-correct reasoning. Brevity, vagueness, or obvious incorrectness in a distractor is a giveaway and is **forbidden**.

---

### Match Pairs (`type: "match"`) — 2 per day

```js
{
  type: "match",
  domain: "Tool Design",
  text: "Match each term to its correct definition.",
  pairs: [
    { term: "hook",         definition: "A deterministic callback on agent lifecycle events." },
    { term: "stop_reason",  definition: "Signal that drives the agent loop: tool_use or end_turn." },
    { term: "Task tool",    definition: "SDK primitive used to spawn an isolated sub-agent." },
    { term: "fork_session", definition: "Branches a shared context point into two independent sessions." }
  ],                                  // exactly 4 pairs
  explanation: "Single string ≤60 words explaining the correct full mapping and why it matters."
}
```

**Render behaviour (quizlib.js):** Left column = shuffled terms as buttons; right column = shuffled definitions. User clicks one term + one definition → pair highlighted with connecting line. Correct pair locks green; incorrect shakes and resets. Complete when all 4 pairs matched correctly → explanation shown. No hints, no confidence rating. XP: +10 with zero wrong attempts; +5 if any wrong.

---

### Sequence Ordering (`type: "order"`) — 2 per day

```js
{
  type: "order",
  domain: "Agent Architecture",
  text: "Arrange the following steps in the correct order.",
  items: [
    "Send Messages API request with tools defined.",
    "Receive response and inspect stop_reason.",
    "If tool_use: execute tool and append tool_result block.",
    "If end_turn: return result to user."
  ],
  correctOrder: [0, 1, 2, 3],         // indices of items[] in the correct sequence
  explanation: "Single string ≤60 words explaining why this order is correct."
}
```

**Render behaviour (quizlib.js):** Drag-and-drop cards with grab handle `⋮⋮`. "Check Order" button below. Correct → green; wrong → red with correct position shown. Two wrong attempts → locked with correct order revealed. No hints, no confidence. XP: +10 first attempt; +5 second.

---

### Fill-Blank (`type: "fillblank"`) — 2 per day

```js
{
  type: "fillblank",
  domain: "Prompt Engineering",
  text: "A Claude agent loop should terminate only when stop_reason equals ___BLANK___, never when the model emits a text block.",
  blank_position: "___BLANK___",       // marker in text string
  wordBank: [
    "end_turn",       // correct — always at index 0
    "tool_use",
    "max_tokens",
    "stop_sequence",
    "refusal",
    "pause_turn"
  ],
  correct: 0,                          // index in wordBank
  explanation: "Single string ≤60 words explaining the correct answer."
}
```

**Render behaviour (quizlib.js):** Underlined blank slot inline in question text. Word bank = 6 pill buttons. Click word → drops into blank (dims in bank). Click blank → returns word. "Submit" locks. Correct → green + explanation. Wrong → red, correct answer shown + explanation. No hints, no confidence. XP: +10 correct, +0 wrong.

---

### Mock day page (day n)

Start from `assets/mock-template.html`. Substitute placeholders:

| Placeholder | Value |
|---|---|
| `{{DAY_NUM}}`, `{{LOGO_3CHAR}}`, `{{TARGET_LABEL}}` | As above |
| `{{MOCK_QCOUNT}}` | Questions per mock |
| `{{MOCK_MINUTES}}` | Minutes per mock |
| `{{MOCK_PASSMARK}}` | Display string e.g. `"720 / 1000"` or `"70%"` |
| `{{MOCK_PASSMARK_NUM}}` | JS fraction e.g. `0.72` |

Replace `MOCK1` and `MOCK2` arrays. Item shape (no `type` field, no `hints`, no `domain`):
```js
{ text, choices: ["A…","B…","C…","D…"], correct: 0, explanation: "Single string revealed in retrospection." }
```
- No question reuse between MOCK1 and MOCK2.
- Both mocks must cover the same domain-weight distribution.

**Mock-specific exclusions (enforced — never present on mock pages, not during attempt, not in retrospection, not on retry):**
- Confidence self-rating buttons
- XP toast animations or XP scoring
- Streak tracking or display
- Hint buttons or hint boxes
- Lives / Challenge mode toggle

**Post-completion behaviour (quizlib.js):**

1. **Completion canvas** — after both mocks are submitted, a full-screen canvas overlay fires confetti (4 seconds) and shows: `"🎉 Mock Tests Complete!"`, both mock scores, pass/fail status per mock (green/amber), and a motivational close. A `"View Results & Retrospect"` button dismisses it; also dismissible with `Escape`.

2. **Retrospection mode** — all questions in both mocks re-render with the user's selected choice highlighted (green if correct, red if wrong), correct choice highlighted green, full `explanation` shown beneath choices, and a `"🔍 Ask Google for details"` button beneath each explanation. All choice buttons are non-interactive. No XP, no hints, no confidence.

3. **Retry mode** — a `"🔄 Retry Mock Test"` button per mock in retrospection mode. On click: explanations and Ask Google hidden; choices re-enabled and re-shuffled; timer resets for that mock only; previous score wiped. After retry submission, single-mock result shown, then retrospection re-entered for that mock. Full completion canvas does NOT re-fire on retry — only on first completion of both mocks.

---

## Design System — Blueprint Theme

All generated files implement the Blueprint design system. Key tokens (hardcode into styles.css verbatim):

```css
.blueprint {
  --canvas: #f6f9ff;   --ink: #0a0f1e;     --bo: #2a3a52;      --mu: #3d5272;
  --accent: #5c6ef8;   --a-rgb: 92,110,248;
  --bdg: #eef1ff;      --card: #ffffff;     --cb: #cdd8ee;
  --sb: #1e3058;       --sb-line: #2a4070;  --sb-tx: #d8e4f8;   --sb-mu: #7a9ec8;
  --r: 6px;            --cr: 10px;          --pill: 6px;
}
```

**Google Fonts import (in `<head>`):**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```
Font stack: `'Outfit', system-ui, sans-serif`. Code: `'JetBrains Mono', 'Cascadia Code', ui-monospace, monospace`.

**Signature elements:**
- Sidebar `#1e3058` with `border-right: 1px solid #2a4070`. Active nav item: left-side `2px solid #5c6ef8` bar + `rgba(92,110,248,0.18)` background.
- Canvas texture: 24px grid overlay `rgba(92,110,248,0.05)` behind all content (`z-index: 0`), content at `z-index: 1`.
- Done day tiles: `border-left: 3px solid var(--accent)` (NOT a top bar).
- Current day tile: `border-color: rgba(92,110,248,0.65)` + `box-shadow: 0 0 0 2px rgba(92,110,248,0.12)`.
- Review cards: `border-left: 4px solid #f97316; background: rgba(249,115,22,0.06)` — orange is the only warm colour in the system, used exclusively for review queue.
- ALL-CAPS section labels, domain tags, heatmap column headers (`text-transform: uppercase; letter-spacing: 0.4–1.2px`).
- Explanation block: `background: rgba(92,110,248,0.07); border-left: 3px solid #5c6ef8; border-radius: 0 6px 6px 0`.

---

---

## v1.3 Fix Registry

*Asset files (`styles.css`, `quizlib.js`) already incorporate all fixes below. This section exists for audit/diff purposes.*

| # | File | Issue | Fix |
|---|---|---|---|
| 1 | `styles.css` | `.app.blueprint` class was a no-op — day pages rendered in dark theme | Added `.app.blueprint {}` block remapping all `--bg-*`/`--text-*`/`--accent` tokens to Blueprint palette; added `body:has(.app.blueprint)` for body background |
| 2 | `styles.css` | `.mode-btn` had no CSS — browser defaults only | Redesigned as segmented pill capsule; Normal → indigo gradient; Challenge → fire-orange gradient |
| 3 | `styles.css` | `.hint-btn`, `.hint-box`, `.hint-label` had no CSS | Styled with amber pill button, tinted reveal container, uppercase tier label |
| 4 | `styles.css` | `.choice.hint-greyed` class added by quizlib.js but no rule backed it | Added `opacity: 0.25; pointer-events: none; filter: grayscale(0.5)` |
| 5 | `styles.css` | "Start Day 1" `.btn` `<a>` tag got indigo text from `a { color: var(--accent) }` (invisible on indigo btn) | Scoped to `a:not(.btn):not(.btn-secondary)`; added `.blueprint .btn { color: #fff }` |
| 6 | `styles.css` | `.conf-btn`, `.conf-row`, `.conf-label` had no CSS | Traffic-light semantics: Guessed=coral, Sure=amber, Certain=emerald with glow rings |
| 7 | `quizlib.js` | `renderMatch()` re-rendered all pairs as live buttons regardless of `qd.matched` — already-matched pairs reappeared after partial-match re-renders | Built `matchedTerms`/`matchedDefs` Sets from `qd.matched` before rendering; locked matched buttons with `correct-pair` + `disabled` |
| 8 | `styles.css` | All match/order/fillblank interactive classes had zero CSS | Full styling pass: `.match-term-btn`, `.match-def-btn`, `.match-cols`, `.order-item`, `.drag-handle`, `.btn-check`, `.word-pill`, `.blank-slot`, `.btn-submit-blank`, `.show-explanation`, `.explanation-text`, `.ag`, `.shake` |
| 9 | `quizlib.js` | `inlineFmt()` had no regex for `[text](url)` — all hyperlinks in Further Reading rendered as raw text | Added `.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" ...>$1</a>')` before bold/italic/code replacements |


## Key invariants

- `h` = study content only. Study-day quizzes are untimed and self-paced.
- Day n = mocks only. No study material on day n.
- Study-day QUESTIONS: exactly 30 per day, exactly `QUIZ_TYPE_BREAKDOWN` composition. `type` field required on every question.
- `explanation` is a single string on **all** question types (MCQ, match, order, fillblank, mock). **Never use an `explanations` array** — that field is abolished.
- `hints` field is **never authored** in any QUESTIONS schema. Hints are derived at runtime by quizlib.js from the `explanation` string and `choices` array.
- `domain` field required on every study-day question (must match a HEATMAP_DOMAINS entry exactly for heatmap aggregation).
- Before presenting any file: scan for remaining `{{` in the output — any found means the file is unfinished.
- Resume affects tone and domain framing only. It never compresses topic coverage and never overrides `x`.
- Do not re-read resume or templates after Step 1.
- Batch approval message is one line only — no re-summaries, no recaps.
- DAYS_IN_BATCH is silent — never prompt the user for it.
- Mock-exclusion list (confidence, XP, streak, hints, lives) is absolute — no exceptions, no partial inclusions.
