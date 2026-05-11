# Contributing to helpmeprep

Thank you for your interest in improving this skill! Contributions of all sizes are welcome.

---

## Ways to contribute

- **Bug reports** — file an Issue describing what went wrong and how to reproduce it.
- **New templates** — propose or submit alternative CSS themes, layout variants, or quiz formats.
- **Skill improvements** — sharpen the generation logic, add new source-type detectors, or improve distractor-quality rules.
- **Documentation** — fix typos, add examples, or clarify any part of the README.

---

## Project structure

```
helpmeprep/
├── SKILL.md                  ← Core skill logic (Claude instruction set)
├── README.md
├── CONTRIBUTING.md
├── LICENSE
└── assets/
    ├── styles.css            ← Design system — edit to retheme
    ├── quizlib.js            ← Quiz engine (study days)
    ├── nav.js                ← Sidebar nav builder
    ├── index-template.html   ← Landing page template
    ├── day-template.html     ← Study day template
    └── mock-template.html    ← Mock exam template
```

---

## How the skill works (for contributors)

`SKILL.md` is a structured instruction document that Claude reads at invocation time. It controls:

1. **Input elicitation** — if any of the four required inputs (source, x, n, h) are missing, Claude surfaces a prompt block.
2. **Source type detection** — exam/research doc vs. job description, with different question difficulty scaling.
3. **Curriculum planning** — distributes topics across days weighted by domain percentages.
4. **File generation** — foundation files first, then day pages in batches of `BATCH_SIZE = 2`, with user approval between batches.
5. **Quality invariants** — distractor rules, explanation length caps, `{{placeholder}}` scan before presenting any file.

### Key sections in SKILL.md

| Section | Purpose |
|---|---|
| `TUNABLE VARIABLES` | Change generation defaults without touching logic |
| `Step 3 — Set difficulty and tone` | Controls how `x` (proficiency) maps to content register |
| `Distractor quality rule` | Enforced on every generated question |
| `Reference links rule` | Rules for the Further Reading block |
| `Key invariants` | Hard constraints that must never be violated |

---

## Making changes to SKILL.md

- Keep the front-matter block (`---` / `name` / `description` / `---`) intact — Claude uses `description` for trigger detection.
- Tunable variable names are referenced by name in the logic sections — rename consistently.
- The batch approval hard stop (`HARD STOP` block in Step 7) must never be removed or softened.
- Test any change with at least one exam source and one JD source before submitting a PR.

## Making changes to assets/

- `styles.css` — all component classes used in generated day pages are documented in the file's comments. Do not remove a class without a find-replace across all templates.
- `quizlib.js` — the `state` object shape and `selectChoice` / `updateProgress` function signatures are referenced by `day-template.html`. Keep them stable.
- `mock-template.html` — `MOCK1` / `MOCK2` array names and `mockState` structure are hardcoded. Keep stable.
- Templates use `{{PLACEHOLDER}}` syntax — Claude scans for unresolved `{{` before presenting any file. Any new placeholder must be documented in `SKILL.md`'s placeholder reference tables.

---

## Submitting a pull request

1. Fork the repo and create a feature branch: `git checkout -b feat/your-feature`.
2. Make your changes.
3. Update `README.md` if you added or changed any inputs, outputs, or tunable variables.
4. Open a PR with a clear description of what changed and why.

There are no automated tests for a skill — reviewers will manually invoke the skill against a sample document to verify output quality.

---

## Code of Conduct

Be kind, constructive, and specific. That's it.
