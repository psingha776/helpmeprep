---
name: helpmeprep
description: "v1.4 — Build an interactive multi-day study hub (HTML/CSS/JS, Blueprint theme) from exam notes or a job description. Produces a hub with one page per study day (30-question quiz: MCQ, match, sequence, fill-blank) and a timed mock-test day. Features: spaced repetition, confidence rating, XP/streak/levels, tiered hints, lives mode, sticky notes + aggregate notes dashboard, domain heatmap, confidence calibration chart, quick-quiz mode, per-question timer, mark-for-review during mocks, domain-weighted mock scoring, keyboard shortcuts, dark mode, service-worker offline cache, Ask Google. Trigger for /helpmeprep, \"make a study hub\", \"prep me for an exam/interview\", \"turn this doc into a study deck\", \"build a multi-day prep course\", or any syllabus/JD with timing variables — even without the word \"skill\"."
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

If all four are present in the triggering message → skip this block, proceed to Step 1.

**`DAYS_IN_BATCH` is a silent internal variable (default 2). Do NOT prompt the user for it.**

---

## TUNABLE VARIABLES

```
# WORDS_PER_HOUR derived from x at Step 3 (not hardcoded)
WORDS_PER_HOUR_SCALE  = { "0-4": 1500, "5-7": 1200, "8-10": 1000 }

EXPLANATION_MAX_WORDS = 60
DAYS_IN_BATCH         = 2
QUIZ_PER_DAY          = 30
QUIZ_TYPE_BREAKDOWN   = { mcq: 24, match: 2, order: 2, fillblank: 2 }
JD_MOCK_QUESTIONS     = 30
JD_MOCK_MINUTES       = 60
JD_MOCK_PASSMARK      = 0.70

REVIEW_POOL_MAX_PER_DAY  = 5
CONFIDENCE_ENABLED       = true
CONFIDENCE_BUTTONS       = ["Guessed", "Sure", "Certain"]
CONFIDENCE_DEFAULT       = "sure"

XP_PER_CORRECT           = 10
XP_PER_REVIEW_CORRECT    = 15
XP_LEVEL_THRESHOLDS      = [0, 100, 300, 600, 1000]
XP_LEVEL_LABELS          = ["Beginner", "Associate", "Practitioner", "Architect", "Fellow"]
HINT_XP_PENALTIES        = [10, 7, 4, 2]

HINTS_CLIENT_SIDE        = true     # hints derived at runtime; never authored in QUESTIONS
HEATMAP_DOMAINS          = []       # populated at generation time
DOMAIN_WEIGHTS           = {}       # optional {domain: weight 0-1}; populated for weighted exams only
```

---

## Step 1 — Read inputs once

1. Read the user's source document (PDF, .md, .txt, .docx, pasted text).
2. If a resume/CV exists in `/mnt/project/`, read it **once** and extract a compact internal skill list — pulling skills from every section including experience prose. Store as one internal line; do not re-read. If no resume → proceed without it.
3. Read all skill asset templates from this skill's `assets/` folder **once**:
   - `styles.css`, `quizlib.js`, `mocklib.js`, `nav.js`, `theme.js`, `index.js`, `service-worker.js`
   - `index-template.html`, `day-template.html`, `mock-template.html`
   **Do not re-read between batches.**

---

## Step 2 — Detect source type

| Signals | Type |
|---|---|
| Domain weights %, sample/practice questions, "exam covers", chapters, passing score, test format | **Exam** |
| Responsibilities, Requirements, years of experience, role title, "we offer", benefits | **JD** |

If JD and no YoE stated → ask once: *"JD doesn't state required experience — what level should I target?"*

---

## Step 3 — Difficulty and tone

**Difficulty** — Exam: mirror the real exam exactly (question style, distractor sophistication, weights). JD by YoE: 0–2 entry · 2–5 mid · 5–8 senior · 8+ staff/principal.

**Tone (from x):**

| x | Tone | WORDS_PER_HOUR |
|---|---|---|
| 0–4 | Warm, foundational; define jargon; use analogies. | 1500 |
| 5–7 | Balanced; assume working familiarity. | 1200 |
| 8–10 | Peer-level, terse; "why" over "what". | 1000 |

Compute WORDS_PER_HOUR once here. Where the source allows multiple framings, prefer examples referencing the resume's domain — but only where it lands naturally.

---

## Step 4 — Plan the curriculum

- Study days = n−1. Mock day = n.
- Target words per study day ≈ WORDS_PER_HOUR × h (code + tables excluded).
- Distribute topics by stated domain percentages where available.
- Each day: 3–4-word title + one-line description.
- Mock format: exam source → mirror real exam. JD source → use JD_MOCK_* variables.
- Populate `HEATMAP_DOMAINS` from source domains.
- Populate `DOMAIN_WEIGHTS` **only if** source provides explicit domain weights (e.g., CCA-F: `{"Agent Architecture":0.27, "Prompt Engineering":0.20, ...}`). For JDs or sources without weights, leave as `{}`.

---

## Step 5 — Plan confirmation gate

- All params provided upfront → skip confirmation, jump to Step 6.
- Any param missing/ambiguous → after resolving, post compact plan ending *"Ready to build — what do you want to do next?"* then wait.

Compact plan format:
```
Hub: {title} | Type: {exam/JD} | Tone: x={x} | Mock: 2×{count}Q×{min}min, pass {mark}
─────────────────────────────────────────────
Day 1 — {Title}: {one-line scope}
...
Day n — Mock Tests: 2×{count}Q×{min}min
─────────────────────────────────────────────
Total: {QUIZ_PER_DAY×(n−1)} quiz Qs + {2×mock_count} mock Qs
```

---

## Step 6 — Build foundation files (bash-cp, NO verbatim emission)

**Output folder:** `/mnt/user-data/outputs/{topic-slug}/` — lowercase hyphenated slug. If exists, append `-2`, `-3`.

All static assets are copied from `/mnt/skills/user/helpmeprep/assets/` via `cp`. Only templates need placeholder substitution, done via Python heredoc for clean multi-line values. **Do NOT use `create_file` to re-emit `styles.css`, `quizlib.js`, `mocklib.js`, `nav.js`, `theme.js`, `index.js`, or `service-worker.js`** — these are copied verbatim.

```bash
SLUG="topic-slug"   # set this
OUT="/mnt/user-data/outputs/$SLUG"
SRC="/mnt/skills/user/helpmeprep/assets"
mkdir -p "$OUT"
cp "$SRC"/{styles.css,quizlib.js,mocklib.js,theme.js,service-worker.js,index.js} "$OUT/"
```

`nav.js` and the three `*-template.html` files need substitution. Use Python:

```bash
python3 << 'PY'
import re, json
SRC = "/mnt/skills/user/helpmeprep/assets"
OUT = "/mnt/user-data/outputs/SLUG"   # replace SLUG

vars = {
  "HUB_TITLE":       "...",
  "LOGO_3CHAR":      "...",        # 2–3 char monogram
  "TARGET_LABEL":    "...",        # e.g. "CCA-F · May 14"
  "N":               "7",
  "H":               "2",
  "HUB_SUBTITLE":    "Fresh one-paragraph teaser — never reuse CCA-F text.",
  "HUB_BADGES":      '<span class="badge">60Q</span> <span class="badge">720/1000</span>',
  "DAY_TILES":       '<a class="day-tile" href="day1.html">...</a>\n<a class="day-tile" href="day2.html">...</a>',
  "HEATMAP_DOMAINS_JSON": json.dumps(["Agent Architecture","Prompt Engineering","Tool Design"]),
  "DOMAIN_WEIGHTS_JSON":  json.dumps({"Agent Architecture":0.27,"Prompt Engineering":0.20}),
}

src = open(f"{SRC}/index-template.html").read()
src = src.replace("<!-- {{DAY_TILES_START}}", vars["DAY_TILES"] + "\n<!-- {{DAY_TILES_START}}")
for k, v in vars.items():
    src = src.replace("{{"+k+"}}", v)
open(f"{OUT}/index.html","w").write(src)

# nav.js — substitute NAV_DAYS array
nav = open(f"{SRC}/nav.js").read()
nav_days = json.dumps([
  {"num":1, "title":"Foundations",    "file":"day1", "isMock":False},
  {"num":2, "title":"Agentic Arch.",  "file":"day2", "isMock":False},
  # ...
  {"num":7, "title":"Mock Tests",     "file":"day7", "isMock":True},
], indent=2)
nav = re.sub(r"const NAV_DAYS = \[[\s\S]*?\];", f"const NAV_DAYS = {nav_days};", nav)
open(f"{OUT}/nav.js","w").write(nav)
PY
```

**Question bank file** (`question-bank.js`) is written *during day generation* and aggregated at the end. See Step 7.

**After foundation files exist:** call `present_files` with [index.html, ...others]. Then proceed to Step 7.

---

## Step 7 — Build day pages in batches

**Batch schedule** (DAYS_IN_BATCH = 2 default): Batch 1 = day1,day2 · Batch 2 = day3,day4 · … Final batch = remaining + mock day.

**Sidecar split (one file per turn):** each study day produces:
- `dayN.html` — substituted from `day-template.html`
- `dayN-quiz.js` — the QUESTIONS array

Sequence per day inside a batch:
1. Write `dayN.html` (sed/Python substitute placeholders) → `present_files` → end turn.
2. Next turn: write `dayN-quiz.js` (the QUESTIONS array only) → `present_files` → end turn.

**Between batches** — end with exactly:
> *"✅ Days X–Y are ready · ▰▰░░░░ {done}/{total} days · Reply `continue` for next batch, `preview` to see a sample Q from Day {X+1} first, or `pause` to stop here."*

**HARD STOP — do NOT proceed to the next batch without explicit user approval.**

**After the final batch** — generate `question-bank.js` aggregating every study day's QUESTIONS plus MOCK1/MOCK2:

```bash
python3 << 'PY'
# Concatenate all dayN-quiz.js into a single QUESTION_BANK manifest
import os, re, json
OUT = "/mnt/user-data/outputs/SLUG"
bank = {}
for f in sorted(os.listdir(OUT)):
    m = re.match(r"day(\d+)-quiz\.js", f)
    if not m: continue
    content = open(f"{OUT}/{f}").read()
    # extract the array literal (basic approach: load via node, or hand-parse — Claude generates this)
    bank[f"day{m.group(1)}"] = "QUESTIONS_FOR_DAY_" + m.group(1)
# Claude writes the actual content as a JS object literal:
open(f"{OUT}/question-bank.js","w").write("const QUESTION_BANK = " + "..." + ";")
PY
```

Then `present_files` with all output files.

---

### Study day page — placeholders

| Placeholder | Value |
|---|---|
| `{{DAY_NUM}}` | Day number |
| `{{DAY_TITLE}}` | Day title |
| `{{DAY_DOMAIN}}` | Parent topic |
| `{{H}}` | Hours from input |
| `{{LOGO_3CHAR}}` | Monogram |
| `{{DAY_QUIZ_FILE}}` | `dayN-quiz.js` |
| `{{STUDY_MD_START}}` block | Markdown content between the markers |

> **STUDY_MD backtick escaping — required before every write.**
> `STUDY_MD` lives inside a JS template literal. Any unescaped backtick — from markdown fenced code blocks — breaks the literal silently: the study section won't render and the quiz only appears after a Reset click. Always escape before writing:
>
> ```python
> study_md = study_md.replace('`', '\\`').replace('${', '\\${')
> ```
>
> Run this on the Python variable before substituting into the template. Hubs with code examples will have many backticks — never skip this.

**STUDY_MD Markdown syntax** (rendered to Blueprint HTML at runtime):

| Syntax | Renders as |
|---|---|
| `## Heading` / `### Heading` | h2/h3 + automatic `+ note` sticky-note trigger |
| `> [!info] Title` + `> body` | Info callout (also `warn`, `success`, `error`) |
| `EXAMPLE: text` | Example block |
| ` ```lang … ``` ` | Fenced code block |
| `\| col \| col \|` table | Responsive table |
| `[badge] [badge]` | Badge pill row |
| `- item` / `1. item` | Bullet / ordered list |
| `**bold**` `*italic*` `` `code` `` | Inline formatting |

Target ≈ WORDS_PER_HOUR × h words (code + tables excluded). End with `## Key Takeaways` (5–8 bullets) then `## Further Reading` (3–6 links: `📄` web / `▶` YouTube). Only links you're highly confident exist; uncertain YouTube links → `https://www.youtube.com/results?search_query=...`.

### `dayN-quiz.js` sidecar

```js
const QUESTIONS = [
  // 30 typed question objects (see schemas below)
];
```

Nothing else in the sidecar.

---

## QUESTIONS schema — strict composition: 24 MCQ + 2 match + 2 order + 2 fillblank, randomised positions

### MCQ (`type: "mcq"`)

```js
{
  type: "mcq",
  domain: "Agent Architecture",   // MUST match a HEATMAP_DOMAINS entry exactly
  sig: "agent-loop-stop-reason",  // 3–6 hyphenated keywords; STABLE; used for dedup
  text: "Question stem.",
  choices: ["A…","B…","C…","D…"],
  correct: 0,
  explanation: "≤60 words, ≤3 sentences. Why correct is right + briefly why strongest distractor is wrong."
}
```

**Distractor quality rule** — all four choices comparable in length, specificity, plausibility. Wrong answers use real domain terminology and near-correct reasoning. Brevity, vagueness, or obvious incorrectness in a distractor is forbidden.

### Match (`type: "match"`) — exactly 4 pairs

```js
{ type:"match", domain:"...", sig:"...", text:"Match each term to its definition.",
  pairs:[{term:"...",definition:"..."},...],
  explanation:"≤60 words." }
```

### Order (`type: "order"`)

```js
{ type:"order", domain:"...", sig:"...", text:"Arrange in order.",
  items:["...","...","...","..."],
  correctOrder:[0,1,2,3],
  explanation:"≤60 words." }
```

### Fill-Blank (`type: "fillblank"`)

```js
{ type:"fillblank", domain:"...", sig:"...",
  text:"Sentence with ___BLANK___ marker.",
  blank_position:"___BLANK___",
  wordBank:["correct","wrong1","wrong2","wrong3","wrong4","wrong5"],
  correct:0,
  explanation:"≤60 words." }
```

### Mock question (no `type`, no `hints` — has `domain` and `sig` for weighted scoring + dedup)

```js
{ text, choices:["A…","B…","C…","D…"], correct:0, explanation:"...", domain:"...", sig:"..." }
```

---

## Mock day — placeholders

| Placeholder | Value |
|---|---|
| `{{MOCK_QCOUNT}}` | Questions per mock |
| `{{MOCK_MINUTES}}` | Minutes per mock |
| `{{MOCK_PASSMARK}}` | Display e.g. `"720 / 1000"` or `"70%"` |
| `{{MOCK_PASSMARK_NUM}}` | JS fraction e.g. `0.72` |
| `{{DOMAIN_WEIGHTS_JSON}}` | `JSON.stringify(DOMAIN_WEIGHTS)` |
| `{{MOCK1_QUESTIONS}}` | MOCK1 array literal |
| `{{MOCK2_QUESTIONS}}` | MOCK2 array literal |

**Mock-specific exclusions** (never present, not during attempt, not retrospection, not retry): confidence rating, XP toasts, streak, hint buttons, lives mode.

**Mock features** (in mocklib.js): timer-warn at 10min/5min · auto-submit on time-out · mark-for-review flag per question · domain-weighted score using DOMAIN_WEIGHTS if non-empty · completion canvas + retrospection + retry · runtime dedup warning.

---

## QUESTION DEDUPLICATION — strict, 3-layer

**1. Generation-time rule (PRIMARY):** Before writing MOCK1/MOCK2, scan every previously-written `dayN-quiz.js` file in the output folder and collect every `sig`. No mock question may reuse any of those sigs. No mock question may reuse any sig within MOCK1+MOCK2.

```bash
# Sanity check before finalising mock file
python3 -c "
import re, os
sigs = []
out = '/mnt/user-data/outputs/SLUG'
for f in sorted(os.listdir(out)):
    if re.match(r'day\d+-quiz\.js', f):
        sigs += re.findall(r'sig:\s*[\"\\'']([^\"\\'']+)', open(f'{out}/{f}').read())
print(f'Study-day sigs collected: {len(sigs)}')
print(f'Duplicates within study days: {len(sigs)-len(set(sigs))}')
"
```

**2. Schema field (REQUIRED):** Every question object — study and mock — carries `sig: "hyphenated-keywords"`. Stable across runs. 3–6 keywords pulled from the stem.

**3. Runtime safety net:** Each study-day page publishes its sigs to `localStorage.hmp_study_sigs` on load. The mock page's `mocklib.js` reads them after both mocks load and `console.warn`s any collisions. Belt-and-braces — Claude must still enforce rule 1 at generation time.

---

## Design System — Blueprint Theme

Tokens (already in styles.css; do not re-emit):

```css
.blueprint {
  --canvas:#f6f9ff; --ink:#0a0f1e; --bo:#2a3a52; --mu:#3d5272;
  --accent:#5c6ef8; --a-rgb:92,110,248;
  --bdg:#eef1ff; --card:#fff; --cb:#cdd8ee;
  --sb:#1e3058; --sb-line:#2a4070; --sb-tx:#d8e4f8; --sb-mu:#7a9ec8;
  --r:6px; --cr:10px; --pill:6px;
}
html.dark .blueprint { /* dark overrides — see styles.css */ }
```

Font: `'Outfit', system-ui, sans-serif`. Code: `'JetBrains Mono', monospace`.

**Signature elements** — steel-navy sidebar · 24px grid overlay (`rgba(--accent, 0.05)`) · done-day tiles use `border-left: 3px solid accent` · review cards use orange `#f97316` (the only warm color, exclusive to review queue) · UPPERCASE section labels · `border-left: 3px solid accent` on explanation blocks.

**Theme toggle** — `<button class="theme-toggle" onclick="toggleTheme()">🌓</button>` placed once per page just inside `<body>`. Behaviour in `theme.js`.

---

## Key invariants

- `h` = study content only. Study-day quizzes untimed and self-paced.
- Day n = mocks only. No study material on day n.
- Study-day QUESTIONS: exactly 30 per day, exactly QUIZ_TYPE_BREAKDOWN composition. `type`, `domain`, `sig` required on every question.
- `explanation` is a single string on all question types. Never an `explanations` array.
- `hints` field never authored — derived client-side by quizlib.js.
- Mock questions: no `type`, no `hints`, but **must** have `domain` and `sig`.
- Mock features absolute exclusions: confidence, XP, streak, hints, lives.
- Foundation assets are `cp`-ed verbatim — NEVER use `create_file` to retype them.
- Resume affects tone and example framing only; never compresses coverage; never overrides `x`.
- Do not re-read resume or asset templates after Step 1.
- Batch handoff message is one line per the format in Step 7.
- DAYS_IN_BATCH is silent — never prompt.
- Before presenting any file: scan for remaining `{{` — any found means file is unfinished.
- STUDY_MD content must have backticks escaped (`\`` → `\\``) and `${` escaped before insertion into the JS template literal. Unescaped backticks from code fences silently break the literal.

---

## Changelog

> *Rule for all future versions: max 2 lines per entry, list only what was added/changed, newest first.*

- **v1.4** — Keyboard shortcuts (1–4/H/→/N/?); dark mode toggle; per-Q timer; aggregate notes dashboard on index; domain-weighted mock score (DOMAIN_WEIGHTS); mark-for-review flags in mock; service-worker offline cache; first-visit sticky-note coachmark; per-day note count in sidebar; quick-quiz mode; question dedup via `sig` field (3-layer enforcement); Google search query cap removed. Fixed STUDY_MD rendering bug: unescaped backticks in code fences break the JS template literal; added escape step + invariant.
- **v1.4 (token saves)** — SKILL.md trimmed from 462 → ~280 lines; foundation assets now `cp`-ed from `/mnt/skills/user/helpmeprep/assets` (no verbatim emission); mock-template inline JS extracted to `mocklib.js` (mock-template shrank 360 → 115 lines); per-version changelog rule capped at 2 lines.
- **v1.3** — Blueprint theme active on day pages; full match/order/fillblank CSS; inlineFmt markdown link support; match partial-render bug fix.
- **v1.2** — Sticky notes; XP/streak/levels; spaced repetition; confidence rating; client-side hints; lives mode; domain heatmap; mock retrospection/retry.
