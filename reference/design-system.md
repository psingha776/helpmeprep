<!-- Reference only — loaded on demand, NOT during a normal build.
     The visual design is fully encoded in styles.css + theme.js (cp'ed verbatim);
     Claude generates none of it. Read this only when modifying the look. -->

## Design System — Calm Tracker

Light + dark themes, warm-paper canvas, publication-ink primary, sienna as the single warm. Sharp 2px radius; no rounded cards. Motion is restrained and semantic.

Tokens (already in `styles.css`; do not re-emit):

```css
/* light — warm paper */
:root {
  --canvas:#faf8f3;  --canvas-2:#f4f0e5;  --card:#fff;
  --ink:#0e1424;     --bo:#2a3142;        --mu:#5a6378;  --mu-2:#8a92a3;
  --rule:#d6d2c4;    --rule-2:#ebe5d4;    --rule-strong:#1e293b;
  --primary:#1e3a8a; --primary-soft:rgba(30,58,138,0.07);
  --warm:#a23b1f;    --warm-soft:rgba(162,59,31,0.07);
  --ok:#1d6e3a;      --ok-soft:rgba(29,110,58,0.07);
  --sb:#14213d;      --sb-tx:#e7ecf6;     --sb-mu:#8898b9;
  --r:2px;
}
/* dark — warm near-black */
html.dark {
  --canvas:#131312;  --canvas-2:#1c1b18;  --card:#1a1a17;
  --ink:#f1ede4;     --bo:#c8c4ba;        --mu:#8a857a;
  --primary:#7a93ff; --warm:#d97757;      --ok:#6fb685;
  --sb:#0a0a09;
  /* …see styles.css for full set */
}
```

**Fonts** — `'Outfit'` for body + headings, `'JetBrains Mono'` for numbers/labels/code, `'Newsreader'` italic for incidental emphasis (sticky notes, conf labels, *em* tags). Google Fonts link is in all three templates.

**Sidebar** — fixed left, dark steel-navy (`#14213d`) in light mode, deeper near-black in dark mode. Collapsible to `56px` via the chevron button (`⌘\` / `Ctrl+\` shortcut). Theme toggle lives inside the sidebar footer — cycles `system → light → dark → system`. No floating top-right buttons.

**Plan list** — `.day-tile` rendered as a flat row (not a card) with grid columns `84px 1fr 220px 18px`: date block (mono numeral) · body (domain label + title) · progress (text + 2px bar) · arrow. States: `.done` `.cur` `.upcoming` `.mock`.

**Page hero** — mono day numeral on left, eyebrow + title + meta in middle, optional aux on right.

**Motion vocabulary** — five easings and five durations, never improvise outside this set:

```
--e-out:     cubic-bezier(0.23, 1, 0.32, 1)    /* default entrance/settle */
--e-snap:    cubic-bezier(0.34, 1.56, 0.64, 1) /* overshoot on toggles, progress bars */
--e-drawer:  cubic-bezier(0.32, 0.72, 0, 1)    /* sidebar + drawer open/close */
--e-in:      cubic-bezier(0.55, 0, 0.45, 1)    /* leaving the page */
--e-tactile: cubic-bezier(0.2, 0, 0, 1)        /* :active press feedback */

--d-tap: 80ms · --d-hover: 180ms · --d-reveal: 280ms · --d-change: 360ms · --d-celebrate: 480ms
```

**Semantic button motion** — each button class earns its motion from what the action means:

| Class | What it signals | Motion |
|---|---|---|
| `.btn` | Commit forward | Arrow translates +4px right on hover; scale(0.985) on press |
| `.btn-secondary` | Soft commit | Underline already drawn; opacity dims on hover |
| `.btn-check`, `.btn-submit-blank` | Verify / submit | `→` glyph slides right on hover |
| `.btn-danger` | Destructive friction | First click flips label to "Confirm…?"; 1500ms primary-blue underline grows; second click within window confirms. Modal-free. |
| `.mode-btn` | Segmented toggle | Active fills with ink; siblings switch to ghost border |
| `.hint-btn` | Progressive disclosure | Leading hairline rule extends 18→28px on hover |
| `.conf-btn` | Attention transfer | Underline draws from left on hover; selected stays thick + sibling underlines retract |
| `.ag` | Leaving the page | `↗` rotates +8° and lifts on hover |
| `.choice` (MCQ) | The moment of judgment | SVG check ✓ draws via stroke-dasharray on correct; SVG ✗ + horizontal shake on wrong |

**Beyond buttons** — see `styles.css` keyframes for: `ambient-pulse` (sienna pulse-dot in hero kicker + current-day prog bar), `slot-flip` (streak digit increment), `level-flash` (sidebar XP block color-invert on level up), `bar-pulse` (current-day progress shimmer), `lift-fade-in` (page enter), `reveal-down` (small content reveals — hint box, sticky note, coachmark), `track-in` (section labels tightening into focus on scroll), `pair-pulse` (match-pair confirmation), `check-draw` (SVG check stroke), `xp-rise` (XP toast). Mock pages get NO decorative motion beyond functional timer + correct/wrong feedback.

**Reduced motion** — `@media (prefers-reduced-motion: reduce)` zeroes all durations and kills ambient pulses/shimmers. Functional feedback (press, correct, wrong) still fires instantly.

**Theme toggle** — rendered inside the sidebar footer of every page:

```html
<button class="theme-toggle" id="themeToggle" onclick="toggleTheme()" aria-label="Toggle theme">
  <svg id="themeIcon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"></svg>
  <span class="theme-label" id="themeLabel">Theme</span>
</button>
```

`theme.js` cycles `system → light → dark → system` and paints sun/moon/auto SVG into `#themeIcon`. Floating body-level theme buttons must NOT be placed — they're hidden via CSS, kept only for any legacy assets that still emit them.

**Sidebar collapse** — `.app.nav-collapsed` toggles via `toggleNavCollapse()`. State persists to `localStorage.hmp_nav_collapsed`. Collapsed shows only logo + mono day numbers + theme icon; full labels appear as right-side tooltips with 200ms hover-intent delay.

