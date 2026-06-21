# Spike — Token Existence Verification

**Spec:** #04 (AL Utility Classes)  
**Date:** 2026-06-20  
**Question:** Do `--al-track-eyebrow`, `--al-radius-3xl`, and `--al-display-lg` exist in production `globals.css`?

---

## Findings

All three tokens are **ABSENT** from production `src/app/globals.css`. They exist only in `docs/design-system/tokens/`.

| Token | Production (`globals.css`) | Docs | Intended Value |
|-------|---------------------------|------|----------------|
| `--al-track-eyebrow` | ❌ NOT FOUND | `typography.css:52` | `0.2em` |
| `--al-radius-3xl` | ❌ NOT FOUND | `spacing.css:30` | `24px` |
| `--al-display-lg` | ❌ NOT FOUND | `typography.css:26` | `3.5rem` (56px) |

The `current-issues.md` statement (line 13) is **accurate**: these tokens were incorrectly marked as added in the "Solved" section but were never actually committed to the `:root` block (lines 258–453).

## Impact on Spec #04

- `--al-track-eyebrow` → Used by `.al-eyebrow` (`letter-spacing: var(--al-track-eyebrow)`)
- `--al-radius-3xl` → Used by `.al-card` (`border-radius: var(--al-radius-3xl)`)
- `--al-display-lg` → NOT used by any spec #04 class (but tracked as a missing token)

**Action required:** Add `--al-track-eyebrow: 0.2em` and `--al-radius-3xl: 24px` to the `:root` block before adding utility classes. Optionally add `--al-display-lg: 3.5rem` to clear the current-issues.md item.

## Insertion Points

- `--al-track-eyebrow` → Tracking section (near other `--al-track-*` tokens)
- `--al-radius-3xl` → Roundness section (near other `--al-radius-*` tokens)
- `--al-display-lg` → Type scale section (near other `--al-display-*` tokens)
