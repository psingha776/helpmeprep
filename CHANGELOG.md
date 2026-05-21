# Changelog

All notable changes to **helpmeprep** will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.4.0] — 2026-05-22

### Added
- **Keyboard shortcuts** — 1–4 select choices, H toggle hint, right-arrow/N next question, ? show shortcut cheatsheet; active on study-day pages.
- **Dark mode toggle** — moon/sun button top-right on every page; preference persisted to localStorage via theme.js.
- **Per-question timer** — elapsed seconds shown per question; resets on next. Visible on study days only (mocks have their own countdown).
- **Aggregate notes dashboard** — index.html now shows a collapsible notes panel listing every saved sticky note across all days, grouped by day.
- **Domain-weighted mock scoring** — DOMAIN_WEIGHTS map populated at generation time; mock score calculated as weighted average when weights are present, simple average otherwise.
- **Mark-for-review in mock** — flag icon per question during a mock attempt; flagged questions highlighted in the retrospection view.
- **Service-worker offline cache** — service-worker.js pre-caches all hub assets on install; hub works fully offline after first load.
- **First-visit sticky-note coachmark** — tooltip bubble on the first heading icon a user sees, dismissible and never shown again.
- **Per-day note count in sidebar** — nav.js reads localStorage and displays note count next to each day link if notes exist.
- **Quick-quiz mode** — new button on index.html that samples 10 random questions across all days for a rapid drill session.
- **Question dedup via sig field** — 3-layer enforcement: generation-time scan, required schema field, runtime localStorage safety net in mocklib.js.
- **New asset files** — mocklib.js (mock engine extracted from inline script), index.js (index-page logic), theme.js (dark-mode toggle), service-worker.js (offline cache).

### Changed
- **mock-template.html** — inline JS extracted to mocklib.js; template shrank from ~360 lines to ~115 lines.
- **SKILL.md** — trimmed from ~462 lines to ~280 lines; foundation assets now cp-ed verbatim (no re-emission); DOMAIN_WEIGHTS variable added; sig field made mandatory; STUDY_MD backtick-escape step formalised as invariant; Google search query cap removed.
- **Ask Google** — no longer appends a character cap to the search query.

### Fixed
- **STUDY_MD rendering bug** — unescaped backticks in code fences silently broke the JS template literal, causing the study section not to render and the quiz to appear only after a Reset click. Escape step added to generation protocol and locked as a key invariant.

---

## [1.3.0] — 2026-05-19

v1.3 is a targeted bug-fix release addressing nine visual/rendering regressions that shipped in v1.2. All fixes are confined to assets/styles.css and assets/quizlib.js. No changes to SKILL.md protocol, question schemas, or generation flow.

### Fixed

- **styles.css — Blueprint theme inactive on day pages** — .app.blueprint block was a no-op; day pages rendered in old dark theme. Added complete remapping of token aliases and a body:has(.app.blueprint) rule.
- **styles.css — .mode-btn unstyled** — Normal / Challenge toggle had browser defaults only. Redesigned as segmented pill capsule.
- **styles.css — .hint-btn, .hint-box, .hint-label unstyled** — hint UI had zero CSS. Styled with amber pill, tinted reveal container, uppercase tier label.
- **styles.css — .choice.hint-greyed rule missing** — quizlib.js injected this class but no rule backed it; greyed choice remained visible. Added opacity/pointer-events/filter.
- **styles.css — .btn link colour leak** — global anchor rule caused .btn-wrapped anchors to show indigo text on indigo button. Scoped to a:not(.btn) and added .blueprint .btn { color: #fff }.
- **styles.css — .conf-btn, .conf-row, .conf-label unstyled** — confidence row had no CSS. Applied traffic-light semantics: Guessed=coral, Sure=amber, Certain=emerald.
- **quizlib.js — renderMatch() partial re-render bug** — already-matched pairs re-rendered as live buttons. Fixed by building matched Sets and immediately locking with correct-pair + disabled classes.
- **styles.css — match/order/fill-blank completely unstyled** — all interactive classes for the three non-MCQ types had zero CSS. Full styling pass added.
- **quizlib.js — inlineFmt() lacked Markdown link regex** — [text](url) rendered as raw text. Regex added before bold/italic/code replacements.

### Not changed
- SKILL.md, assets/nav.js, assets/index-template.html, assets/day-template.html, assets/mock-template.html.

---

## [1.2.0] — 2026-05-17

### Added
- Spaced Repetition Queue, Confidence Self-Rating, XP + Levels, Streak Tracking, Tiered Hints, Domain Heatmap, Match/Order/Fill-Blank question types, Lives/Challenge Mode, Ask Google, Inline Sticky Notes, Mock Completion Canvas, Mock Retrospection Mode, Mock Retry Mode.

### Changed
- SKILL.md — major revision for all v1.2 features. Blueprint Design System replacing old dark theme. Sidecar split batch protocol (dayN.html + dayN-quiz.js per turn). explanations array abolished in favour of single explanation string.

---

## [1.1.0] — 2026-05-13

### Added
- Show-all-explanations panel, answer locking, localStorage persistence, Reset & Shuffle button, confetti celebration.

### Changed
- assets/quizlib.js complete rewrite, assets/day-template.html, assets/styles.css (114 new lines), SKILL.md updated.

---

## [1.0.0] — 2026-05-11

### Added
- SKILL.md, assets/styles.css, assets/quizlib.js, assets/nav.js, assets/index-template.html, assets/day-template.html, assets/mock-template.html, README.md, CONTRIBUTING.md, LICENSE, .gitignore, CHANGELOG.md.

---

## [Unreleased]

_Nothing yet — contributions welcome._

---

<!-- Links -->
[1.4.0]: https://github.com/psingha776/helpmeprep/releases/tag/v1.4
[1.3.0]: https://github.com/psingha776/helpmeprep/releases/tag/v1.3
[1.2.0]: https://github.com/psingha776/helpmeprep/releases/tag/v1.2
[1.1.0]: https://github.com/psingha776/helpmeprep/releases/tag/v1.1.0
[1.0.0]: https://github.com/psingha776/helpmeprep/releases/tag/v1.0.0
