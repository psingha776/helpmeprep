# helpmeprep — v1.5 Changelog

All changes are in-place amendments to v1.5. No version bump to v1.6 has been made.
Sources: four separate work sessions across May–June 2026.

---

## Design System — Calm Tracker

Complete visual identity replacement (previously Blueprint-derived).

- **Motion vocabulary** — 5 canonical easings (`--e-out`, `--e-snap`, `--e-drawer`, `--e-in`, `--e-tactile`) × 5 durations (`--d-tap` 80ms → `--d-celebrate` 480ms). All animations derive from this set; no ad-hoc values.
- **Action-semantic button motion** — each button class earns its animation from what the action means (`.btn` arrow translates right, `.btn-danger` two-step confirm, `.hint-btn` hairline extends, `.conf-btn` underline draws, `.choice` SVG check/cross draws on answer).
- **Collapsible sidebar** — collapses to 56 px via `⌘\`/`Ctrl+\`; state persists to `localStorage.hmp_nav_collapsed`; icon-only tooltips on hover with 200 ms intent delay.
- **Theme toggle** — sidebar-footer button cycles `system → light → dark → system`; `theme.js` paints sun/moon/auto SVG; floating body-level toggle removed (hidden via CSS).
- **Keyframes** — `ambient-pulse`, `slot-flip`, `level-flash`, `bar-pulse`, `lift-fade-in`, `reveal-down`, `track-in`, `pair-pulse`, `check-draw`, `xp-rise`. Mock pages: no decorative motion.
- **Reduced motion** — `@media (prefers-reduced-motion: reduce)` zeroes all durations; functional feedback fires instantly.

---

## Bug Fixes

### B1 — question-bank.js never loaded (heatmap + quick-quiz dead)
`index.html` never included a `<script src="question-bank.js">` tag, so `QUESTION_BANK` was `undefined` at runtime. Both the domain heatmap and the quick-quiz feature were silently non-functional since v1.4.
**Fix:** Step 6 Python substitution wires `<script src="question-bank.js"></script>` before `index.js`. `question-bank.js` is assembled mechanically at the end of Step 7 (see Process section) — questions are never re-emitted into context.

### B2 — service-worker.js missing (offline cache dead)
`cp` in Step 6 referenced `service-worker.js` but no such asset existed, causing silent failure. Offline caching had never worked.
**Fix:** Step 6 generates `service-worker.js` per-hub via a Python block. Cache name is `{SLUG}-v1` (unique per hub; old caches evicted on `activate`). Google Fonts excluded from pre-cache.

### B3 — Order questions broken on touch/mobile
Sequence questions relied solely on drag-and-drop, which is unsupported on iOS/Android browsers.
**Fix:** Move-up/move-down arrow buttons added to each item in `quizlib.js`; keyboard-accessible and touch-compatible. CSS for `.order-btn` added to `styles.css`.

### B4 — Dark-mode FOUC (flash of unstyled content)
`theme.js` loaded at `</body>`, so the page rendered in light mode before the script applied the stored dark preference — visible flash on every page load in dark mode.
**Fix:** A 5-line pre-paint `<script>` block added to `<head>` in all three templates (`index-template.html`, `day-template.html`, `mock-template.html`). Reads `localStorage.hmp_theme` and applies the `html.dark` class synchronously before any paint.

### B5 — Mock retry unimplemented; dead `#pageDots` DOM
Mock retry was specified in the original §10c design but never built. `mocklib.js` had no `retryMock()` function. `#pageDots` was referenced in template JS but the DOM element did not exist.
**Fix:** `retryMock(n)` implemented in `mocklib.js`; `sessionStorage.hmp_mock_canvas_shown` guards against the completion canvas re-firing on retry. Dead `#pageDots` DOM removed from `day-template.html`.

### B6 — Mock pre-submit choice not highlighted
No CSS rule existed for `.choice.selected` during an active (pre-submit) attempt, so selected answers showed no visual confirmation until submission.
**Fix:** `.choice.selected:not(.correct):not(.wrong):not(.reveal-correct)` rule added to `styles.css`.

### B7 — Ask Google missing from mock post-submit
The "Ask Google for explanation" affordance existed in study-day quizzes but was absent from mock retrospection.
**Fix:** `buildMockAskGoogle()` helper added to `mocklib.js`, wired into both `submitMock()` and `restoreAnswers()`.

### B8 — MCQ cross-reference invariant
Wrong-choice text occasionally referenced sibling choices by position letter (e.g., "Both A and B"), which broke after runtime shuffling.
**Fix:** Generation-time invariant added to `SKILL.md` — no MCQ choice may reference another choice by letter. Any such reference must be replaced with the actual text of the referenced choice inline.

---

## Process / Efficiency

### R1 — Stop reading verbatim assets at Step 1.3
Step 1.3 previously told Claude to read all assets into context, including `styles.css` (68 KB), `quizlib.js` (40 KB), `mocklib.js` (16 KB), `index.js` (16 KB), `theme.js`, and `service-worker.js` — then copy them verbatim via `cp`. Approximately 40 K tokens were burned per invocation for content Claude never used.
**Fix:** Step 1.3 now reads only the four substitutable templates (`index-template.html`, `day-template.html`, `mock-template.html`, `nav.js`). All verbatim assets are `cp`-ed without being read. Rule added to Key Invariants: "Foundation assets are `cp`-ed verbatim — NEVER use `create_file` to retype them."

### R2 — One turn per study day
Previously, each study-day HTML page and its sidecar `dayN-quiz.js` were produced in separate turns, doubling turn count for long hubs.
**Fix:** Each study day now co-produces both files in a single turn (write `dayN.html` + write `dayN-quiz.js`, then `present_files [dayN.html, dayN-quiz.js]`, then end the turn).

### R3 — Mechanical question-bank.js assembly
Previously, `question-bank.js` was generated by re-emitting all question content, consuming tokens proportional to the total question count of the hub.
**Fix:** `question-bank.js` is assembled at the end of Step 7 by a Python script that extracts `QUESTIONS` array literals from each sidecar file via regex — zero question re-emission. Mock arrays extracted from `dayN.html` by the same script.

### R4 — Trim frontmatter description
Frontmatter description was verbose (multi-sentence, named every feature). Reduced to a single trigger-oriented sentence.

---

## Enhancements

### E1 — Wall-clock mock timer
`setInterval` decrement drifts when the browser tab is backgrounded, causing the timer to run slow.
**Fix:** Timer now records `endTime = Date.now() + (seconds * 1000)` at start and recomputes `remaining = endTime - Date.now()` on each tick. Accurate regardless of backgrounding.

### E2 — Quiz load-failure guard
If `dayN-quiz.js` failed to load (e.g., missing file), the quiz area was silently blank with no error.
**Fix:** `quizlib.js` detects load failure and renders an explicit error panel prompting the user to check the file path.

### E3 — Accessibility (focus-visible, aria-live, sr-only, focus restore)
- `focus-visible` ring added to all interactive elements via CSS (`:focus-visible` outline rule).
- `aria-live="polite"` announce region added to all three templates for screen-reader feedback.
- `.sr-only` utility class added to `styles.css`.
- Focus restored to the first interactive element after quiz re-renders in `quizlib.js`.

### E4 — Print stylesheet
`@media print` rules added to `styles.css`: hides sidebar, buttons, and interactive controls; expands content to full width; ensures clean page breaks.

### E5 — `{{QUIZ_PER_DAY}}` placeholder
`day-template.html` had the quiz count hardcoded as `"30"` in the page meta. Now uses `{{QUIZ_PER_DAY}}` which is substituted at Step 6 from the tunable variable.

### E6 — Hint derivation leak fix
The Level-3 hint was derived by taking the first 8 words of the `explanation` field, which often produced a fragment that gave away the answer.
**Fix:** Hint derivation logic in `quizlib.js` now explicitly excludes sentences from the `explanation` field. L3 hint is a conceptual scaffold, never an explanation excerpt.

### E7 — Specific `{{token}}` error reporting
The pre-present `{{` scan rule previously required only a count of unresolved tokens. Counting alone masked which tokens were missed.
**Fix:** Rule now requires each unresolved token to be named explicitly (e.g., `{{DAY_TITLE}}`, `{{MOCK1_QUESTIONS_START}}`). File must not be presented until all are resolved.

---

## Authoring Rules

### A1 — Distractor sourcing rule
Before writing MCQ choices, Claude must scan the source document and the day's study content for explicitly-stated wrong approaches, anti-patterns, or common mistakes. These become the distractors. Invented distractors are only permitted when the source has no stated anti-patterns for the topic.

### A2 — Length parity rule
All four MCQ choices must be within ±25% word count of each other. A short correct answer beside long distractors (or vice versa) leaks the answer by length.

### A3 — Question-count invariants
`QUESTIONS` array must always contain exactly `QUIZ_PER_DAY` entries. Review-pool cards are injected at runtime by `quizlib.js` and are additive — they must never reduce the authored count. `MOCK1` and `MOCK2` must each contain exactly `JD_MOCK_QUESTIONS` entries. No spaced-repetition injection occurs in mocks.

---

## Pedagogical Authoring Rules (final amendment)

Based on evidence-based learning-science research and competitor-tool benchmarking (Anki, UWorld, Khan Academy, Brilliant).

### P1 — MCQ explanation format (two-part)
Previous: one 60-word paragraph explaining why the correct answer is right and briefly why one distractor is wrong.
**New:** Two-part format — (1) one sentence: why the correct answer is right; (2) one line per wrong choice identified by a short content excerpt (never a position letter — choices are shuffled at runtime), explaining why it is wrong. `EXPLANATION_MAX_WORDS` raised from 60 to 80. The "Ask Google" button handles detailed elaboration; this field stays terse.

### P2 — Bloom taxonomy mix
Across each day's 23 MCQs: ~30% Remember/Understand (direct recall stem), ~50% Apply (scenario vignette: 1–2 sentence real-world situation then the question; stem must be answerable without seeing choices), ~20% Analyse/Evaluate (compare approaches, diagnose a misconfiguration, predict an outcome). Apply and Analyse items require scenario text in the `text` field.

### P3 — Mayer/Sweller reading structure
Every study-day reading section must follow this structure:
1. **Key Terms block first** — `> [!info] Key Terms` callout with 5–8 anchor concepts defined, before the first `##` heading.
2. **Segment into ~300-word sections** — each `##` heading covers one concept in ~300 words, ending with an inline self-check (`> [!info] Quick Check` → question / answer).
3. **Signal** — bold each key term on first use only; `> [!warn]` for critical distinctions.
4. **Worked example** — at least one fully-fleshed concrete example per concept (`EXAMPLE:` prefix).
5. **Anti-pattern** — 1–2 sentence note after each example showing what commonly goes wrong.
6. **Coherence** — cut any interesting-but-irrelevant tangent; if a fact is not testable or exam-relevant, remove it.

### P4 — Worked-example fading (Sweller)
For procedural content (step-by-step processes, configs, algorithms), calibrated by `x`:
- x 0–4: 2 full examples → 1 partial (last step as `[?]`) → 1 unscaffolded problem.
- x 5–7: 1 full → 1 partial → 1 unscaffolded.
- x 8–10: 1 full → 1 unscaffolded (expertise-reversal — excess scaffolding hurts experts).

### P5 — Quiz type breakdown change
`QUIZ_TYPE_BREAKDOWN` changed from `{ mcq: 24, match: 2, order: 2, fillblank: 2 }` to `{ mcq: 23, match: 1, order: 2, fillblank: 4 }`. Rationale: fill-blank forces recall (produce-the-term); match-pairs test low-level association and are easy to game by elimination. Total remains 30.

### P6 — Fill-blank authoring rule
Fill-blank questions must test specific, nameable terms or procedure steps — not vague concepts. The `wordBank` must contain plausible near-correct terms (synonyms, related-but-distinct concepts), not obviously wrong fillers. Target per day: 2 terminological (key concept names), 1 procedural (a step in a sequence), 1 configurational (a specific value, flag, or parameter).

### P7 — Domain interleaving
The `QUESTIONS` array must interleave domains throughout — no more than 2 consecutive questions from the same domain. Mix question types across domains. Rationale: interleaving forces discrimination between concepts, producing stronger encoding than blocked practice.

### P8 — Hypercorrection priority (review queue)
`quizlib.js` flags certain-but-wrong (false-certainty) answers and routes them to the spaced-repetition review pool. These items surface first within the daily review queue on subsequent days. High-confidence errors are corrected more reliably once caught (hypercorrection effect) and are the highest-value review targets.

---

## Files Changed

| File | Changes |
|---|---|
| `SKILL.md` | R1, R2, R3, R4, E5, E7, B1 (script tag), B2 (SW generation), B8, A1, A2, A3, P1–P8 |
| `index-template.html` | B1 (script tag), B4 (FOUC), E3 (aria-live) |
| `day-template.html` | B4 (FOUC), B5 (remove page-dots), E3 (aria-live), E5 (QUIZ_PER_DAY) |
| `mock-template.html` | B4 (FOUC), E3 (aria-live) |
| `quizlib.js` | B3 (order buttons), E2 (load guard), E3 (focus-visible + aria + focus restore), E6 (hint leak) |
| `mocklib.js` | B5 (retry), B7 (Ask Google post-submit), E1 (wall-clock timer) |
| `styles.css` | B3 (order-btn), B6 (choice.selected), E2 (load-error), E3 (focus-visible, sr-only), E4 (print), Calm Tracker full design token set + keyframes |
| `service-worker.js` | B2 — new file, generated per-hub at Step 6 |
| `question-bank.js` | B1 — assembled mechanically at Step 7, never re-emitted |
