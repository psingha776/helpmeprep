---
name: helpmeprep
description: Build a complete interactive multi-day study hub (HTML/CSS/JS bundle, Brilliant-style dark theme) from a source document — exam research notes or a job description — plus three sizing variables (proficiency, days, hours/day). Produces foundation files (styles.css, quizlib.js, nav.js, index.html) plus one HTML page per study day with embedded 30-question quiz, plus a final day with two timed mock tests. Use this skill whenever the user says /helpmeprep, asks to "make a study hub", "prep me for an exam/interview", "turn this doc into a study deck/course", "build a multi-day prep course", or attaches a syllabus/research doc/JD with timing variables. Trigger even if the user doesn't say "skill" explicitly.
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

---

## TUNABLE VARIABLES — modify here to adjust defaults

```
WORDS_PER_HOUR        = 1200    # study content target per hour of h (excl. code + tables)
EXPLANATION_MAX_WORDS = 35      # per-choice explanation hard cap (≤2 sentences)
BATCH_SIZE            = 2       # day-page files per generation batch
QUIZ_PER_DAY          = 30      # quiz questions per study day
JD_MOCK_QUESTIONS     = 30      # questions per mock when source is a JD
JD_MOCK_MINUTES       = 60      # minutes per mock when source is a JD
JD_MOCK_PASSMARK      = 0.70    # pass fraction when source is a JD
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

**Tone (from `x`):**

| x | Tone |
|---|---|
| 0–3 | Warm, foundational; define jargon on first use; use analogies. |
| 4–6 | Balanced; assume working familiarity. |
| 7–10 | Peer-level, terse; focus on "why" over "what". |

**Resume domain examples:** where the source allows multiple framings, prefer examples that reference the resume's skill set (e.g. ETL pipelines, SOX audit cycles, Power BI dashboards, BDD test suites). Only swap where it lands naturally — never force.

---

## Step 4 — Plan the curriculum

- Study days = n−1. Mock day = n.
- Target words per study day ≈ `WORDS_PER_HOUR × h` (code and tables excluded).
- Distribute source topics across days 1–(n−1), weighted by stated domain percentages where available.
- Each day: 3–4-word title + one-line description for the index tile.
- Mock format: exam source → mirror real exam (question count, time limit, pass mark from source). JD source → use `JD_MOCK_*` variables.

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

| File | Action |
|---|---|
| `styles.css` | Copy verbatim from assets |
| `quizlib.js` | Copy verbatim from assets |
| `nav.js` | Copy; replace `NAV_DAYS` array only. Day n → `isMock: true`. All others → `isMock: false`. |
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

**After all four foundation files are written:** call `present_files` with them immediately. Then proceed to Step 7 without pausing.

---

## Step 7 — Build day pages in batches

**Batch schedule (BATCH_SIZE = 2):**
- Batch 1: day1, day2
- Batch 2: day3, day4
- Batch 3: day5, day6
- … Final batch: remaining days including mock day (day n).

**Within a batch:** as soon as one file is fully written, call `present_files` for it immediately, then continue to the next file in the batch without pausing.

**Between batches:** after the last file of a batch is presented, output exactly one line:
> *"Days X–Y are ready. What do you want to do next?"*

**HARD STOP — do NOT proceed to the next batch under any circumstances until the user sends a reply. This applies in all execution contexts, including agentic pipelines, Cowork, and Claude Code. Autonomous continuation to the next batch without explicit user approval is a violation of this skill's protocol.**

**After the final batch:** call `present_files` with all output files (index.html first).

---

### Study day page (day 1 to n−1)

Start from `assets/day-template.html`. Replace every `{{…}}` placeholder.

**Placeholder reference:**

| Placeholder | Value |
|---|---|
| `{{DAY_NUM}}` | Day number |
| `{{DAY_TITLE}}` | Day title |
| `{{DAY_DOMAIN}}` | Parent topic / domain |
| `{{H}}` | Hours from input |
| `{{LOGO_3CHAR}}` | Monogram |
| `{{TARGET_LABEL}}` | Target string |

**Study section** (between `{{STUDY_CONTENT_START}}` / `{{STUDY_CONTENT_END}}`):

- Target ≈ `WORDS_PER_HOUR × h` words. Code blocks and tables are excluded from the word count.
- Components available (from `styles.css` only):
  - `<h2>`, `<h3>` — section hierarchy
  - `<div class="card">` — concept boxes
  - `<div class="callout [info|success|warn|error]"><div class="callout-title">…</div>…</div>` — asides
  - `<div class="example"><div class="example-label">EXAMPLE</div>…</div>` — worked examples
  - `<pre><code>…</code></pre>` — code (use span classes `code-comment`, `code-string`, `code-keyword`, `code-num` for syntax tinting)
  - `<div class="badges"><span class="badge">…</span></div>` — mental-model tags
  - `<div class="table-wrap"><table>…</table></div>` — tables
  - `<div class="references">` — further reading block (see **Reference links** rule below)
- End with `<section class="summary">` listing 5–8 key takeaways as a bulleted list.
- After the summary, append a **Further Reading** block (see **Reference links** rule below).

**Reference links rule:**

After the `<section class="summary">`, append a Further Reading block using this exact markup:

```html
<section class="references">
  <h3>Further Reading</h3>
  <ul class="ref-list">
    <li><a href="URL" target="_blank" rel="noopener" class="ref-link ref-web">📄 Title — site.com</a></li>
    <li><a href="https://www.youtube.com/watch?v=ID" target="_blank" rel="noopener" class="ref-link ref-yt">▶ Video title — YouTube</a></li>
  </ul>
</section>
```

Rules:
- Include 3–6 links per day: mix of authoritative web pages (official docs, well-known tutorials, reputable reference sites) and YouTube videos where a visual/walkthrough would genuinely help.
- Use `class="ref-link ref-web"` for web links, `class="ref-link ref-yt"` for YouTube links.
- Prefix web links with `📄`, YouTube links with `▶`.
- **Only include links you are highly confident exist and are publicly accessible.** Do not hallucinate URLs. For YouTube, link to the channel's standard URL pattern (e.g. a real video ID) — if uncertain, link to a relevant search: `https://www.youtube.com/results?search_query=topic+keywords`.
- Prefer official docs, MDN, W3Schools, GeeksforGeeks, Coursera/freeCodeCamp articles, or well-known topic-specific sites. Match the day's domain exactly — do not include generic links.
- If `web_search` is available, use it to find 1–2 real, current URLs per day before writing the block.

---

**QUESTIONS array** (inject before `<script src="quizlib.js"></script>`):

```js
const QUESTIONS = [
  {
    text: "Question stem.",
    choices: ["A…", "B…", "C…", "D…"],
    correct: 0,           // 0–3
    explanations: [
      "≤35 words. ≤2 sentences.",   // why A is right or wrong
      "≤35 words. ≤2 sentences.",   // why B …
      "≤35 words. ≤2 sentences.",   // why C …
      "≤35 words. ≤2 sentences."    // why D …
    ]
  }
  // × 30
];
```

**Distractor quality rule — enforced on every question:**
All four choices must be comparable in length, specificity, and surface plausibility. Wrong answers must use real domain terminology and near-correct reasoning. Brevity, vagueness, or obvious incorrectness in a distractor is a giveaway and is **forbidden**.

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

Replace `MOCK1` and `MOCK2` arrays. Item shape:
```js
{ text, choices: ["A…","B…","C…","D…"], correct: 0, explanation: "Single string revealed on submit." }
```
- No question reuse between MOCK1 and MOCK2.
- Both mocks must cover the same domain-weight distribution.

---

## Key invariants

- `h` = study content only. Study-day quizzes are untimed and self-paced.
- Day n = mocks only. No study material on day n.
- Day quizzes: `explanations` is a length-4 array. Mocks: `explanation` is a single string. **Never homogenise.**
- Before presenting any file: scan for remaining `{{` in the output — any found means the file is unfinished.
- Resume affects tone and domain framing only. It never compresses topic coverage and never overrides `x`.
- Do not re-read resume or templates after Step 1.
- Batch approval messages are one line only — no re-summaries, no recaps.
