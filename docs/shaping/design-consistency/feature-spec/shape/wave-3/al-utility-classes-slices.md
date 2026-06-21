# Slices — AL Utility Classes (Spec #04, Wave 3)

**Shape:** A (Exact Spec Drop-in)  
**File:** `src/app/globals.css` (single file for both slices)  

---

## Slice 1 — Token Pre-reqs

**Goal:** Add the 3 missing tokens to the `:root` block so utility classes can reference them.

| Token | Value | Section | Purpose |
|-------|-------|---------|---------|
| `--al-track-eyebrow` | `0.2em` | Tracking (~line 407) | Used by `.al-eyebrow` |
| `--al-radius-3xl` | `24px` | Roundness (~line 452) | Used by `.al-card` |
| `--al-display-lg` | `3.5rem` | Type scale (~line 380) | Clears current-issues.md item #13 |

**Files changed:** `src/app/globals.css` (3 lines added to `:root`)  
**Side effect:** Update `docs/context/current-issues.md` — resolve item #13  
**Plan:** [slice-1-token-prereqs-plan.md](slice-1-token-prereqs-plan.md)

---

## Slice 2 — Utility Classes

**Goal:** Append 8 utility classes to the Atelier Light Utilities section.

**Blocked by:** Slice 1 (`.al-eyebrow` needs `--al-track-eyebrow`, `.al-card` needs `--al-radius-3xl`)

| Class | Role | Tokens consumed |
|-------|------|----------------|
| `.al-page` | Standard page wrapper | `--al-font`, `--al-background`, `--al-main-pad-y/x`, `--al-sp-6` |
| `.al-page-title` | Page title (44px/800) | `--al-display-md`, `--al-w-extra`, `--al-track-display`, `--al-primary` |
| `.al-section-title` | Section title (24px/800) | `--al-headline-md`, `--al-w-extra`, `--al-primary` |
| `.al-eyebrow` | Signature eyebrow motif | `--al-font`, `--al-label-sm`, `--al-w-extra`, `--al-track-eyebrow`, `--al-on-surface-variant` |
| `.al-lede` | Body lede / description | `--al-title-sm`, `--al-on-surface-variant` |
| `.al-card` | Card container (single elevation) | `--al-surface-container-lowest`, `--al-radius-3xl`, `--al-shadow-float` |
| `.al-num` | Tabular numerics | (none — pure CSS) |
| `.al-mono` | Monospace numerics | `--al-font-mono` |

**Files changed:** `src/app/globals.css` (~50 lines appended after line 723)  
**Plan:** [slice-2-utility-classes-plan.md](slice-2-utility-classes-plan.md)

---

## Execution Order

```
Slice 1 (tokens) ──→ Slice 2 (utilities)
```

Sequential — Slice 2 depends on Slice 1's tokens.
