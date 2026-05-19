# Changelog

All notable changes to **helpmeprep** will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.0] — 2026-05-19

v1.3 is a targeted bug-fix release addressing nine visual/rendering regressions that shipped in v1.2. All fixes are confined to `assets/styles.css` and `assets/quizlib.js`. No changes to `SKILL.md` protocol, question schemas, or generation flow.

### Fixed

- **`styles.css` — Blueprint theme inactive on day pages** — `.app.blueprint {}` block was a no-op; day pages rendered in the old dark theme. Added a complete remapping of `--bg-*`/`--text-*`/`--accent` tokens to the Blueprint palette and a `body:has(.app.blueprint)` rule for the body background.
- **`styles.css` — `.mode-btn` unstyled** — Normal / Challenge mode toggle rendered with browser defaults only. Redesigned as a segmented pill capsule: Normal uses indigo gradient, Challenge uses fire-orange gradient.
- **`styles.css` — `.hint-btn`, `.hint-box`, `.hint-label` unstyled** — hint UI had zero CSS. Styled with an amber pill button, tinted reveal container, and an uppercase tier label.
- **`styles.css` — `.choice.hint-greyed` rule missing** — `quizlib.js` injected this class to grey out a wrong choice, but no CSS rule backed it; the choice remained fully visible. Added `opacity: 0.25; pointer-events: none; filter: grayscale(0.5)`.
- **`styles.css` — `.btn <a>` link colour leak** — the global `a { color: var(--accent) }` rule caused `.btn`-wrapped anchor tags (e.g. "Start Day 1") to show indigo text on an indigo button. Scoped the rule to `a:not(.btn):not(.btn-secondary)` and added `.blueprint .btn { color: #fff }`.
- **`styles.css` — `.conf-btn`, `.conf-row`, `.conf-label` unstyled** — confidence rating row had no CSS. Applied traffic-light semantics: Guessed = coral, Sure = amber, Certain = emerald with glow rings.
- **`quizlib.js` — `renderMatch()` partial-state re-render bug** — already-matched pairs were re-rendered as live, clickable buttons after each subsequent pair was attempted. Fixed by building `matchedTerms`/`matchedDefs` Sets from `qd.matched` before rendering and immediately locking matched buttons with the `correct-pair` + `disabled` classes.
- **`styles.css` — match / order / fill-blank question types completely unstyled** — all interactive classes for the three non-MCQ question types had zero CSS. Full styling pass added: `.match-term-btn`, `.match-def-btn`, `.match-cols`, `.order-item`, `.drag-handle`, `.btn-check`, `.word-pill`, `.blank-slot`, `.btn-submit-blank`, `.show-explanation`, `.explanation-text`, `.ag`, `.shake`.
- **`quizlib.js` — `inlineFmt()` did not handle Markdown links** — `[text](url)` syntax was not matched; all hyperlinks in Further Reading sections rendered as raw text. Added `.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" ...>$1</a>')` before bold/italic/code replacements.

### Not changed
- `SKILL.md` — protocol, tunable variables, question schemas, and generation flow are unchanged from v1.2.
- `assets/nav.js`, `assets/index-template.html`, `assets/day-template.html`, `assets/mock-template.html` — unchanged from v1.2.

---

## [1.2.0] — 2026-05-17

### Added
- **Spaced Repetition Queue** — wrong answers are automatically pushed to `hmp_review_pool` (localStorage). At the start of each study-day quiz, up to 5 review cards are injected above the main questions with an orange left-border and a `🔁 Review` badge. A "Clear Review Queue" button (with confirmation) lets users reset the pool.
- **Confidence Self-Rating** — after locking a choice, three confidence buttons appear: `Guessed`, `Sure`, `Certain`. Default is "Sure" if skipped. Flagging rules: `guessed + correct` → Lucky Guess ⭐ (added to review pool); `certain + wrong` → False Certainty ⚠️ (added to review pool). A summary line is shown after all questions are answered.
- **XP + Levels system** — correct answers earn XP (10 base; 15 for review-card correct; 12 for "Certain" confidence). Five tiers: Beginner → Associate → Practitioner → Architect → Fellow at thresholds 0 / 100 / 300 / 600 / 1000 XP. Toast animations (`+10 XP`) float and fade on correct answers. XP and level are persisted in localStorage and displayed live in the sidebar footer.
- **Daily streak tracking** — study streak incremented once per calendar day a quiz is attempted. Shown in sidebar footer as `🔥 N-day streak`.
- **Tiered hint system** — a `💡 Hint` button appears on unanswered questions. Three progressive hints revealed cumulatively (client-side, no authored hint text required): Hint 1 — one wrong choice greyed out; Hint 2 — first sentence of the `explanation`; Hint 3 — domain tag + key phrase from `explanation`. After all three: button disabled and replaced with "All hints used". XP for correct scales: 0 hints → 10, 1 → 7, 2 → 4, 3 → 2.
- **Domain Mastery Heatmap** — rendered on `index.html` as a canvas block below the day-tile grid. Rows = exam domains, columns = study days. Four-stop colour scale from no-data indigo-tint to `rgba(92,110,248,0.72)` at 71–100% mastery. Data sourced live from per-day localStorage keys written by `quizlib.js`. `HEATMAP_DOMAINS` is populated at generation time from the source document.
- **Match Pairs question type (`type: "match"`)** — 2 per study day. Four term–definition pairs; left column = shuffled terms as buttons, right column = shuffled definitions. Click one term + one definition to attempt a pair; correct locks green with a connecting line, incorrect shakes and resets. XP: +10 with zero wrong attempts, +5 otherwise. No hints, no confidence rating.
- **Sequence Ordering question type (`type: "order"`)** — 2 per study day. Drag-and-drop cards with grab handle `⋮⋮`. "Check Order" button below the list. Correct → green; wrong → red with correct position revealed. Two wrong attempts locks the question and reveals the correct order. XP: +10 first attempt, +5 second.
- **Fill-in-the-Blank question type (`type: "fillblank"`)** — 2 per study day. Underlined blank slot rendered inline in question text. Six-word pill bank; click a word to fill the blank, click blank to return the word. "Submit" locks. XP: +10 correct, +0 wrong. No hints, no confidence rating.
- **Strict quiz composition** — every study day now contains exactly 30 questions: 24 MCQ + 2 match + 2 order + 2 fillblank. The `type` field is required on every question object.
- **Lives / Challenge Mode** — opt-in toggle before the first answer on any study day. 5 hearts; each wrong answer removes one heart. 0 hearts → quiz locked with a 1-hour cooldown. Not present on mock pages.
- **Ask Google button** — appears beneath the explanation for every answered question (correct and wrong) on study days, and on every question in mock retrospection mode. Opens a contextual Google search in a new tab.
- **Inline Sticky Notes** — `quizlib.js` automatically appends a faint `📌` icon to every `<h2>` and `<h3>` in the study content. Clicking opens a `contenteditable` div auto-saved to `localStorage` (`hmp_note_{dayNum}_{headingSlug}`). A `📝 My Notes` count badge on the day-page header shows saved notes for that day. No markup required — fully runtime-injected.
- **Mock Completion Canvas** — after both mocks are submitted, a full-screen canvas overlay fires 4-second confetti and shows both mock scores, per-mock pass/fail status, and a motivational close. Dismissible with Escape or the "View Results & Retrospect" button.
- **Mock Retrospection Mode** — after completion, all questions in both mocks re-render with the user's choice highlighted (green/red), the correct choice highlighted green, and the full `explanation` shown. An "Ask Google for details" button appears beneath each explanation. Choice buttons are non-interactive.
- **Mock Retry Mode** — a "🔄 Retry Mock Test" button per mock in retrospection. On click: explanations and Ask Google hidden; choices re-enabled and reshuffled; timer resets for that mock only. Full completion canvas does not re-fire on retry.

### Changed
- **`SKILL.md`** — major revision: added v1.2 tunable variables (`REVIEW_POOL_MAX_PER_DAY`, `CONFIDENCE_*`, `XP_*`, `HINT_XP_PENALTIES`, `HINTS_CLIENT_SIDE`, `HEATMAP_DOMAINS`); updated Step 6 (foundation files), Step 7 (sidecar split + one-file-per-turn batch protocol), and all question-type schemas; abolished the `explanations` array in favour of a single unified `explanation` string on all types; added mock-exclusion invariants and the domain field requirement on every study question.
- **`QUESTIONS` schema** — `explanations: string[]` (per-choice array) is **abolished**. All question types now use a single `explanation: string` (≤60 words, ≤3 sentences). The `hints` field is **never authored** — hints are derived at runtime by `quizlib.js`.
- **`README.md`** — fully rewritten for v1.2: feature tables for study days and mock tests, Blueprint design system section, model comparison table (Claude / OpenAI / Gemini), configuration variable reference, and v1.2 what's-new table.
- **Blueprint Design System** — new visual identity replacing the previous dark theme. Key tokens: deep steel-navy sidebar (`#1e3058`), cool off-white canvas (`#f6f9ff`), indigo accent (`#5c6ef8`), Outfit typeface (via Google Fonts), 24px grid overlay (`rgba(92,110,248,0.05)`), WCAG AA contrast throughout. Orange (`#f97316`) is the only warm colour, used exclusively for review-queue cards.
- **Batch generation protocol** — changed from whole-day-per-turn to a **sidecar split**: each study day now produces two files per turn — `dayN.html` (shell + study content) and `dayN-quiz.js` (the `QUESTIONS` array). The quiz JS is loaded via `<script src="dayN-quiz.js">` placed immediately before `<script src="quizlib.js">`.
- **Mock-exclusion rule formalised** — confidence rating, XP toasts, streak, hints, and lives mode are **absolutely prohibited** on all mock pages (attempt, retrospection, and retry).

### Removed
- Per-choice `explanations` array from all question schemas (replaced by single `explanation` string).
- "Explore mode" clicking after answer lock (replaced by the explanations panel from v1.1, now unified under the single `explanation` field).

### Not changed
- `assets/nav.js`, `assets/index-template.html`, `assets/day-template.html`, `assets/mock-template.html`, `assets/quizlib.js`, `assets/styles.css` — template files carry forward from v1.1; v1.2 behaviours are implemented by Claude at generation time per the updated `SKILL.md` protocol.

---

## [1.1.0] — 2026-05-13

### Added
- **"Show all four explanations" panel** — after selecting an answer on any study-day quiz, a collapsible `<details>` panel appears beneath the result showing ✅/❌ for every choice with its individual explanation. No more clicking around to see other explanations.
- **Answer locking** — once a choice is selected, all other options are disabled. Score is frozen on first pick (unchanged from v1.0), but explore-mode clicking is replaced by the explanations panel.
- **localStorage persistence** — study-day quiz answers and scores are saved automatically and restored on page refresh, keyed by page filename. No answers are lost on accidental reload.
- **Reset Score & Shuffle button** — a button at the top of each study-day quiz section clears the saved state for that day and re-shuffles the choice order for all 30 questions, enabling repeat practice.
- **Confetti celebration** — when all 30 questions on a study day are answered, a 3-second canvas confetti animation falls from the top of the page.
- New CSS classes in `styles.css`: `.choice.faded`, `.quiz-reset-btn`, `.all-explanations` (details/summary), `.all-expl-panel`, `.expl-item`, `.expl-correct`, `.expl-wrong`, `.expl-icon`, `.expl-text`.

### Changed
- `assets/quizlib.js` — complete rewrite. Now manages shuffled choice order, localStorage load/save, the explanations panel, reset logic, and confetti. The `QUESTIONS` array contract is unchanged.
- `assets/day-template.html` — quiz intro block updated: adds the Reset Score & Shuffle button and updates the descriptive copy to match new behaviour.
- `assets/styles.css` — 114 lines of new styles appended for v1.1 UI components.
- `SKILL.md` — description and QUESTIONS section updated to document v1.1 quiz behaviour.

### Not changed
- Mock exam pages (`mock-template.html`) are unaffected — no persistence, no explanations panel, no confetti. Mock behaviour is identical to v1.0.
- `assets/nav.js`, `assets/index-template.html`, `assets/mock-template.html` — unchanged.

---

## [1.0.0] — 2026-05-11

### Added
- `SKILL.md` — full skill definition with 7-step generation protocol, tunable variables, source-type detection, difficulty/tone mapping, and distractor quality enforcement
- `assets/styles.css` — complete Brilliant-style dark-theme design system with CSS custom properties, responsive sidebar, card/callout/example/badge/table/progress/timer/results components, and mobile breakpoints at 900 px and 480 px
- `assets/quizlib.js` — quiz engine for study days: score locks on first pick, explore-mode for subsequent clicks, sticky progress bar with live score
- `assets/nav.js` — auto-builds collapsible sidebar navigation from a `NAV_DAYS` array; highlights the current page
- `assets/index-template.html` — landing page template with hero, day-grid, "How to use" card, and info callout
- `assets/day-template.html` — study day template with page hero, study section scaffold, 30-question quiz section, and progress bar
- `assets/mock-template.html` — mock exam template with two independent timed exams, countdown timer (yellow/red warnings), per-question explanations on submit, pass/fail verdict, and score display
- `README.md` — full user documentation: inputs, trigger phrases, generated file inventory, source-type detection, tunable variables, generation protocol, design system overview, and two worked examples
- `CONTRIBUTING.md` — contributor guide covering project structure, SKILL.md internals, asset contract rules, and PR process
- `LICENSE` — MIT
- `.gitignore` — ignores OS clutter, editor configs, and generated output folders
- `CHANGELOG.md` — this file

### Skill capabilities at launch
- Source types: exam/research doc and job description (auto-detected)
- Proficiency scale (x/10) controls tone from warm+foundational to peer-level terse
- JD difficulty scales with stated YoE across four tiers (entry / mid / senior / staff)
- Batch generation with mandatory user approval between batches (hard stop)
- Resume-aware domain framing: if a resume is present in `/mnt/project/`, examples are drawn from the user's own skill set where natural
- Further Reading block per study day: 3–6 curated links (official docs + YouTube)
- Distractor quality enforcement: all four choices must be comparable in length, specificity, and surface plausibility
- Per-choice explanation cap: ≤ 35 words / 2 sentences
- Mock exams: no question reuse between Mock 1 and Mock 2; same domain-weight distribution across both

---

## [Unreleased]

_Nothing yet — contributions welcome._

---

<!-- Links -->
[1.3.0]: https://github.com/psingha776/helpmeprep/releases/tag/v1.3
[1.2.0]: https://github.com/psingha776/helpmeprep/releases/tag/v1.2
[1.1.0]: https://github.com/psingha776/helpmeprep/releases/tag/v1.1.0
[1.0.0]: https://github.com/psingha776/helpmeprep/releases/tag/v1.0.0
