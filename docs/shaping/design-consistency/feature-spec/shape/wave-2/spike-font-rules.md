# Spike A: Font Rule Location & Consumer Audit

**Date:** 2026-06-19
**Status:** RESOLVED

## Findings

### 1. `@layer base` block location and current variables

The `@layer base` block is at **lines 491-508** of `src/app/globals.css`.

```css
/* line 491 */ @layer base {
/* line 492 */   * {
/* line 493 */     @apply border-border;
/* line 494 */   }
/* line 496 */   body {
/* line 497 */     @apply bg-background text-foreground;
/* line 498 */     font-family: var(--font-body, system-ui, sans-serif);
/* line 499 */   }
/* line 501 */   h1, h2, h3, h4, h5, h6 {
/* line 502 */     font-family: var(--font-display, Georgia, serif);
/* line 503 */   }
/* line 505 */   code, kbd, samp, pre {
/* line 506 */     font-family: var(--font-mono, monospace);
/* line 507 */   }
/* line 508 */ }
```

All three rules use legacy Deep Ledger variables (`--font-body`, `--font-display`, `--font-mono`), each with a CSS fallback value.

### 2. Utility class location and current variables

The `.font-display`, `.font-body`, `.font-mono` utility classes are at **lines 515-517**:

```css
/* line 515 */ .font-display { font-family: var(--font-display, Georgia, serif); }
/* line 516 */ .font-body    { font-family: var(--font-body, system-ui, sans-serif); }
/* line 517 */ .font-mono    { font-family: var(--font-mono, monospace); }
```

Same legacy variables, same CSS fallbacks.

### 3. Consumers of legacy font variables outside globals.css

**`--font-body` and `--font-display`:** No consumers outside `globals.css` (excluding docs/shaping references and `.claude/worktrees/` copies). These are only referenced in the `@layer base` rules and utility classes above.

**`--font-mono`:** Has active consumers in four `src/` component files via inline styles:

| File | Line(s) | Usage |
|------|---------|-------|
| `src/components/booking/booking-form.tsx` | 1197 | `fontFamily: 'var(--font-mono)'` (time slot button) |
| `src/components/manage/manage-booking-view.tsx` | 362, 372 | `fontFamily: "var(--font-mono)"` (customer phone, payment amount) |
| `src/components/payments/tier-policy-form.tsx` | 40 (const `MONO`), used at 264, 282, 400, 426, 438 | `const MONO = "var(--font-mono)"` (5 inline style usages for tier data) |
| `src/components/payments/payment-policy-form.tsx` | 153 (const `FONT_MONO`), used at 214, 507, 519, 608, 731, 762 | `const FONT_MONO = "var(--font-mono)"` (6 inline style usages for payment data) |

Additionally, **18 components** use `font-mono` as a Tailwind class name (e.g., `className="font-mono ..."`). These resolve through the `.font-mono` utility class in globals.css, so updating the utility class variable will automatically propagate to all of them.

### 4. `--al-font` and `--al-font-mono` definitions

Both are already defined in `globals.css` inside the `:root` block:

| Token | Line | Value |
|-------|------|-------|
| `--al-font` | 373 | `var(--font-manrope-raw), 'Manrope', system-ui, sans-serif` |
| `--al-font-headline` | 374 | `var(--al-font)` |
| `--al-font-body` | 375 | `var(--al-font)` |
| `--al-font-label` | 376 | `var(--al-font)` |
| `--al-font-mono` | 377 | `var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace` |

The replacement tokens are ready to use.

## Conclusion

The migration is straightforward for the `@layer base` rules (lines 491-508) and utility classes (lines 515-517) -- six `var()` references need to change from `--font-body`/`--font-display` to `--al-font` and from `--font-mono` to `--al-font-mono`. The CSS fallback values should also update to match the Atelier Light token stacks. Beyond globals.css, `--font-body` and `--font-display` have zero consumers in `src/` code. However, `--font-mono` has 13 inline-style references across 4 component files (booking-form, manage-booking-view, tier-policy-form, payment-policy-form) that will continue resolving through the `@theme` definition at line 12. Since the `@theme` block still defines `--font-mono` and the inline styles reference it directly (not through the utility class), these will keep working regardless of the `@layer base` / utility class changes. Implementation should update the 6 CSS references in globals.css and leave the component inline styles for a separate sweep if desired.
