# helpmeprep

> **Turn any exam notes, syllabus, or job description into a fully interactive multi-day study hub in minutes.**

`helpmeprep` generates a complete, self-contained, offline-ready HTML/CSS/JS study platform — styled after [Brilliant.org](https://brilliant.org) — from a source document and three sizing variables.

The **assets** (`styles.css`, `quizlib.js`, `nav.js`, and the HTML templates) are fully model-agnostic: any LLM that can follow instructions and write files can drive them. The **`SKILL.md`** file is the Claude-native entry point, using Claude Projects' skill convention for drop-in activation — but the generation logic it contains is plain natural language that ports cleanly to GPT, Gemini, Copilot, or any agentic framework (LangChain, CrewAI, AutoGen, etc.).

---

## What it produces

Given a source document + proficiency + days + hours/day, the skill outputs:

| File | Purpose |
|---|---|
| `index.html` | Landing page with day-grid and "How to use" card |
| `styles.css` | Full dark-theme design system (Brilliant-style) |
| `nav.js` | Auto-built collapsible sidebar navigation |
| `quizlib.js` | Quiz engine — score-locks on first pick, explore mode after |
| `day1.html` … `day(n−1).html` | Study pages: rich content + 30-question quiz each |
| `day(n).html` | Two timed full-length mock exams with pass/fail scoring |

**No build step. No server. No dependencies.** Open `index.html` in any browser.

---

## Quick start

### Claude Projects (native)

1. Copy `SKILL.md` into your Claude project's skill folder (e.g. `skills/helpmeprep/SKILL.md`).
2. Copy the `assets/` folder next to `SKILL.md`.
3. Trigger in any Claude conversation:

```
/helpmeprep [attach your-notes.pdf]
proficiency 4/10 · 7 days · 2 hours/day
```

Claude will confirm the plan and begin generating files.

### Other LLMs and agentic frameworks

The generation logic in `SKILL.md` is plain natural language — it is not Claude-specific. To use with another model:

| Platform | How to use |
|---|---|
| **ChatGPT / Copilot / Gemini** | Paste the contents of `SKILL.md` as a system prompt or custom instruction |
| **LangChain / CrewAI / AutoGen** | Use the Step 1–7 protocol as your agent's task prompt; point file-write tools at the `assets/` folder |
| **Any agentic framework** | Feed `SKILL.md` as context, provide the `assets/` templates as static resources, and invoke with the four inputs |

The `assets/` files (CSS, JS, HTML templates) require no modification regardless of which model drives them.

---

## Inputs

| Input | Description | Example |
|---|---|---|
| **Source** | Attach or paste exam notes, a syllabus, or a job description (PDF, .md, .txt, .docx, or pasted text) | `notes.pdf` |
| **x / 10** | Your current proficiency (0 = none, 10 = expert). Controls tone and analogy depth. | `3` |
| **n days** | Total days in the plan. Days 1–(n−1) = study + quiz. Day n = timed mocks. | `7` |
| **h hrs/day** | Hours of study material per day (quiz time is not counted). | `2` |

### Trigger phrases

The skill fires on any of:

- `/helpmeprep`
- "make a study hub"
- "prep me for an exam" / "prep me for an interview"
- "turn this doc into a study deck / course"
- "build a multi-day prep course"
- Attaching a syllabus/research doc/JD with timing variables

---

## What gets generated — in detail

### Study days (day 1 to n−1)

Each page contains:

- **Page hero** — day number, domain label, estimated hours
- **Study section** — `WORDS_PER_HOUR × h` words of content (code/tables excluded) using:
  - `<h2>` / `<h3>` section hierarchy
  - `.card` concept boxes
  - `.callout` asides (info / success / warn / error)
  - `.example` worked examples with syntax-tinted `<pre><code>` blocks
  - `.badges` mental-model tags
  - `.table-wrap` tables
- **Key takeaways** — 5–8 bullet summary at the end of each study section
- **Further reading** — 3–6 curated links (official docs + YouTube) per day
- **30-question quiz** — exam-level distractors, per-choice explanations, score locks on first pick, explore mode thereafter, sticky progress bar

### Mock day (day n)

- Two independent timed exams (no question reuse between mocks)
- Same domain-weight distribution across both mocks
- Countdown timer with colour warnings (yellow → red)
- Submit manually or auto-submit on timeout
- Per-question explanations revealed on submit
- Pass / fail verdict with score display

---

## Supported source types

| Type | How it's detected |
|---|---|
| **Exam / research doc** | Domain weights %, sample questions, "exam covers", chapters, passing score, test format |
| **Job description (JD)** | Responsibilities, requirements, years of experience, company name + role title, benefits |

- **Exam source** → mirrors the real exam exactly (question style, distractor sophistication, domain weight distribution, pass mark).
- **JD source** → difficulty scales with stated YoE (entry / mid / senior / staff). Mock defaults: 30 questions, 60 minutes, 70% pass mark.

---

## Tunable variables

Edit these in `SKILL.md` to change global defaults:

```
WORDS_PER_HOUR        = 1200    # study content target per hour
EXPLANATION_MAX_WORDS = 35      # per-choice explanation hard cap
BATCH_SIZE            = 2       # day-page files per generation batch
QUIZ_PER_DAY          = 30      # quiz questions per study day
JD_MOCK_QUESTIONS     = 30      # questions per mock (JD source)
JD_MOCK_MINUTES       = 60      # minutes per mock (JD source)
JD_MOCK_PASSMARK      = 0.70    # pass fraction (JD source)
```

---

## Generation protocol

1. The model reads source + resume (if present) once at the start — not again.
2. Foundation files (`styles.css`, `quizlib.js`, `nav.js`, `index.html`) are generated first and presented immediately.
3. Day pages are generated in **batches of 2**. After each batch the model pauses and asks what to do next — you can review, request edits, or continue.
4. The mock day is always the final batch.

> **Hard stop between batches** — the model will not auto-continue to the next batch. This is intentional to let you review and save files progressively.

---

## File structure

```
helpmeprep/
├── SKILL.md              ← Claude-native entry point (also portable to other LLMs)
├── README.md             ← This file
├── CONTRIBUTING.md       ← How to contribute
├── LICENSE               ← MIT
└── assets/
    ├── styles.css        ← Complete dark-theme design system (model-agnostic)
    ├── quizlib.js        ← Quiz engine (model-agnostic)
    ├── nav.js            ← Sidebar navigation builder (model-agnostic)
    ├── index-template.html   ← Landing page template
    ├── day-template.html     ← Study day template
    └── mock-template.html    ← Mock exam template
```

---

## Examples

### Exam prep (7-day CCA-F sprint)

```
/helpmeprep [attach cca-f-research-notes.pdf]
proficiency 2/10 · 7 days · 2 hours/day
```

Produces: `index.html` + `day1.html`–`day7.html` (6 study days × 30 quiz questions) + `day8.html` (2 × 60 questions, 120 min, 72% pass mark).

### Interview prep from a JD (5-day plan)

```
/helpmeprep [paste JD text]
proficiency 6/10 · 5 days · 1.5 hours/day
```

Produces: `index.html` + `day1.html`–`day4.html` (4 study days × 30 quiz questions) + `day5.html` (2 × 30 questions, 60 min, 70% pass mark).

---

## Design system overview

The `styles.css` implements a complete dark-theme design system with:

- CSS custom properties for easy theming (`--bg-primary`, `--accent`, `--success`, etc.)
- Responsive sidebar (sticky desktop / slide-in mobile)
- Card, callout, example, badge, table, progress-bar, timer, and results components
- Smooth animations and transitions
- Mobile-first breakpoints at 900px and 480px

To retheme, override the `:root` variables at the top of `styles.css`.

---

## Requirements

**Claude Projects (native path)**
- A Claude Project or API access with file reading enabled.
- The `assets/` folder must sit alongside `SKILL.md` at `skills/helpmeprep/assets/`.
- Output goes to `/mnt/user-data/outputs/{topic-slug}/` by default.

**Other LLMs / frameworks**
- Any model with sufficient context window to hold `SKILL.md` + source document.
- A file-write mechanism so the model can produce the output HTML/CSS/JS files.
- The `assets/` folder accessible as static resources at generation time.

---

## License

MIT — see [LICENSE](LICENSE).

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
