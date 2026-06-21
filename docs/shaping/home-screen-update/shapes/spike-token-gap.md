# Spike: Token Gap Audit

**Question:** Which DS tokens referenced in the 11 fix specs are missing from `globals.css`?

## Findings

| Token | Present? | Line # | Current Value | Notes |
|-------|----------|--------|---------------|-------|
| `--al-shadow-cta` | **Missing** | — | — | Must add: `0px 14px 28px rgba(0, 30, 64, 0.20)` |
| `--al-focus-ring` | **Missing** | — | — | Must add: `0 0 0 3px rgba(0, 30, 64, 0.12)` |
| `--al-hairline` | **Missing** | — | — | `--al-ghost-border` (L366) has same value; add as alias or standalone |
| `--al-track-eyebrow` | **Missing** | — | — | Must add: `0.2em` |
| `--al-display-lg` | **Missing** | — | — | Must add: `3.5rem` (56px) |
| `--al-radius-3xl` | **Missing** | — | — | Must add: `24px` (ladder stops at `-2xl: 16px`) |
| `--al-status-positive` | Present | 358 | `#0e7a55` | Matches expected |
| `--al-status-positive-bg` | Present | 359 | `rgba(14, 122, 85, 0.10)` | Matches expected |
| `--al-shadow-float` | Present | 367 | `0px 20px 40px rgba(26, 28, 27, 0.06)` | Note: 0.06 alpha vs DS spec 0.04 |
| `--al-gradient-cta` | Present | 368 | Matches | No action |

## Tailwind Theme Block

The `@theme inline` block maps only colors (`--color-al-*`). No shadow, gradient, typography, or radius tokens are mapped. Non-color tokens must be used via `var()` in inline styles or Tailwind arbitrary values like `shadow-[var(--al-shadow-float)]`.

## Conclusion

**6 tokens must be added** to `globals.css :root` before the dashboard fix. No Tailwind theme mappings needed (arbitrary values suffice).
