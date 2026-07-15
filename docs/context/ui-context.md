# ShowUp Design System Audit
*"The Modern Atelier" — Atelier Light theme · audited against actual implementation, June 2026*

> Scope: `colors_and_type.css` (token source of truth) + 6 page apps (`appointments`, `availability`, `customers`, `conflicts`, `payment-policy`, `reminders`) rendered through `design-canvas.jsx` artboards, with a `tweaks-panel.jsx` control layer. This documents what the code *does*, not what the brief wishes.

## Brand Names

| Context | Value |
|---------|-------|
| Product display name | ShowUp |
| Uppercase / wordmark | SHOWUP |
| Plan name | ShowUp Pro |
| CSS token prefix | `--al-*` (Atelier Light — unrelated to product name, does not change) |

---

## 1. Theme Summary

A light-only, warm-neutral editorial admin UI: off-white canvas (`#f9f9f7`), deep-navy ink and CTAs (`#001e40`), terracotta as the only warm accent, and JetBrains Mono for every number. The constraint shaping every decision is **typographic hierarchy over chrome** — meaning is carried by weight (800 everywhere), uppercase eyebrows with `.2em` tracking, and tabular numerals, *not* by color, borders, or shadows, which are kept to hairlines and one soft float.

**Brand test:** *If a screen leans on a colored gradient panel, a drop shadow to separate cards, or a non-tabular number, it's off-brand.* The only sanctioned gradient is navy-on-navy (`--al-gradient-cta`); the only sanctioned float is `--al-shadow-float`.

---

## 2. Token Map

**Source of truth:** `colors_and_type.css` `:root` (lines 68–212). Naming convention: `--al-<role>` (al = Atelier Light), Material-3-derived role names (`primary`, `on-primary`, `surface-container-high`, `outline-variant`). A second thin semantic layer (`--color-bg`, `--color-fg-headline`) aliases the `--al-*` set but is **barely used** (see §10/dead code).

```css
/* COLOR — Material-3 role naming, --al-* prefix */
--al-primary:           #001e40;   /* deep navy — ink, CTA, active nav */
--al-primary-container: #003366;   /* gradient terminus only */
--al-primary-fixed:     #d5e3ff;   /* top-tier avatar bg */
--al-primary-fixed-dim: #a7c8ff;   /* top-tier avatar bg / timeline close-time */
--al-on-primary:        #ffffff;

--al-secondary:           #74584f;  /* warm brown — terracotta avatar border */
--al-secondary-container: #fdd8cb;  /* terracotta — avatar bg, nav badge */
--al-secondary-fixed:     #ffdbcf;
--al-secondary-fixed-dim: #e2bfb3;
--al-tertiary:            #3b1002;   /* deep sienna (near-unused) */
--al-tertiary-container:  #572411;   /* avatar fg on terracotta */

/* SURFACE — note: surface == background == surface-bright == #f9f9f7 (flat) */
--al-background / --al-surface / --al-surface-bright: #f9f9f7;
--al-surface-dim:               #dadad8;
--al-surface-container-lowest:  #ffffff;   /* cards / sheets */
--al-surface-container-low:     #f4f4f2;   /* table header band, code chips */
--al-surface-container:         #eeeeec;   /* hover, badges, rowAction, profile */
--al-surface-container-high:    #e8e8e6;   /* disabled button bg */
--al-surface-container-highest: #e2e3e1;

/* TEXT */
--al-on-surface:          #1a1c1b;  /* body ink */
--al-on-surface-variant:  #43474f;  /* muted / secondary text (everywhere) */
--al-inverse-on-surface:  #f1f1ef;

/* OUTLINE — most borders are written as rgba(195,198,209,.2-.55) inline, NOT this token */
--al-outline:         #737780;      /* disabled text */
--al-outline-variant: #c3c6d1;      /* = rgb(195,198,209), the hairline color */
--al-ghost-border:    rgba(195,198,209,0.20);

/* ERROR + (added this audit) softer inline-warning rose */
--al-error:        #ba1a1a;   --al-error-container: #ffdad6;
--al-error-soft:   #a8294a;   /* dusty rose — voided/risk/closed/empty states */

/* WARNING + SUCCESS — added during reminders refactor; only reminders consumes them.
   appointments/availability still hardcode the same hex inline. */
--al-warning:        #c97a2a;  --al-warning-container: rgba(201,122,42,.10);
--al-warning-outline:rgba(201,122,42,.30); --al-on-warning-container:#7a4612;
--al-success:        #0e7a55;  --al-success-bright: #11936a;
--al-success-container: rgba(14,122,85,.12);

/* SHADOW + GRADIENT */
--al-shadow-float:    0px 20px 40px rgba(26,28,27,0.06);  /* note: code uses 0.04, not 0.06 */
--al-shadow-float-lg: 0px 32px 64px rgba(26,28,27,0.08);  /* DEAD — never referenced */
--al-gradient-cta:    linear-gradient(135deg,#001e40,#003366);

/* TYPE — rem scale, "editorial" */
--al-display-lg:56 --al-display-md:44 --al-display-sm:36
--al-headline-lg:32 --al-headline-md:24 --al-headline-sm:20
--al-title-lg:18 --al-title-md:16 --al-title-sm:14
--al-body-lg:18 --al-body-md:16 --al-body-sm:14
--al-label-lg:14 --al-label-md:12 --al-label-sm:11   /* sm = uppercase eyebrow */
/* weights */ --al-w-light:300 …-regular:400 -medium:500 -semibold:600 -bold:700 -extra:800
/* tracking */ --al-track-eyebrow:0.2em  --al-track-display:-0.02em

/* RADII */
--al-radius-sm:4 -md:6 -lg:8 -xl:12 -2xl:16 -3xl:24 -pill:9999

/* SPACING — "tracks Stitch scale 0..24" */
--al-sp-1:4 -2:8 -3:12 -4:16 -5:20 -6:24 -8:32 -10:40 -12:48 -16:64 -20:80 -24:136

/* MOTION — NO tokens. Durations/easings are inline literals (see §11). */
/* BREAKPOINTS — NONE defined. No media queries anywhere (see §12). */
```

**Fonts:** loaded in `colors_and_type.css` via local `@font-face` (Manrope, 8 explicit weights + a variable axis 200–800) and a Google Fonts `@import` for **Material Symbols Outlined**. JetBrains Mono is referenced in `code/kbd/pre` and inline `fontFamily` strings but **is never actually loaded** — it falls back to `ui-monospace` (see §4, §13).

---

## 3. Color Usage Guide

Light contexts only — **there is no dark theme** (no `.dark`, no `prefers-color-scheme`, no second token block).

| Token / value | Hex | Where actually used |
|---|---|---|
| `--al-primary` | `#001e40` | Active nav bg, all primary CTAs (as gradient), page titles, section titles, active filter pill, numerals, brand mark/word, ledger band |
| `--al-on-surface` | `#1a1c1b` | Body row text (customer/service names) |
| `--al-on-surface-variant` | `#43474f` | **The workhorse muted color** — nav labels, eyebrows, helper text, crumbs, sub-labels, icon tints. Highest-frequency color after navy |
| `--al-surface` | `#f9f9f7` | App canvas, sidebar, row hover, filter bar bg |
| `#ffffff` (`-lowest`) | `#ffffff` | Cards, sheets, inputs, icon buttons, sort menu |
| `--al-surface-container-low` | `#f4f4f2` | Table header band, code chips, day-pill closed bg |
| `--al-surface-container` | `#eeeeec` | Hover fill, nav badges, `rowAction` circle, profile block, empty-state icon tile |
| `--al-secondary-container` | `#fdd8cb` | Profile/customer avatar gradient start, nav badge (appointments only) |
| `--al-success` | `#0e7a55` | Settled outcome, "Filled", "Top" tier, saved state — **hardcoded inline** except in reminders |
| `--al-error-soft` | `#a8294a` | Voided, "Risk" tier, conflict banner, closed-day toggle, required dot, empty-state — **hardcoded inline** |
| `--al-warning` | `#c97a2a` | Unresolved, "Pending", "Open" recovery, at-capacity, unsaved dot — **hardcoded inline** except reminders |
| `--al-primary-fixed`/`-dim` | `#d5e3ff`/`#a7c8ff` | Top-tier customer avatar gradient; timeline close-time text |

**Accent frequency:** Terracotta (`#fdd8cb` family) appears **exactly once or twice per viewport** — the user avatar and (on Appointments) one nav badge. Navy is unbounded (it's the ink). The three semantic stoplight colors appear only as small pills/dots, never as fills.

**Colors in config but unused:** `--al-tertiary` (#3b1002), `--al-tertiary-fixed*`, `--al-surface-dim`, `--al-surface-container-highest`, `--al-inverse-surface`, `--al-inverse-primary`, `--al-error-container`/`--al-on-error-container`, the entire `--color-*` semantic alias layer, and `.al-card-glass`.

---

## 4. Typography

### Scale (largest → smallest, as actually rendered)

| Usage | Size | Weight | Tracking | Family |
|---|---|---|---|---|
| KPI outcome count | 48px | 800 | -.03em | Manrope (tabular) |
| Page title (`pageTitle`) | 40–44px | 800 | -.025em | Manrope |
| Money figure / summary stat | 32–36px | 800 | -.03em | Manrope / **mono** |
| Section title (`sectionTitle`, `<h2>/<h3>`) | 24px | 800 | -.02em | Manrope |
| Preview/tiers title | 20px | 800 | -.02em | Manrope |
| Day label, brand word, ledger pill mono | 18px | 800 | -.02em / .16em | Manrope / mono |
| Input value, buffer label | 15–16px | 700 | -.01em | Manrope / mono |
| Row text, field label, body | 13–14px | 600–800 | -.01em | Manrope |
| Help text, sub-labels, menu items | 12–13px | 500–700 | — | Manrope |
| Eyebrow / column header / table header | 10–11px | 800 | **.2em** UPPER | Manrope |
| Micro day-pill label | 9px | 800 | .2em UPPER | Manrope |

**Fixed, not fluid:** every size is a fixed px (inline) or rem (CSS). **No `clamp()`/fluid type anywhere** — consistent with the no-breakpoints finding (§12).

### Font loading (actual)
```css
/* colors_and_type.css */
@import url('…Material+Symbols+Outlined:opsz,wght,FILL,GRAD@…');   /* icons */
@font-face { font-family:'Manrope'; src:url('fonts/Manrope-VariableFont_wght.ttf')…; font-weight:200 800; }
/* + 8 explicit static weights 200/300/400/500/600/700/800 from fonts/ */
```
- **Manrope** — fully self-hosted, all weights present.
- **Material Symbols Outlined** — Google Fonts `@import`, axis `opsz 20..48, wght 100..700, FILL 0..1, GRAD -50..200`.
- **JetBrains Mono** — declared in `code,kbd,samp,pre` and in ~40 inline `fontFamily` strings but **no `@font-face` / link**. Renders as the OS mono fallback. *Stated convention violated: the mono motif is unenforced.*

### Pairing rule
**One family for everything (Manrope), mono for numerics only.** The rule in practice: any number a user reads as data (time, money, counts, capacity `X/3`, slot length, cents) gets `fontFamily: JetBrains Mono` + `fontVariantNumeric: tabular-nums`; everything else is Manrope. Violations: several numerals use only `tabular-nums` *without* the mono family (e.g. `pageSub` counts, KPI `outcomeCount` is Manrope by design) — inconsistent application, though arguably intentional for display figures.

---

## 5. Layout System

### Containers
Every page is the **same two-column app shell**, redeclared per file (no shared component):
```jsx
frame: { display:'grid', gridTemplateColumns:'264px 1fr', minHeight:1280–1480, background:'#f9f9f7' }
sidebar: { padding:'32px 20px', borderRight:'1px solid rgba(195,198,209,.20)' }
main:    { padding:'32px 48px', display:'flex', flexDirection:'column', gap:24–28 }
```
No max-width on `main` — it fills the artboard (artboards are fixed 1440px wide in the HTML shells).

### Section spacing
Vertical rhythm is **flex `gap` on `main`**: `24px` (availability/reminders) or `28px` (appointments). Within sheets, section heads pad `22–24px 24px 14–18px`; card bodies pad `8–28px 24–28px`. A trailing `<div style={{height:24–48}} />` spacer closes each page. **All fixed — none of it responds.**

### Grid patterns
| Pattern | Implementation | Used in |
|---|---|---|
| App shell | `grid-template-columns:'264px 1fr'` | every page |
| KPI cards | `grid-template-columns:'repeat(3,1fr)', gap:14` | Appointments outcome cards |
| Buffer / radio pills | `repeat(3,1fr), gap:14` | Availability buffer, Payment radio |
| Reminder timeline | `repeat(7,1fr), gap:12` | Reminders ledger pills |
| Two-up fields | `grid-template-columns:'1fr 1fr', gap:14–24` | Availability timezone/slot, time fields |
| Flex table row | `display:flex, gap:14` + `flex:'0 0 Npx'` / `'1 1 Npx'` columns | Appointments, Slot recovery, Customers |
| Summary strip | `flex` + `1px` divider elements | Availability `WeeklySummary` |
**Responsive collapse: none.** These grids have fixed column counts and never reflow — there are zero media queries.

---

## 6. Component Recipes

### Section header (eyebrow + title + lede)
```jsx
<div>
  <div style={ax.sectionEyebrow}>The ledger</div>   {/* 10px/800/.2em UPPER, #43474f @.55 */}
  <h3 style={ax.sectionTitle}>Recent appointments</h3> {/* 24px/800/-.02em #001e40 */}
  <div style={ax.sectionSub}>Recent, pending… last 7 days.</div> {/* 13px #43474f */}
</div>
```

### Card / sheet (the one elevation)
```jsx
cardSheet: { background:'#fff', borderRadius:24, overflow:'hidden',
             boxShadow:'0 20px 40px rgba(26,28,27,0.04)' }   /* the only float used */
```

### Primary CTA (navy gradient)
```jsx
priBtn: { padding:'13px 20px', border:0, borderRadius:12,
  background:'linear-gradient(135deg,#001e40,#003366)', color:'#fff',
  fontWeight:700, fontSize:13, letterSpacing:'.02em',
  boxShadow:'0 14px 28px rgba(0,30,64,.2)' }
```

### Ghost button
```jsx
ghostBtnSm: { padding:'10px 14px', borderRadius:10,
  border:'1px solid rgba(195,198,209,.4)', background:'#fff'/* or transparent */,
  fontWeight:600, fontSize:13, color:'#43474f' }
```

### Navigation states
```jsx
navItem:       { padding:'11px 12px', borderRadius:10, fontSize:14, fontWeight:600, color:'#43474f' }
navItemActive: { background:'#001e40', color:'#fff' }          // + icon fill:1, weight:500
hover (JS):    { background:'#eeeeec' }                         // useState(hover), not :hover
// active item shows filled Material Symbol; badge inverts to rgba(255,255,255,.16)/#fff
```

### Filter pill (segmented)
```jsx
filterPill:       { padding:'8px 14px', borderRadius:9999, border:0, background:'transparent', fontSize:12, fontWeight:700, color:'#43474f' }
filterPillActive: { background:'#001e40', color:'#fff' }   // active count appended: "Settled · 3"
```

### Form field (label + bordered input wrap)
```jsx
fieldLabel: { fontSize:13, fontWeight:800, color:'#001e40' }   // + optional requiredDot #a8294a "•"
inputWrap:  { display:'flex', alignItems:'center', gap:10, padding:'12px 14px',
              borderRadius:12, background:'#fff', border:'1px solid rgba(195,198,209,.5)' }
inputBare:  { border:0, outline:'none', background:'transparent', fontWeight:700, color:'#001e40' }
fieldHelp:  { fontSize:12, color:'#43474f', opacity:.75 }      // inline <code> chips on #f4f4f2
```

### Status pills (3 distinct families)
```jsx
RiskPill   // dot + UPPER label, tinted bg rgba(color,.10) : top #0e7a55 / neutral #eeeeec / risk #a8294a
OutcomePill// dot + label, no bg : settled/voided/unresolved
RecoveryStatus // icon + label, tinted bg : open #c97a2a / filled #0e7a55 / expired neutral
```

### Brand-signature micro-interactions
- **Capacity dial** (`reminders`): 3 dots + mono `X/3` that flip navy→amber at the cap.
- **Hatched closed-day fill** (`availability`): `repeating-linear-gradient(135deg,…)` + line-through on disabled `<input type=time>`.
- **24-hour rail** (`availability` timeline): navy gradient bar positioned by `(openH/24)*100%`.
- **Ledger band** (`appointments`): full-bleed navy gradient divider inverting an entire section header to white.

---

## 7. Interaction States

| Element | Hover | Active/Press | Focus |
|---|---|---|---|
| Nav item | `bg #eeeeec` (JS state) | persistent `bg #001e40` if active route | none |
| Table row | `bg #f9f9f7` + row-arrow opacity .45→1 (JS) | — | none |
| Filter pill | none (no hover style) | `bg #001e40 #fff` | none |
| Primary CTA | none — no hover defined | reminders only: disabled/saving/saved states | none |
| Ghost button | none | — | none |
| Sort menu item | active item `bg #f4f4f2` | click selects | none |
| Inputs/select | — | — | global `input:focus-visible{box-shadow:0 0 0 3px rgba(0,30,64,.12)}` in each HTML shell |
| Buffer/radio pill | none | selected ring `0 0 0 4px rgba(0,30,64,.08)` | none |

**What is *not* done:** no `:hover` shadow lift on cards; no color inversion on CTAs; **buttons have no hover or focus state at all** (only inputs get `:focus-visible`, defined in the HTML `<style>`, not the system). Hover is JS-`useState` on nav/rows, so it doesn't fire for keyboard users. **This is the weakest area of the system.**

---

## 8. Shadows & Elevation

| Shadow | Value | Used where |
|---|---|---|
| Card float | `0 20px 40px rgba(26,28,27,0.04)` | every card/sheet/summary/save-bar |
| CTA float | `0 14px 28px rgba(0,30,64,.2)` | primary buttons, navy bars |
| Brand mark | `0 8px 18px rgba(0,30,64,.18)` | sidebar logo tile |
| Menu | `0 20px 40px rgba(26,28,27,0.10)` | sort dropdown |
| Selected ring | `0 0 0 4px rgba(0,30,64,.06–.08)` | selected radio/buffer pills |
| `--al-shadow-float-lg` | `0 32px 64px …` | **DEAD — never used** |

**Philosophy:** flat by default; cards sit on one soft, near-colorless float (note the code uses `0.04` alpha, *lighter* than the token's `0.06`). Color shadows (navy) are reserved for things that "lift toward the user" — CTAs and the active brand mark. Separation is otherwise done with **hairlines**, not shadow.

---

## 9. Borders & Corners

**Radius philosophy:** soft, generous, role-scaled. Cards/sheets = `24` (`-3xl`); buttons/inputs/pills-containers = `10–12`; badges/status pills/dots = `9999` (`-pill`); small chips/menu items = `4–8`. Sharp corners never appear.

**Border/divider technique — the signature hairline:** virtually every divider is `1px solid rgba(195,198,209,.20)` (that rgb = `--al-outline-variant` #c3c6d1). Opacity is dialed `.20` (dividers) → `.30` (input rest) → `.40–.55` (interactive borders). Table rows separate with `borderTop:'1px solid rgba(195,198,209,.20)'` skipping the first row. **This rgba is written inline ~100+ times rather than referencing `--al-outline-variant` or `--al-ghost-border`.**

---

## 10. Imagery & Media

- **No photography.** No `<img>`, no `background-image` URLs. Avatars are **initials on a gradient** (`linear-gradient(135deg,#d5e3ff,#a7c8ff)` top-tier; `#fdd8cb,#e2bfb3` standard).
- **Gradient overlays:** the only gradients are the navy CTA (`135deg,#001e40,#003366`) and avatar tints. No blend modes, no image scrims.
- **Hatch fill** as media texture: `repeating-linear-gradient(135deg, transparent 0 7px, rgba(195,198,209,.18) 7px 8px)` marks closed days.
- **Icons:** Material Symbols Outlined exclusively, via per-file `Icon`/`AvIcon`/`PpIcon`/`RmIcon` wrappers (identical code, 4+ copies). Convention: `size` 14–20, `fill:0` default / `fill:1` for active/selected/emphasis, `weight` 400 default / 500 when active. **No emoji, no custom SVG icons.**

---

## 11. Animation & Motion

### Easing & duration
**No motion tokens exist.** Durations are inline literals, clustered but not unified:
- `.12s` (table row bg), `.15s` (hover/border/background — the most common), `.2s`/`.25s`/`.3s` (capacity dots, alert expand), `.8s linear` (spinner).
- Easing is almost always the implicit default (`ease`); the only named curve is `cubic-bezier(.2,.7,.3,1)` inside `design-canvas.jsx` (tooling, not product).

**There is no single canonical curve.** `.15s` is the de-facto standard for state changes but it's copy-pasted, not tokenized.

### Scroll reveals
**None.** No IntersectionObserver, no reveal-on-scroll, no stagger. Content is static on load.

### Signature animations
- **Spinner** (`reminders`): `@keyframes rmSpin{to{transform:rotate(360deg)}}`, `0.8s linear infinite` — defined in `Reminders.html` `<style>`, scoped to that page only.
- **At-capacity banner**: height/opacity transition (`max-height .3s, opacity .2s`) — a CSS accordion, no keyframes.
- That's the extent of branded motion. The system is **deliberately still**, consistent with its editorial restraint — but the stillness is by omission, not by a documented "reduce motion" stance.

---

## 12. Breakpoints

| Name | Value | Direction | What collapses |
|---|---|---|---|
| — | — | — | **Nothing. There are no breakpoints.** |

**The system is fixed-width, desktop-only.** Zero `@media` queries across all files. Layouts assume a ~1440px artboard (the `design-canvas.jsx` frame). `flexWrap:'wrap'` on a few header rows is the *only* responsive behavior, and it's incidental. A contributor must not assume any mobile adaptation exists — **building a mobile screen means designing a new layout from scratch.**

---

## 13. Brand Non-Negotiables

1. **Light theme only.** Canvas is `#f9f9f7`, cards are `#ffffff`. Never introduce a dark surface except the intentional navy ledger band.
2. **Navy is the only ink and the only CTA color.** CTAs are always the `135deg,#001e40,#003366` gradient. Never a flat or alternate-color button.
3. **Terracotta is rationed.** The warm accent (`#fdd8cb` family) appears on avatars and at most one badge per viewport — never as a section background or button.
4. **Every data number is tabular.** Always `fontVariantNumeric:'tabular-nums'`; user-read figures (time/money/counts) additionally get the mono family.
5. **Eyebrows are 10–11px, weight 800, `.2em` tracking, UPPERCASE, `#43474f` @ ~.55 opacity.** This is the most repeated motif — never restyle it.
6. **One elevation.** Cards use the single soft float (`0 20px 40px rgba(26,28,27,0.04)`); deeper shadows are for CTAs/menus only. No hover lift on cards.
7. **Hairlines, not boxes.** Dividers/borders are `rgba(195,198,209,.2–.55)`, 1px. First table row never gets a top border.
8. **Radius ladder:** 24 for sheets, 10–12 for controls, 9999 for pills/dots. No sharp corners.
9. **Weight 800 for emphasis, not size jumps or color.** Titles, labels, numbers all lean on 800.
10. **Icons are Material Symbols Outlined**, fill 0→1 to signal active. No emoji, no bespoke SVG glyphs.
11. **Status = navy / `#0e7a55` green / `#c97a2a` amber / `#a8294a` rose**, shown as small tinted pills or dots — never as fills or full-width banners (except the dedicated conflict banner).
12. **Motion stays under ~0.3s and uses default easing.** No scroll animation, no decorative loops.

---

## 14. Design System Quality Assessment

| Dimension | Score | Evidence |
|---|---|---|
| **Token coverage** | **3** | A genuinely thorough token file (color roles, full type scale, radii, spacing 1–24) — but motion and breakpoints are entirely untokenized, and `_lg` shadow / tertiary / inverse / `--color-*` aliases are defined-but-dead. |
| **Token consistency** | **2** | The critical failure: 5 of 6 pages **bypass the tokens entirely**, hardcoding `#001e40`, `#43474f`, `rgba(195,198,209,.2)` inline 100+ times each. Only `reminders-app.jsx` (post-refactor) consumes `var(--al-*)`. The design system exists but is not *used*. |
| **Naming clarity** | **4** | `--al-on-surface-variant`, `--al-surface-container-high`, `--al-warning-outline` communicate role/intent well (Material-3 lineage). Minor: `-fixed`/`-fixed-dim` are opaque without M3 knowledge. |
| **Responsive coherence** | **1** | No breakpoints, no media queries, no fluid type. Fixed 1440px desktop only — `flexWrap` is the sole adaptive behavior. |
| **Typography discipline** | **3** | The scale is followed *in spirit* (sizes cluster on the rungs), but components write raw px (`fontSize:15`, `13`, `40`) inline instead of `var(--al-*)`, and `15px`/`13px` aren't even on the scale. Eyebrow motif is rock-solid. |
| **Component reuse** | **1** | Near-zero extraction. The sidebar, `Icon` wrapper, nav item, button styles, and the entire `frame/main/topbar` shell are **copy-pasted in full across all 6 app files** with subtle drift (e.g. nav badge bg differs between appointments and availability). |
| **Interaction consistency** | **2** | Hover is ad-hoc JS `useState` on some elements (nav, rows) and absent on others (buttons, pills). Focus exists only for inputs, defined in HTML shells not the system. No unified state model. |
| **Animation restraint** | **4** | Restraint is real and on-brand — nothing is excessive. Docked only because "restraint" is achieved by omission and uses scattered inline durations rather than a deliberate, tokenized motion language. |
| **Accessibility baseline** | **2** | `:focus-visible` on inputs only; buttons/nav/pills have no focus ring; hover-only affordances (row arrows) are invisible to keyboard. Color contrast is mostly strong (navy on white), but `#43474f` @ .55 opacity for eyebrows and `outline:none` resets are risk areas. Semantic `<h2>/<h3>` used in some sheets, but most structure is `<div>`. |
| **Dead code / drift** | **2** | Notable dead tokens (`-lg` shadow, tertiary family, inverse-*, `--color-*` layer, `.al-card-glass`), a **declared-but-unloaded JetBrains Mono**, 4 duplicate `Icon` components, and a `reminders-app.v1.jsx.bak` orphan. Token alpha drift: float shadow is `.04` in code vs `.06` in the token. |

### Top 3 risks
1. **Tokens are decorative, not load-bearing.** Change `--al-primary` and only Reminders updates; the other 5 pages keep their inline `#001e40`. The system can't be themed or rebranded without a find-and-replace across thousands of inline literals.
2. **Six divergent copies of the shell.** Every fix (a nav tweak, a new sidebar item, a button hover) must be hand-applied 6× and *will* drift — the nav-badge background already differs between pages.
3. **Accessibility + responsive are absent, not partial.** No button focus states, hover-only controls, and zero breakpoints mean keyboard and mobile users hit hard walls; retrofitting later touches every file.

### Top 3 strengths
1. **A real, well-structured token vocabulary.** The `colors_and_type.css` foundation (M3 color roles, complete type/spacing/radius scales) is genuinely good — the hard design thinking is done; it just needs to be *consumed*.
2. **A distinctive, disciplined visual identity.** Navy + rationed terracotta + 800-weight + uppercase eyebrows + tabular mono numerals is a coherent, recognizable "editorial atelier" look that reads as intentional, not template.
3. **Reminders is the proven migration target.** `reminders-app.jsx` already demonstrates the whole system working through `var(--al-*)` with a clean `T` token map — it's a copy-paste blueprint for refactoring the other five pages and extracting the shared shell.

---

### Day-one cheat sheet for a new contributor
- **Canvas** `#f9f9f7` · **cards** `#fff` radius `24` shadow `0 20px 40px rgba(26,28,27,.04)`.
- **Ink** navy `#001e40`; **muted** `#43474f`; **hairline** `rgba(195,198,209,.2)`.
- **CTA** = navy gradient, radius 12. **Eyebrow** = 10px/800/.2em UPPER/#43474f.
- **Numbers** = tabular + mono. **Icons** = Material Symbols, fill 1 when active.
- Prefer `var(--al-*)` (see `reminders-app.jsx`) over inline hex — the rest of the codebase doesn't yet, but new work should.
