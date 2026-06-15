---
name: helpmeprep
description: "v1.5 — Build an interactive multi-day study hub from exam notes or a job
  description. Each study day gets a reading section and a 30-question quiz (MCQ, match,
  sequence, fill-blank) with spaced repetition, XP/streak/levels, hints, lives mode,
  confidence calibration, notes, and a domain heatmap. Final day = two timed mock tests
  with weighted scoring and retrospection. Trigger for /helpmeprep, 'make a study hub',
  'prep me for an exam/interview', 'turn this doc into a study deck', 'build a multi-day
  prep course', or any syllabus/JD with timing variables — even without the word 'skill'."
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

EXPLANATION_MAX_WORDS = 80
DAYS_IN_BATCH         = 2
FIRST_BATCH_DAYS      = 1     # first commit to the user is a single day — fastest, cheapest path to a reviewable deliverable
QUIZ_PER_DAY          = 30
QUIZ_TYPE_BREAKDOWN   = { mcq: 23, match: 1, order: 2, fillblank: 4 }
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
2. If a resume/CV exists in `/mnt/project/`, skim it **once** for a one-line skill tag list (domains + tools the learner already knows). Do not ingest the full document or quote prose — a compact tag line is all that downstream tone/example-framing needs. No resume → proceed without it.
3. **Do NOT read any asset file into context — not the templates, not the verbatim assets.** Every page is assembled by a Python heredoc that reads its template from `/mnt/skills/user/helpmeprep/assets/` **on disk** (`index-template.html`, `day-template.html`, `mock-template.html`, `nav.js`) or `cp`-es it verbatim (`styles.css`, `quizlib.js`, `mocklib.js`, `theme.js`, `index.js`). The placeholder names and `STUDY_MD` markers you need are listed in the placeholder tables in Steps 6–7 — that contract is authoritative; the template body is never required in context. Never `cat`/`view` an asset file. The `grep` for unresolved `{{` before presenting each file (see Key invariants) is the safety net that confirms every placeholder resolved.

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
cp "$SRC"/{styles.css,quizlib.js,mocklib.js,theme.js,index.js} "$OUT/"
```

`nav.js` and the three `*-template.html` files need substitution. Use Python:

```bash
python3 << 'PY'
import re, json
SRC = "/mnt/skills/user/helpmeprep/assets"
OUT = "/mnt/user-data/outputs/SLUG"   # replace SLUG

QUIZ_PER_DAY = 30
N = 7

# Day tile inner structure — Calm Tracker plan-row pattern.
# Classes: .day-tile.done / .cur / .upcoming / .mock
# Use .cur for the current day, .done for completed, .upcoming for future, .mock for the final mock-day tile.
def day_tile(num, dom, title, qcount, hours, state="upcoming", is_mock=False):
    nn = str(num).zfill(2)
    unit = "Mock" if is_mock else "Day"
    cls = f"day-tile {'mock' if is_mock else state}"
    return f'''<a class="{cls}" href="day{num}.html">
  <div class="plan-date"><span class="plan-date-unit">{unit}</span><span class="plan-date-num">{nn}</span></div>
  <div class="plan-body"><div class="plan-dom">{dom}</div><div class="plan-title">{title}</div></div>
  <div class="plan-prog"><span class="plan-prog-text"><strong>{qcount} Q</strong> · ~{hours} hr</span><div class="plan-bar"><div class="plan-bar-fill"></div></div></div>
  <svg class="plan-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 4l4 4-4 4"/></svg>
</a>'''

day_tiles_html = "\n".join([
    day_tile(1, "Foundations",  "Domain title",   30, 2, "cur"),
    day_tile(2, "Domain Title", "Day 2 title",    30, 2, "upcoming"),
    # ...
    day_tile(N, "Mock Tests",   "Mock Tests",     60, 2, is_mock=True),
])

vars = {
  "HUB_TITLE":       "...",
  "LOGO_3CHAR":      "...",        # 2–3 char monogram
  "TARGET_LABEL":    "...",        # e.g. "May 14" (kept short — fits inside KPI value cell)
  "TARGET_SUB":      "...",        # e.g. "12 days · CCA-F" — secondary line under the target KPI
  "N":               str(N),
  "H":               "2",
  "QUIZ_PER_DAY":    str(QUIZ_PER_DAY),   # tunable; default 30
  "TOTAL_QUIZ_Q":    str(QUIZ_PER_DAY * (N-1)),  # study-day quiz total (excludes mocks)
  "HUB_SUBTITLE":    "Fresh one-paragraph teaser — never reuse boilerplate.",
  "DAY_TILES":       day_tiles_html,
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

**B2 — Generate `service-worker.js`** (per-hub, not a verbatim asset). Add this Python block after the cp and template substitution steps:

```python
import json, os
OUT = "/mnt/user-data/outputs/SLUG"   # replace SLUG
SLUG = "topic-slug"
N = 7   # total days

files = ['index.html','styles.css','theme.js','nav.js','index.js',
         'quizlib.js','mocklib.js','question-bank.js']
for i in range(1, N + 1):
    files.append(f'day{i}.html')
    if i < N:
        files.append(f'day{i}-quiz.js')

sw = f"""/* helpmeprep service worker — cache: {SLUG}-v1 */
const CACHE = '{SLUG}-v1';
const FILES = {json.dumps(files, indent=2)};

self.addEventListener('install', e => e.waitUntil(
  caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())
));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => e.respondWith(
  caches.match(e.request).then(r => r || fetch(e.request))
));
"""
open(f'{OUT}/service-worker.js', 'w').write(sw)
print(f'[SW] service-worker.js written with {len(files)} cached files.')
```

Cache name is `{SLUG}-v1` — unique per hub, so old caches are evicted on `activate`. Google Fonts (cross-origin) excluded from pre-cache.

**Question bank file** (`question-bank.js`) is assembled mechanically at the end of Step 7. See Step 7.

**After foundation files exist:** call `present_files` with [index.html, ...others]. Then proceed to Step 7.

---

## Step 7 — Build day pages in batches

**Batch schedule:** Batch 1 = day1 only (`FIRST_BATCH_DAYS = 1`) · Batch 2 = day2,day3 · Batch 3 = day4,day5 · … Final batch = remaining + mock day. The smaller first batch reaches a reviewable deliverable at roughly half the token cost; the full curriculum is still planned in Step 4 regardless — only generation is chunked.

**Sidecar co-production (one turn per day) — assemble the HTML from the on-disk template; do NOT hand-write the HTML shell.** Per study day, emit only the irreducible content (the reading markdown + the QUESTIONS array); a Python heredoc wraps them using `day-template.html` read from disk. This keeps the ~1,300-token shell out of output and moves backtick escaping into deterministic Python.

1. `create_file /tmp/dayN-study.md` — the raw reading markdown (plain Markdown, **no JS-literal escaping** — Python handles it).
2. `create_file {OUT}/dayN-quiz.js` — `const QUESTIONS = [ … ];` (the QUESTIONS array only).
3. Run the assembly heredoc:

```python
python3 << 'PY'
SRC = "/mnt/skills/user/helpmeprep/assets"
OUT = "/mnt/user-data/outputs/SLUG"
N   = 1   # this day's number

vars = {
  "DAY_NUM": str(N), "DAY_NUM_PADDED": str(N).zfill(2),
  "DAY_TITLE": "…", "DAY_DOMAIN": "…",
  "DOMAIN_WEIGHT_META": "",          # or " · Domain weight 18%"; "" if no weight
  "H": "2", "N": "7", "LOGO_3CHAR": "…",
  "QUIZ_PER_DAY": "30", "DAY_QUIZ_FILE": f"day{N}-quiz.js",
}
tpl = open(f"{SRC}/day-template.html").read()
for k, v in vars.items():
    tpl = tpl.replace("{{"+k+"}}", v)

# STUDY_MD: escape for the JS template literal, then splice between the markers.
study_md = open(f"/tmp/day{N}-study.md").read()
study_md = study_md.replace("`", "\\`").replace("${", "\\${")
START, END = "/* {{STUDY_MD_START}} */", "/* {{STUDY_MD_END}} */"
pre, s1, rest = tpl.partition(START); mid, s2, post = rest.partition(END)
assert s1 and s2, "STUDY_MD markers not found"
# str.partition is LITERAL — it never interprets \1, \g, \\ in the content.
# Do NOT switch this to re.sub(pat, block, tpl): re.sub interprets backreferences in the
# replacement string and will silently corrupt study content containing regex/Windows paths.
tpl = pre + "/* STUDY_MD_START */\nconst STUDY_MD = `\n" + study_md + "\n`;\n/* STUDY_MD_END */" + post

assert "{{" not in tpl, f"unresolved placeholder: {tpl[tpl.index('{{'):tpl.index('{{')+40]}"
open(f"{OUT}/day{N}.html", "w").write(tpl)
print(f"[day{N}] html assembled from template — shell not re-emitted")
PY
```

4. Call `present_files [dayN.html, dayN-quiz.js]` once, then end the turn.

**Between batches** — end with exactly (render "Day N is ready" when the batch is a single day, e.g. the first batch):
> *"✅ {Day N is ready | Days X–Y are ready} · ▰▰░░░░ {done}/{total} days · Reply `continue` for next batch, `preview` to see a sample Q from Day {next} first, or `pause` to stop here."*

**HARD STOP — do NOT proceed to the next batch without explicit user approval.**

**After the final batch** — assemble `question-bank.js` mechanically (zero question re-emission).

> **HARD RULE — NEVER hand-write `question-bank.js`.** It must always be built by running the Python block below. The output must be an **object keyed by day/mock** (not a flat array). A flat array will break heatmap and quick-quiz. Run the code; do not emit the file contents inline.

```python
import re, json, os

OUT = "/mnt/user-data/outputs/SLUG"
N   = 7  # total days; study days = N-1

bank = {}

# Study days: extract QUESTIONS array literal from each sidecar
for f in sorted(os.listdir(OUT)):
    m = re.match(r'day(\d+)-quiz\.js', f)
    if not m: continue
    content = open(f'{OUT}/{f}').read()
    arr = re.search(r'const QUESTIONS\s*=\s*(\[[\s\S]*?\n\]);', content)
    if arr:
        bank[f'day{m.group(1)}'] = arr.group(1)

# Mock arrays: extract MOCK1 / MOCK2 from the generated mock page
mock_content = open(f'{OUT}/day{N}.html').read()
for label in ('MOCK1', 'MOCK2'):
    arr = re.search(rf'const {label}\s*=\s*(\[[\s\S]*?\n\]);', mock_content)
    if arr:
        bank[label.lower()] = arr.group(1)

# Write question-bank.js
parts = ',\n'.join(f'  "{k}": {v}' for k, v in bank.items())
open(f'{OUT}/question-bank.js', 'w').write(
    f'/* question-bank.js — auto-assembled from per-day sidecars; do not edit */\n'
    f'const QUESTION_BANK = {{\n{parts}\n}};\n'
)
print(f'[QB] question-bank.js built: {list(bank.keys())}')
```

Then `present_files` with all output files.

---

### Study day page — placeholders

| Placeholder | Value |
|---|---|
| `{{DAY_NUM}}` | Day number (unpadded — e.g. `1`, `7`) |
| `{{DAY_NUM_PADDED}}` | Zero-padded day number (e.g. `01`, `07`) — used in the page-hero mono numeral |
| `{{DAY_TITLE}}` | Day title |
| `{{DAY_DOMAIN}}` | Parent topic |
| `{{DOMAIN_WEIGHT_META}}` | Optional " · Domain weight 18%" suffix for the page-meta line. Pass `""` if no weight. |
| `{{H}}` | Hours from input |
| `{{N}}` | Total days (for the "Day X of N" badge) |
| `{{LOGO_3CHAR}}` | Monogram |
| `{{DAY_QUIZ_FILE}}` | `dayN-quiz.js` |
| `{{STUDY_MD_START}}` block | Markdown content between the markers |

> **STUDY_MD escaping is now automatic.** The day-page assembly heredoc (above) escapes backticks and `${` against the raw `/tmp/dayN-study.md` before splicing into the JS template literal. Write `dayN-study.md` as **plain Markdown — do not pre-escape it**. This is why the heredoc owns the splice: escaping can no longer be forgotten per fenced code block (the historical cause of the "study section blank until Reset" bug).

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

**Reading section structure (Mayer/Sweller principles) — apply to every study day:**

1. **Key Terms block first** — open with a `> [!info] Key Terms` callout listing 5–8 anchor concepts with a one-line definition each. This must appear before the first `##` heading.
2. **Segment into ~300-word sections** — each major `##` heading covers one concept in ~300 words. End each section with an inline self-check: `> [!info] Quick Check\n> Question? || Answer` (learner covers the answer before revealing).
3. **Signal** — bold each key term on first use only. Use `> [!warn]` callouts to mark critical distinctions or common failure points.
4. **Worked example** — at least one concrete, fully-fleshed worked example per concept using the `EXAMPLE:` prefix.
5. **Anti-pattern** — follow each worked example with a 1–2 sentence anti-pattern note showing what commonly goes wrong and why.
6. **Coherence** — cut any interesting-but-irrelevant tangent aggressively. If a fact is not testable in the quiz or not needed to pass the exam, remove it.

**Worked-example fading (Sweller) — for procedural content (step-by-step processes, configs, algorithms):**

- x 0–4: 2 full worked examples → 1 partial (final step shown as `[?]`, learner predicts before reading on) → 1 unscaffolded problem.
- x 5–7: 1 full worked example → 1 partial → 1 unscaffolded problem.
- x 8–10: 1 full worked example → 1 unscaffolded problem (expertise-reversal — excess scaffolding hurts experts at this level).

Target ≈ WORDS_PER_HOUR × h words (code + tables excluded). End with `## Key Takeaways` (5–8 bullets) then `## Further Reading` (3–6 links: `📄` web / `▶` YouTube). Only links you're highly confident exist; uncertain YouTube links → `https://www.youtube.com/results?search_query=...`.

### `dayN-quiz.js` sidecar

```js
const QUESTIONS = [
  // 30 typed question objects (see schemas below)
];
```

Nothing else in the sidecar.

---

## QUESTIONS schema — strict composition: 23 MCQ + 1 match + 2 order + 4 fillblank, domain-interleaved

**Domain interleaving rule** — the QUESTIONS array must interleave domains throughout; never cluster questions from one domain consecutively. Aim for no more than 2 consecutive questions from the same domain. Mix question types within domain interleaving (e.g. MCQ-domain-A → fillblank-domain-B → MCQ-domain-C → MCQ-domain-A → order-domain-B). This forces the learner to discriminate between concepts — stronger encoding than blocked practice.

### MCQ (`type: "mcq"`)

```js
{
  type: "mcq",
  domain: "Agent Architecture",   // MUST match a HEATMAP_DOMAINS entry exactly
  sig: "agent-loop-stop-reason",  // 3–6 hyphenated keywords; STABLE; used for dedup
  text: "Question stem.",
  choices: ["A…","B…","C…","D…"],
  correct: 0,
  explanation: "Two-part format — (1) One sentence: why the correct answer is right. (2) One line per wrong choice: identify by a short content excerpt (NOT a position letter — choices shuffle at runtime), then why it is wrong. The 'Ask Google' button handles deep elaboration; keep each line terse. ≤80 words total."
}
```

**Distractor quality rule** — all choices comparable in length, specificity, plausibility. Wrong answers use real domain terminology and near-correct reasoning. Brevity, vagueness, or obvious incorrectness in a distractor is forbidden.

**Distractor sourcing rule** — before writing the choices for each MCQ, scan the source document and the study-day content for explicitly-stated wrong approaches, anti-patterns, or common mistakes (e.g. "prompt-based enforcement of business rules", "returning `[]` on access failure", "setInterval drift in timers"). Use these as the wrong choices — they are already validated wrong-answer candidates. Only fall back to invented distractors when the source has no stated anti-patterns for that topic.

**Length parity rule** — all four choices must be within ±25% word count of each other. A one-word correct answer next to three-word distractors signals the answer by length.

**Bloom taxonomy mix** — across each day's 23 MCQs: ~30% Remember/Understand (direct recall stem, e.g. "What does X do?"), ~50% Apply (scenario vignette: 1–2 sentence real-world situation then the question; stem must be answerable without seeing the choices), ~20% Analyse/Evaluate (compare approaches, diagnose a misconfiguration, predict an outcome). Apply and Analyse items require scenario text in the `text` field.

### Match (`type: "match"`) — exactly 4 pairs

```js
{ type:"match", domain:"...", sig:"...", text:"Match each term to its definition.",
  pairs:[{term:"...",definition:"..."},...],
  explanation:"≤80 words. One sentence why the correct pairings hold; one line per commonly confused pair." }
```

### Order (`type: "order"`)

```js
{ type:"order", domain:"...", sig:"...", text:"Arrange in order.",
  items:["...","...","...","..."],
  correctOrder:[0,1,2,3],
  explanation:"≤80 words. State the causal or logical reason the correct sequence is in that order — not just what the sequence is." }
```

### Fill-Blank (`type: "fillblank"`)

```js
{ type:"fillblank", domain:"...", sig:"...",
  text:"Sentence with ___BLANK___ marker.",
  blank_position:"___BLANK___",
  wordBank:["correct","wrong1","wrong2","wrong3","wrong4","wrong5"],
  correct:0,
  explanation:"≤80 words." }
```

**Fill-blank authoring rule** — test specific, nameable terms or procedure steps; never vague or abstract concepts. The `wordBank` must contain plausible near-correct terms (synonyms, related-but-distinct concepts) — not obviously wrong fillers. With 4 fill-blank questions per day, target: 2 terminological (key concept names), 1 procedural (a specific step in a sequence), 1 configurational (a specific value, flag, or parameter). This format forces recall over recognition.

### Mock question (no `type`, no `hints` — has `domain` and `sig` for weighted scoring + dedup)

```js
{ text, choices:["A…","B…","C…","D…"], correct:0, explanation:"...", domain:"...", sig:"..." }
```

---

## Mock day — placeholders

The mock page (`day{N}.html`) is assembled the same way as day pages — **do NOT hand-write the HTML shell.** Emit only the two question arrays; a Python heredoc wraps them using `mock-template.html` read from disk.

1. After running the disk-based dedup scan (see QUESTION DEDUPLICATION), author MOCK1 + MOCK2 and `create_file /tmp/mock-arrays.js` containing exactly:
   ```js
   const MOCK1 = [ … ];
   const MOCK2 = [ … ];
   ```
2. Run the assembly heredoc:

```python
python3 << 'PY'
import re
SRC = "/mnt/skills/user/helpmeprep/assets"
OUT = "/mnt/user-data/outputs/SLUG"
N   = 7   # mock day number

vars = {
  "DAY_NUM": str(N), "DAY_NUM_PADDED": str(N).zfill(2), "N": str(N),
  "LOGO_3CHAR": "…", "MOCK_QCOUNT": "30",
  "MOCK_MINUTES": "60", "MOCK_PASSMARK": "720 / 1000",
  "MOCK_PASSMARK_NUM": "0.72", "DOMAIN_WEIGHTS_JSON": '{"…":0.27}',  # JSON.stringify(DOMAIN_WEIGHTS), or {}
}
tpl = open(f"{SRC}/mock-template.html").read()
for k, v in vars.items():
    tpl = tpl.replace("{{"+k+"}}", v)

arrays = open("/tmp/mock-arrays.js").read()
m1 = re.search(r"const MOCK1\s*=\s*(\[[\s\S]*?\n\]);", arrays).group(1)
m2 = re.search(r"const MOCK2\s*=\s*(\[[\s\S]*?\n\]);", arrays).group(1)

def splice(tpl, start, end, body):           # literal partition — no backreference hazard
    pre, s1, rest = tpl.partition(start); mid, s2, post = rest.partition(end)
    assert s1 and s2, f"markers not found: {start}"
    return pre + body + post

# Keep each array terminated by `\n];` so the question-bank extractor regex still matches.
tpl = splice(tpl, "/* {{MOCK1_QUESTIONS_START}} */", "/* {{MOCK1_QUESTIONS_END}} */", f"/* MOCK1 */\nconst MOCK1 = {m1};")
tpl = splice(tpl, "/* {{MOCK2_QUESTIONS_START}} */", "/* {{MOCK2_QUESTIONS_END}} */", f"/* MOCK2 */\nconst MOCK2 = {m2};")

assert "{{" not in tpl, f"unresolved placeholder: {tpl[tpl.index('{{'):tpl.index('{{')+40]}"
open(f"{OUT}/day{N}.html", "w").write(tpl)
print("[mock] html assembled from template — shell not re-emitted")
PY
```

Then assemble `question-bank.js` (it extracts MOCK1/MOCK2 from the page just written) and `present_files`.

| Placeholder | Value |
|---|---|
| `{{DAY_NUM}}` | Mock day number (e.g. `7`) |
| `{{DAY_NUM_PADDED}}` | Zero-padded (e.g. `07`) — page-hero mono numeral |
| `{{N}}` | Total days (for "Day X of N") |
| `{{MOCK_QCOUNT}}` | Questions per mock |
| `{{MOCK_MINUTES}}` | Minutes per mock |
| `{{MOCK_PASSMARK}}` | Display e.g. `"720 / 1000"` or `"70%"` |
| `{{MOCK_PASSMARK_NUM}}` | JS fraction e.g. `0.72` |
| `{{DOMAIN_WEIGHTS_JSON}}` | `JSON.stringify(DOMAIN_WEIGHTS)` |
| `{{MOCK1_QUESTIONS_START}}` / `{{MOCK1_QUESTIONS_END}}` | markers MOCK1 array is spliced between |
| `{{MOCK2_QUESTIONS_START}}` / `{{MOCK2_QUESTIONS_END}}` | markers MOCK2 array is spliced between |

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

## Design System

Visual design is fully encoded in `styles.css` + `theme.js` (cp'ed verbatim) — Claude generates none of it. The only generation-relevant facts are the `.day-tile` state classes (`.done` / `.cur` / `.upcoming` / `.mock`, set in the Step 6 `day_tile()` function) and the page-hero structure (in `day-template.html`, read from disk by the assembly heredoc). For the full motion vocabulary, semantic-button table, colour tokens, and keyframe inventory, read `reference/design-system.md` — needed only when modifying the look, never for a normal build.
---

## Key invariants

- `h` = study content only. Study-day quizzes untimed and self-paced.
- Day n = mocks only. No study material on day n.
- Study-day QUESTIONS array: exactly QUIZ_PER_DAY (default 30) entries — never fewer. Review-pool cards injected by quizlib.js are *additive* at runtime and are NOT part of the QUESTIONS array. Never reduce the authored question count to account for expected review injections. Score denominator = QUESTIONS.length + _reviewCards.length (runtime), not a fixed cap. Hypercorrection priority: quizlib.js flags certain-but-wrong (false-certainty) answers and routes them to the review pool — these items surface first within the daily review queue on subsequent days as the highest-value correction targets.
- `explanation` is a single string on all question types. Never an `explanations` array.
- `hints` field never authored — derived client-side by quizlib.js.
- Mock questions: no `type`, no `hints`, but **must** have `domain` and `sig`.
- MOCK1 and MOCK2 arrays: each must contain exactly JD_MOCK_QUESTIONS entries (default 30 for JD; mirror real-exam count for exam source, e.g. 30 per mock for CCA-F). No spaced-repetition injection occurs in mocks. Generate all questions from scratch — never leave a mock short expecting runtime top-ups.
- Mock features absolute exclusions: confidence, XP, streak, hints, lives.
- Foundation assets are `cp`-ed verbatim — NEVER use `create_file` to retype them. **Every HTML page (index, every day, mock) is assembled by a Python heredoc that reads its template from disk and substitutes/splices — NEVER hand-write a page's HTML shell with `create_file`.** The only things `create_file` emits are content payloads: each day's reading markdown (to `/tmp/dayN-study.md`), each `dayN-quiz.js`, and the mock arrays (to `/tmp/mock-arrays.js`).
- Resume affects tone and example framing only; never compresses coverage; never overrides `x`.
- Do not read or re-read any asset file into context — templates are read from disk by the Python heredocs (Step 1.3).
- Batch handoff message is one line per the format in Step 7. First batch covers a single day (`FIRST_BATCH_DAYS = 1`); when the batch is one day, render "Day N is ready", not "Days N–N".
- DAYS_IN_BATCH and FIRST_BATCH_DAYS are silent — never prompt.
- Before presenting any file: grep it for remaining `{{`. If any are found, print each unresolved token (e.g. `{{DAY_TITLE}}`, `{{MOCK1_QUESTIONS_START}}`) and do NOT present the file until resolved. A count alone is not enough — name every unresolved token. (The assembly heredocs also `assert "{{" not in tpl` before writing — keep that assert.)
- MCQ choices must NEVER reference sibling choices by position letter (e.g., "Both A and B", "All of the above except C"). Choices are shuffled at runtime — any lettered cross-reference becomes wrong after shuffling. Replace such references with the actual text of the referenced choices inline (e.g., "Both 'tool descriptions' and 'tool_choice'" instead of "Both A and B").
- STUDY_MD backtick/`${` escaping is now performed in the day-page assembly heredoc (`.replace("`","\\`").replace("${","\\${")`) against the raw `/tmp/dayN-study.md` — so write that file as plain Markdown and do NOT pre-escape it. The splice uses `str.partition`, never `re.sub` (re.sub interprets backreferences in the replacement and corrupts content with regex/Windows paths).

---

## Changelog

See `CHANGELOG.md`. Current version: **v1.5**. (Rule for future entries: max 2 lines, newest first, list only what was added/changed. Do not bump the version mid-fine-tuning.)
