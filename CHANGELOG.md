# Changelog

All notable changes to **helpmeprep** will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
[1.1.0]: https://github.com/psingha776/helpmeprep/releases/tag/v1.1.0
[1.0.0]: https://github.com/psingha776/helpmeprep/releases/tag/v1.0.0
