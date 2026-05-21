# helpmeprep — Interactive Study Hub Builder v1.4

> **Build a Blueprint-themed multi-day study hub from any exam notes, syllabus, or job description — in one prompt.**

[![Version](https://img.shields.io/badge/version-1.4.0-5c6ef8?style=flat-square)](https://github.com/psingha776/helpmeprep/releases/tag/v1.4)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Skill](https://img.shields.io/badge/type-Claude%20Skill-blueviolet?style=flat-square)](https://docs.anthropic.com)

---

## What is helpmeprep?

`helpmeprep` is a **Claude skill** that transforms raw study material into a fully interactive, gamified web-based learning hub — no build tools, no backend, no setup. Drop in your exam blueprint or job description and get a complete multi-day study app with quizzes, progress tracking, mock tests, and retrospection — all as self-contained HTML/CSS/JS files that work offline.

---

## Features (v1.4)

### Study Days

| Feature | Details |
|---|---|
| **Quiz Types** | 30 questions/day — 24 MCQ + 2 Match Pairs + 2 Sequence Order + 2 Fill-in-the-Blank |
| **Keyboard Shortcuts** | 1–4 select choices, H hint, right-arrow/N next, ? cheatsheet |
| **Dark Mode** | Toggle on every page; preference saved to localStorage |
| **Per-Question Timer** | Elapsed seconds per question, resets on advance |
| **Tiered Hints** | 3-level progressive hints (client-side, auto-derived from explanation) |
| **Spaced Repetition** | Wrong answers auto-queued into a cross-day review pool (up to 5/day) |
| **Confidence Rating** | Guessed / Sure / Certain — flags Lucky Guesses and False Certainties |
| **XP + Levels** | Earn XP; level up Beginner → Associate → Practitioner → Architect → Fellow |
| **Streak Tracking** | Daily study streak with live sidebar display |
| **Lives / Challenge Mode** | 5-heart opt-in mode; 1-hour lock on 0 hearts |
| **Sticky Notes** | Per-heading notes auto-saved; coachmark on first visit |
| **Note Count in Sidebar** | nav.js shows saved note count next to each day |
| **Aggregate Notes Dashboard** | Collapsible panel on index.html listing all notes across days |
| **Quick-Quiz Mode** | 10-question random drill from index.html |
| **Domain Heatmap** | Live canvas heatmap — mastery % per domain per day |
| **Ask Google** | One-click contextual search on every answered question |

### Mock Tests

| Feature | Details |
|---|---|
| **Timed Mock** | Mirrors real exam format (count, time, pass mark from source) |
| **Domain-Weighted Score** | Weighted average when DOMAIN_WEIGHTS populated, simple average otherwise |
| **Mark for Review** | Flag questions during attempt; flagged items highlighted in retrospection |
| **Completion Canvas** | Confetti + score reveal after both mocks complete |
| **Retrospection Mode** | Full review with explanations + Ask Google |
| **Retry Mode** | Re-attempt any mock with reshuffled choices and reset timer |
| **Clean Separation** | No XP, hints, confidence, lives, or streaks on mock pages — ever |
| **Question Dedup** | 3-layer sig-field enforcement: generation-time + schema + runtime |

### Offline Support

The generated hub registers a service worker on first load. All assets are pre-cached and the hub runs fully offline thereafter.

### Blueprint Design System
- Deep navy sidebar (`#1e3058`) vs. cool off-white canvas (`#f6f9ff`)
- Indigo accent (`#5c6ef8`) — only warm colour is orange (`#f97316`) on review queue
- Outfit typeface (geometric sans); JetBrains Mono for code blocks
- Signature 24px grid overlay; WCAG AA contrast throughout
- Dark-mode override set on `<html class="dark">` via `theme.js`

---

## Usage

### Trigger Phrases
```
/helpmeprep
"make a study hub"
"prep me for an exam"
"turn this doc into a study deck"
"build a multi-day prep course"
```

### Required Inputs
```
Source     Attach or paste your exam notes, syllabus, or job description.
x / 10     Your current proficiency (0 = none, 10 = expert).
n days     Total days in the plan (days 1–(n-1) = study, day n = mock tests).
h hrs/day  Hours of study material per day (quiz time is not counted).
```

### Example
```
/helpmeprep [attach CCA-F-exam-notes.pdf]
proficiency 4/10 · 7 days · 3 hours/day
```

### Output Structure
```
outputs/{topic-slug}/
├── styles.css            # Blueprint design system tokens
├── quizlib.js            # Quiz engine — all question types, XP, hints, review
├── mocklib.js            # Mock engine — timer, dedup, weighted score, mark-for-review
├── index.js              # Index-page logic — heatmap, quick-quiz, notes dashboard
├── nav.js                # Sidebar navigation + XP/streak/note-count display
├── theme.js              # Dark mode toggle + localStorage persistence
├── service-worker.js     # Offline pre-cache
├── index.html            # Hub landing page
├── day1.html             # Study day 1 (shell + study content)
├── day1-quiz.js          # Study day 1 questions (sidecar)
│   ...
└── day{n}.html           # Mock test day (2 × timed mocks)
```

---

## Model Comparison — Files per Single Batch

> **Files per batch** = how many complete helpmeprep day-pages (~20 K output tokens each) a model can generate in one API call. Higher = fewer round-trips.
>
> Rating: ⭐ = partial file · ⭐⭐ = 1–2 · ⭐⭐⭐ = 3–4 · ⭐⭐⭐⭐ = 5–6 · ⭐⭐⭐⭐⭐ = 7+

### Claude (Anthropic)

| Model | Max Output | Files/Batch | Rating |
|---|---|---|---|
| Claude Haiku 4.5 | 64 K | ~3 | ⭐⭐⭐ |
| Claude Sonnet 4.6 *(default)* | 64 K | ~3 | ⭐⭐⭐ |
| Claude Opus 4.6 | 128 K | ~6 | ⭐⭐⭐⭐ |

> Sonnet 4.6 and Opus 4.6 support up to 300 K output tokens via the `output-300k-2026-03-24` beta header on the Message Batches API at 50 % cost discount (async only, up to 24 h latency).

*Source: platform.claude.com/docs, verified May 2026.*

### OpenAI

| Model | Max Output | Files/Batch | Rating |
|---|---|---|---|
| GPT-4o mini | 16 K | < 1 | ⭐ |
| GPT-4.1 / 4.1 mini | 32 K | ~1 | ⭐⭐ |
| o4-mini / o3 | 100 K | ~5 | ⭐⭐⭐⭐ |

### Gemini (Google)

| Model | Max Output | Files/Batch | Rating |
|---|---|---|---|
| Gemini 2.5 Flash / Pro | ~65 K | ~3 | ⭐⭐⭐ |

### Cross-Model Summary

| Provider | Best Model | Max Output | Suitable? |
|---|---|---|---|
| **Anthropic Claude** | Opus 4.6 | 128 K (300 K async) | ✅ Best fit — native skill |
| **OpenAI** | o3 / o4-mini | 100 K | ✅ Viable with adaptation |
| **Google Gemini** | 2.5 Pro | ~65 K | ⚠️ Viable, smaller batches |
| **OpenAI** | GPT-4.1 | 32 K | ⚠️ Requires multi-call stitching |

---

## Configuration Variables

Editable in `SKILL.md`:

```
DAYS_IN_BATCH            = 2      # day-pages per batch (silent)
QUIZ_PER_DAY             = 30
QUIZ_TYPE_BREAKDOWN      = { mcq: 24, match: 2, order: 2, fillblank: 2 }
REVIEW_POOL_MAX_PER_DAY  = 5
XP_PER_CORRECT           = 10
XP_LEVEL_THRESHOLDS      = [0, 100, 300, 600, 1000]
XP_LEVEL_LABELS          = ["Beginner","Associate","Practitioner","Architect","Fellow"]
HINT_XP_PENALTIES        = [10, 7, 4, 2]   # 0/1/2/3 hints used
JD_MOCK_QUESTIONS        = 30
JD_MOCK_MINUTES          = 60
JD_MOCK_PASSMARK         = 0.70
DOMAIN_WEIGHTS           = {}    # populated for weighted exams only
```

---

## What's New in v1.4

| # | Feature |
|---|---|
| 1 | Keyboard shortcuts (1–4 / H / → / N / ?) |
| 2 | Dark mode toggle + theme.js |
| 3 | Per-question timer |
| 4 | Aggregate notes dashboard on index.html |
| 5 | Domain-weighted mock scoring |
| 6 | Mark-for-review in mock |
| 7 | Service-worker offline cache |
| 8 | Sticky-note first-visit coachmark |
| 9 | Per-day note count in sidebar |
| 10 | Quick-quiz mode |
| 11 | Question dedup via sig field (3-layer) |
| 12 | mocklib.js, index.js, theme.js, service-worker.js extracted as separate assets |
| Fix | STUDY_MD backtick-escape step — prevents silent JS template literal breakage |

---

## License

MIT © [Pranoy Singha](https://linkedin.com/in/psingha776)

---

*Built with Claude Sonnet 4.6 · Skill version 1.4.0 · Blueprint Design System · Model specs verified May 2026*
