# 📚 helpmeprep — Interactive Study Hub Builder `v1.3`

> **Build a Brilliant-style, Blueprint-themed multi-day study hub from any exam notes, syllabus, or job description — in one prompt.**

[![Version](https://img.shields.io/badge/version-1.3.0-5c6ef8?style=flat-square)](https://github.com/psingha776/helpmeprep/releases/tag/v1.3)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Skill](https://img.shields.io/badge/type-Claude%20Skill-blueviolet?style=flat-square)](https://docs.anthropic.com)

---

## What is helpmeprep?

`helpmeprep` is a **Claude skill** that transforms raw study material into a fully interactive, gamified web-based learning hub — no build tools, no backend, no setup. Drop in your exam blueprint or job description and get a complete multi-day study app with quizzes, progress tracking, mock tests, and retrospection — all as self-contained HTML/CSS/JS files.

---

## ✨ Features (v1.3)

### 🎓 Study Days
| Feature | Details |
|---|---|
| **Quiz Types** | 30 questions/day — 24 MCQ + 2 Match Pairs + 2 Sequence Order + 2 Fill-in-the-Blank |
| **Tiered Hints** | 3-level progressive hints (client-side, auto-derived from explanation) |
| **Spaced Repetition** | Wrong answers auto-queued into a cross-day review pool (up to 5 reviews/day) |
| **Confidence Rating** | Guessed / Sure / Certain — flags Lucky Guesses (⭐) and False Certainties (⚠️) |
| **XP + Levels** | Earn XP per correct answer; level up through Beginner → Associate → Practitioner → Architect → Fellow |
| **Streak Tracking** | Daily study streak with live sidebar display |
| **Lives / Challenge Mode** | Toggle 5-heart challenge mode; 1-hour lock on 0 hearts |
| **Sticky Notes** | Per-heading notes auto-saved to localStorage |
| **Ask Google** | One-click contextual search for every answered question |
| **Domain Heatmap** | Live canvas heatmap of mastery % per domain per day |

### 🧪 Mock Tests
| Feature | Details |
|---|---|
| **Timed Mock** | Mirrors real exam format (question count, time limit, pass mark from source) |
| **Completion Canvas** | Confetti + score reveal after both mocks complete |
| **Retrospection Mode** | Full review of all answers with explanations + Ask Google |
| **Retry Mode** | Re-attempt any mock with reshuffled choices and reset timer |
| **Clean Separation** | No XP, hints, confidence, lives, or streaks on mock pages — ever |

### 🎨 Blueprint Design System
- Deep navy sidebar (`#1e3058`) vs. cool off-white canvas (`#f6f9ff`)
- Indigo accent (`#5c6ef8`) throughout — never warm, never orange (except review queue)
- Outfit typeface (geometric sans) at varying weights — no serif
- Signature 24px grid overlay on canvas
- WCAG AA accessible contrast on all text/background pairs

---

## 🚀 Usage

### Trigger Phrases
Any of the following activates the skill in Claude:
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
n days     Total days in the plan (days 1–(n−1) = study, day n = mock tests).
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
├── styles.css          # Blueprint design system — all tokens
├── quizlib.js          # Quiz engine — all question types, XP, hints, review pool
├── nav.js              # Sidebar navigation + XP/streak display
├── index.html          # Hub landing page with day tiles + domain heatmap
├── day1.html           # Study day 1 (shell + study content)
├── day1-quiz.js        # Study day 1 questions (sidecar)
├── day2.html           # Study day 2
├── day2-quiz.js        # Study day 2 questions (sidecar)
│   ...
└── day{n}.html         # Mock test day (2 × timed mocks)
```

---

## 🤖 Model Comparison — Files per Single Batch

> **"Files per batch"** = how many complete helpmeprep day-pages (≈ 20K output tokens each) a model can generate in a single API call before hitting its max output limit. Higher = fewer round-trips, smoother end-to-end generation.
>
> **Rating scale:** ⭐ = partial file only (chunking required) · ⭐⭐ = 1–2 files · ⭐⭐⭐ = 3–4 files · ⭐⭐⭐⭐ = 5–6 files · ⭐⭐⭐⭐⭐ = 7+ files

---

### 🔵 Claude (Anthropic)

| Model | Max Output Tokens | Files per Batch | Rating |
|---|---|---|---|
| Claude Haiku 4.5 | 64,000 | ~3 | ⭐⭐⭐ |
| Claude Sonnet 4.6 *(default)* | 64,000 | ~3 | ⭐⭐⭐ |
| Claude Opus 4.6 | 128,000 | ~6 | ⭐⭐⭐⭐ |
| Claude Opus 4.7 *(flagship)* | 128,000 | ~6 | ⭐⭐⭐⭐ |

> 💡 **Batch API bonus (async only):** Opus 4.7, Opus 4.6, and Sonnet 4.6 support up to **300,000 output tokens** via the `output-300k-2026-03-24` beta header on the Message Batches API — theoretically **~15 files/call** at 50% cost discount. Latency up to 24 hours; not suitable for interactive generation sessions.

> ⚠️ **Note:** Sonnet 4.6's synchronous max output is **64K** (same as Haiku 4.5). The 128K ceiling applies only to Opus 4.6 and 4.7. The default `DAYS_IN_BATCH = 2` in the skill is intentionally conservative and appropriate for Sonnet 4.6.

*Source: Anthropic official model docs — platform.claude.com/docs/en/about-claude/models, verified May 2026.*

---

### 🟢 OpenAI (ChatGPT)

| Model | Max Output Tokens | Files per Batch | Rating |
|---|---|---|---|
| GPT-4o mini | 16,384 | < 1 | ⭐ |
| GPT-4.1 mini | 32,768 | ~1 | ⭐⭐ |
| GPT-4.1 | 32,768 | ~1 | ⭐⭐ |
| o4-mini | 100,000 | ~5 | ⭐⭐⭐⭐ |
| o3 | 100,000 | ~5 | ⭐⭐⭐⭐ |

> 🟡 **Note:** GPT-4o mini and the GPT-4.1 family cannot complete a single full helpmeprep day-page in one call. The o-series reasoning models (o3/o4-mini) close the gap significantly with a 100K output cap — matching Claude Opus on raw output capacity.

*Source: OpenAI official docs (platform.openai.com/docs/models/o4-mini), OpenAI Enterprise FAQ. GPT-4.1 output limit confirmed via OpenAI developer community (32,768 tokens).*

---

### 🔴 Gemini (Google)

| Model | Max Output Tokens | Files per Batch | Rating |
|---|---|---|---|
| Gemini 2.5 Flash Lite | 65,536 | ~3 | ⭐⭐⭐ |
| Gemini 2.5 Flash | 65,535 | ~3 | ⭐⭐⭐ |
| Gemini 2.5 Pro | 65,536 | ~3 | ⭐⭐⭐ |

> ℹ️ **Deprecation note:** Gemini 2.0 Flash and Gemini 1.5 Pro are **shutting down June 1, 2026** and are excluded from this table. The entire current Gemini 2.5 series shares the same ~65K output ceiling across all tiers.

*Source: OpenRouter (Gemini 2.5 Flash, 65,535 max output), Oracle OCI Generative AI docs (Gemini 2.5 Flash-Lite, 65,536 max output), May 2026.*

---

### 📊 Cross-Model Summary

| Provider | Best Model | Max Output | Files/Batch | Suitable for helpmeprep? |
|---|---|---|---|---|
| **Anthropic Claude** | Opus 4.7 | 128K (300K async) | 6 (15 async) | ✅ Best fit — native skill |
| **OpenAI** | o3 / o4-mini | 100K | ~5 | ✅ Viable with adaptation |
| **Google Gemini** | 2.5 Pro / Flash | ~65K | ~3 | ⚠️ Viable, smaller batches |
| **OpenAI** | GPT-4.1 / 4.1 mini | 32K | ~1 | ⚠️ Requires multi-call stitching |
| **OpenAI** | GPT-4o mini | 16K | < 1 | ❌ Requires heavy chunking |

---

## 🐛 What's Fixed in v1.3

v1.3 is a targeted bug-fix release. All nine fixes are already baked into the `assets/` files — no user-facing protocol changes.

| # | File | Issue Fixed |
|---|---|---|
| 1 | `styles.css` | `.app.blueprint` class was a no-op — day pages rendered in the old dark theme instead of Blueprint |
| 2 | `styles.css` | `.mode-btn` (Normal / Challenge toggle) had no CSS — browser defaults only; now a segmented pill capsule |
| 3 | `styles.css` | `.hint-btn`, `.hint-box`, `.hint-label` had no CSS — hint UI was completely unstyled |
| 4 | `styles.css` | `.choice.hint-greyed` class injected by `quizlib.js` had no CSS rule — greyed choice was invisible |
| 5 | `styles.css` | `.btn` `<a>` tags (e.g. "Start Day 1") inherited `color: var(--accent)` — indigo text on indigo button |
| 6 | `styles.css` | `.conf-btn`, `.conf-row`, `.conf-label` had no CSS — confidence rating row was completely unstyled |
| 7 | `quizlib.js` | `renderMatch()` re-rendered already-matched pairs as live buttons — partial-match re-render bug |
| 8 | `styles.css` | All match / order / fill-blank interactive classes had zero CSS — these question types were completely unstyled |
| 9 | `quizlib.js` | `inlineFmt()` lacked `[text](url)` regex — all hyperlinks in Further Reading rendered as raw text |

---

## 📦 What's New in v1.2

| # | Feature | Description |
|---|---|---|
| 1 | **Spaced Repetition Queue** | Wrong answers auto-enter `hmp_review_pool`; up to 5 review cards injected at top of next study sessions |
| 2 | **Confidence Self-Rating** | Per-question Guessed / Sure / Certain rating with Lucky Guess ⭐ and False Certainty ⚠️ flagging |
| 3 | **XP + Streak + Levels** | Full gamification — XP per correct answer, daily streak, 5-tier level system with toast animation |
| 4 | **Tiered Hint System** | 3-level progressive hints (client-side derived); XP penalty scales with hints used |
| 5 | **Domain Heatmap** | Canvas-rendered mastery grid — domain × day, live from localStorage |
| 6 | **Match / Order / Fill-Blank** | Three new question types added alongside MCQ; strict 24+2+2+2 composition per day |
| 7 | **Lives / Challenge Mode** | Toggle 5-heart stakes mode per day session; 1-hour lockout on 0 hearts |
| 8 | **Ask Google** | Contextual Google search button on every answered question (study) and retrospection (mock) |
| 9 | **Inline Sticky Notes** | Per-heading contenteditable notes auto-saved to localStorage |
| 10 | **Mock Retrospection + Retry** | Post-completion canvas, full answer review, per-mock retry with reshuffled choices |
| 11 | **Blueprint Theme** | New design system — steel-navy sidebar, indigo accent, Outfit typeface, 24px grid overlay |

---

## 🛠 Configuration Variables

Editable in `SKILL.md` to tune defaults:

```
DAYS_IN_BATCH         = 2      # day-pages per generation batch (silent)
QUIZ_PER_DAY          = 30     # questions per study day
QUIZ_TYPE_BREAKDOWN   = { mcq: 24, match: 2, order: 2, fillblank: 2 }
REVIEW_POOL_MAX_PER_DAY = 5    # max review cards per session
XP_PER_CORRECT        = 10
XP_LEVEL_THRESHOLDS   = [0, 100, 300, 600, 1000]
XP_LEVEL_LABELS       = ["Beginner","Associate","Practitioner","Architect","Fellow"]
HINT_XP_PENALTIES     = [10, 7, 4, 2]   # XP with 0/1/2/3 hints used
JD_MOCK_QUESTIONS     = 30
JD_MOCK_MINUTES       = 60
JD_MOCK_PASSMARK      = 0.70
```

---

## 📄 License

MIT © [Pranoy Singha](https://linkedin.com/in/psingha776)

---

*Built with Claude Sonnet 4.6 · Skill version 1.3.0 · Blueprint Design System · Model specs verified May 2026*
