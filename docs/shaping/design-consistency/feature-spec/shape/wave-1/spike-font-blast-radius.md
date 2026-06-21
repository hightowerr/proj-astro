# Spike: Legacy Font Removal Blast Radius

**Date:** 2026-06-19
**Goal:** Determine every reference to the three legacy fonts (Cormorant Garamond, Bricolage Grotesque, Fira Code) and their CSS variables before removing them from `layout.tsx` and replacing with JetBrains Mono.

---

## 1. Font Declarations (layout.tsx)

All three legacy fonts are declared in `src/app/layout.tsx`:

| Line | Code | Action |
|------|------|--------|
| 1 | `import { Cormorant_Garamond, Bricolage_Grotesque, Fira_Code, Manrope } from "next/font/google"` | Remove the three legacy imports; add `JetBrains_Mono` |
| 8-14 | `const cormorant = Cormorant_Garamond({ ... variable: "--font-cormorant" })` | Delete entire block |
| 16-20 | `const bricolage = Bricolage_Grotesque({ ... variable: "--font-bricolage" })` | Delete entire block |
| 22-27 | `const firaCode = Fira_Code({ ... variable: "--font-fira-code" })` | Delete entire block |
| 63 | `className={\`${cormorant.variable} ${bricolage.variable} ${firaCode.variable} ${manrope.variable} ...\`}` | Remove the three legacy `.variable` interpolations; add JetBrains Mono variable |

---

## 2. @theme inline block (globals.css lines 10-13)

These are the **root cause** -- the CSS custom properties that bridge font loading to usage:

| Line | Declaration | Resolves to | Impact |
|------|------------|-------------|--------|
| 10 | `--font-display: var(--font-cormorant), Georgia, 'Times New Roman', serif` | Cormorant Garamond | **Breaks** -- `var(--font-cormorant)` will be undefined. Falls back to Georgia. |
| 11 | `--font-body: var(--font-bricolage), system-ui, -apple-system, sans-serif` | Bricolage Grotesque | **Breaks** -- `var(--font-bricolage)` will be undefined. Falls back to system-ui. |
| 12 | `--font-mono: var(--font-fira-code), 'Courier New', monospace` | Fira Code | **Breaks** -- `var(--font-fira-code)` will be undefined. Falls back to Courier New. |
| 13 | `--font-manrope: var(--font-manrope-raw), 'Manrope', system-ui, sans-serif` | Manrope | No change needed |

**Required update:** Repoint these to the new font variables (Manrope + JetBrains Mono) or remove and replace with `--al-*` equivalents.

---

## 3. @layer base rules (globals.css lines 435-447)

These apply the legacy variables globally:

| Line | Rule | Currently resolves to | Will break? |
|------|------|-----------------------|-------------|
| 437 | `body { font-family: var(--font-body, system-ui, sans-serif); }` | Bricolage Grotesque | **Graceful fallback** to system-ui if `--font-body` updated/removed. |
| 441 | `h1-h6 { font-family: var(--font-display, Georgia, serif); }` | Cormorant Garamond | **Graceful fallback** to Georgia if `--font-display` updated/removed. |
| 445 | `code, kbd, samp, pre { font-family: var(--font-mono, monospace); }` | Fira Code | **Graceful fallback** to monospace if `--font-mono` updated/removed. |

---

## 4. Utility classes (globals.css lines 454-456)

| Line | Class | Currently resolves to | Will break? |
|------|-------|-----------------------|-------------|
| 454 | `.font-display { font-family: var(--font-display, Georgia, serif); }` | Cormorant Garamond | **Graceful fallback** to Georgia. Not used in any `src/` component className. |
| 455 | `.font-body { font-family: var(--font-body, system-ui, sans-serif); }` | Bricolage Grotesque | **Graceful fallback** to system-ui. Not used in any `src/` component className. |
| 456 | `.font-mono { font-family: var(--font-mono, monospace); }` | Fira Code | **Graceful fallback** to monospace, but heavily used (see Section 5). |

---

## 5. Component usage of `font-mono` Tailwind class

These components use `font-mono` as a Tailwind utility class. The class resolves through `.font-mono { font-family: var(--font-mono, monospace) }` in globals.css. When `--font-mono` is updated to point to JetBrains Mono, these will automatically pick up the new font -- no code changes needed.

| File | Line(s) | Context |
|------|---------|---------|
| `src/components/booking/service-selector.tsx` | 108 | `<span className="font-mono">` -- duration minutes display |
| `src/components/onboarding/shop-details-step.tsx` | 173 | `<p className="text-xs font-mono ...">` -- slug preview |
| `src/components/settings/sms-template-form.tsx` | 89, 115 | Placeholder tag pill + textarea |
| `src/components/settings/email-template-form.tsx` | 97, 147 | Placeholder tag pill + textarea |
| `src/components/settings/reminder-timings-form.tsx` | 92, 196, 286 | Time display, timing pills, step indicators |
| `src/components/dashboard/atelier-dashboard.tsx` | 113, 229, 234, 269, 272 | Stat pills, status badges, booking URL, embed code |
| `src/components/dashboard/shop-overview-card.tsx` | 44 | Booking URL link |
| `src/components/dashboard/hub-page.tsx` | 357 | Booking URL display |

**Verdict:** All 18 usages will **silently switch** from Fira Code to JetBrains Mono once `--font-mono` is repointed. This is the desired outcome. No breakage, no code changes needed.

---

## 6. Component usage of `var(--font-mono)` inline style

These components reference `var(--font-mono)` directly in inline `style` attributes or JS constants. Same resolution path as Section 5 -- repointing the CSS variable is sufficient.

| File | Line(s) | How used | Breaks? |
|------|---------|----------|---------|
| `src/components/booking/booking-form.tsx` | 1197 | `fontFamily: 'var(--font-mono)'` -- time slot button | No, auto-resolves |
| `src/components/manage/manage-booking-view.tsx` | 362, 372 | `fontFamily: "var(--font-mono)"` -- customer phone + payment amount | No, auto-resolves |
| `src/components/payments/tier-policy-form.tsx` | 40 (const), used at 264, 282, 400, 426, 438 | `const MONO = "var(--font-mono)"` -- 5 inline style usages for tier data | No, auto-resolves |
| `src/components/payments/payment-policy-form.tsx` | 153 (const), used at 214, 507, 519, 608, 731, 762 | `const FONT_MONO = "var(--font-mono)"` -- 6 inline style usages for payment data | No, auto-resolves |

**Verdict:** All 13 inline style usages will silently resolve to JetBrains Mono. No code changes needed.

---

## 7. Direct font name references in src/

No component in `src/` references `Cormorant`, `Bricolage`, or `Fira Code` by name outside of `layout.tsx`. The only direct references to the raw CSS variables (`--font-cormorant`, `--font-bricolage`, `--font-fira-code`) are in `globals.css` lines 10-12.

---

## 8. Atelier Light token gap

`globals.css` around line 377 defines `--al-font`, `--al-font-headline`, `--al-font-body`, `--al-font-label` -- all resolving to Manrope. However, there is **no `--al-font-mono` token defined** in the current globals.css. The design system token file at `docs/design-system/tokens/typography.css:17` defines `--al-font-mono: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace` but this has not been ported to globals.css.

This means the design system guidelines that reference `var(--al-font-mono)` (used extensively in `docs/design-system/` card HTML and JSX examples) are currently broken in production -- they fall through to the browser default monospace.

**Required:** Add `--al-font-mono` to the AL tokens block in globals.css, pointing to the new JetBrains Mono variable.

---

## 9. References in docs/ (informational only -- no runtime impact)

| File | Summary |
|------|---------|
| `docs/context/current-issues.md:12` | Notes JetBrains Mono is not loaded; using Fira Code instead. **Update after fix.** |
| `docs/shaping/services-page/handoff/PERFORMANCE_AUDIT.md:45,102` | Notes four Google Fonts loaded. **Update after fix.** |
| `docs/shaping/design-consistency/feature-spec/01-font-loading-cleanup.html` | Spec for this exact change -- lists all three fonts as forbidden. |
| `docs/shaping/design-consistency/feature-spec/02-base-font-rules.html` | Spec for rewriting the base font rules. |
| `docs/shaping/design-consistency/feature-spec/shape/design-consistency-wave1-shape.md` | Wave 1 shape doc; already describes the migration plan. |
| `docs/shaping/booking-page/shaping/time-slot-grid-*.md` | Multiple references to `--font-mono` resolving to Fira Code. |
| `docs/shaping/home-screen-update/shapes/*.md` | References to `font-mono` class usage and Fira Code as interim mono font. |

---

## 10. Summary: Files requiring changes

### Must change (runtime impact):

| # | File | Lines | What to do |
|---|------|-------|------------|
| 1 | `src/app/layout.tsx` | 1, 8-14, 16-20, 22-27, 63 | Remove 3 legacy font imports/consts; add JetBrains_Mono; update body className |
| 2 | `src/app/globals.css` | 10-12 | Repoint `--font-display` and `--font-body` to Manrope; repoint `--font-mono` to JetBrains Mono |
| 3 | `src/app/globals.css` | ~377 (AL tokens block) | Add `--al-font-mono: var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace;` |

### No code changes needed (auto-resolve through CSS variable):

| # | Files | Count | Why safe |
|---|-------|-------|----------|
| 4 | 8 component files using `font-mono` Tailwind class | 18 usages | Resolves through `.font-mono` utility which reads `--font-mono` |
| 5 | 4 component files using `var(--font-mono)` inline | 13 usages | Directly reads the CSS variable |

### Should update (docs, no runtime impact):

| # | File | Reason |
|---|------|--------|
| 6 | `docs/context/current-issues.md` | Remove "JetBrains Mono not loaded" issue |
| 7 | `docs/shaping/services-page/handoff/PERFORMANCE_AUDIT.md` | Update font count from 4 to 2 |

---

## 11. Risk assessment

| Risk | Level | Notes |
|------|-------|-------|
| Visual regression from font swap | **Low** | Fira Code -> JetBrains Mono is same category (monospace). Manrope already active for body. Cormorant only used via `--font-display` in heading base rule (no component explicitly uses `font-display` class). |
| `--font-display` / `--font-body` breaking something | **None in src/ components** | No component className or inline style references `var(--font-display)` or `var(--font-body)` directly. Only the globals.css base rules use them. |
| Missing `--al-font-mono` | **Medium** | Until added, design system docs examples referencing `var(--al-font-mono)` resolve to browser default monospace, not JetBrains Mono. Fix in same PR. |
| Bundle size | **Positive** | Removing 3 fonts, adding 1. Net reduction in font downloads. |
