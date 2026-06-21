# Implementation Plan — Slice 1: Token Pre-reqs

**Spec:** #04 (AL Utility Classes)  
**Wave:** 3  
**File:** `src/app/globals.css`  

---

## Goal

Add 3 missing design system tokens to the `:root` block. These are defined in `docs/design-system/tokens/` but were never added to production CSS.

---

## Changes

### 1. Add `--al-display-lg` to Type Scale section

**Location:** After line 380 (`--al-display-md: 2.75rem;`), before line 381 (`--al-display-sm: 2.25rem;`)

```css
/* Current */
  --al-display-md:   2.75rem;
  --al-display-sm:   2.25rem;

/* After */
  --al-display-lg:   3.5rem;
  --al-display-md:   2.75rem;
  --al-display-sm:   2.25rem;
```

**Rationale:** The type scale is ordered large→small. `--al-display-lg` (56px) goes before `--al-display-md` (44px).

### 2. Add `--al-track-eyebrow` to Tracking section

**Location:** After line 407 (`--al-track-tight: -0.01em;`), before line 408 (blank line)

```css
/* Current */
  --al-track-tight:   -0.01em;

/* After */
  --al-track-tight:   -0.01em;
  --al-track-eyebrow: 0.2em;
```

### 3. Add `--al-radius-3xl` to Roundness section

**Location:** After line 451 (`--al-radius-2xl: 16px;`), before line 452 (`--al-radius-full: 9999px;`)

```css
/* Current */
  --al-radius-2xl:  16px;
  --al-radius-full: 9999px;

/* After */
  --al-radius-2xl:  16px;
  --al-radius-3xl:  24px;
  --al-radius-full: 9999px;
```

**Rationale:** Radius scale is ordered small→large. `3xl` (24px) sits between `2xl` (16px) and `full` (9999px).

---

## Side Effects

### Update `docs/context/current-issues.md`

Move item #13 ("3 AL tokens incorrectly marked as added") from **Open** to **Solved**:

```markdown
### Solved
- **3 missing AL tokens added to globals.css** — `--al-track-eyebrow` (0.2em), `--al-radius-3xl` (24px), `--al-display-lg` (3.5rem) added to `:root` block (2026-06-20). Previously existed only in `docs/design-system/tokens/`.
```

---

## Self-testing

1. **Grep verification** — Confirm all 3 tokens exist in production:
   ```bash
   grep -n "al-track-eyebrow\|al-radius-3xl\|al-display-lg" src/app/globals.css
   ```
   Expected: 3 lines matching, with correct values.

2. **TypeScript build** — Run `pnpm build` (or `pnpm tsc --noEmit`). No errors expected — tokens are CSS-only, no TS impact.

3. **Token ordering** — Visually confirm:
   - `--al-display-lg` appears before `--al-display-md` (large→small order)
   - `--al-radius-3xl` appears between `--al-radius-2xl` and `--al-radius-full`
   - `--al-track-eyebrow` appears in the Tracking section

4. **No regressions** — These are new tokens with no consumers yet. Nothing should change visually.
