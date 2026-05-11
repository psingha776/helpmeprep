# Changelog

All notable changes to **helpmeprep** will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
[1.0.0]: https://github.com/psingha776/helpmeprep/releases/tag/v1.0.0
