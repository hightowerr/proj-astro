# Implementation Plan — Slice 2: Utility Classes

**Spec:** #04 (AL Utility Classes)  
**Wave:** 3  
**File:** `src/app/globals.css`  
**Blocked by:** Slice 1 (token pre-reqs)

---

## Goal

Append 8 utility classes to the Atelier Light Utilities section of `globals.css`, providing canonical patterns for page structure, typography, cards, and numerics.

---

## Changes

### Append after line 723 (end of `.al-toggle-thumb` block)

Insert the following CSS block. The exact content matches spec #04:

```css
/* ── Page structure ─────────────────────────────────── */

/* Standard app page wrapper */
.al-page {
  font-family: var(--al-font);
  background: var(--al-background);
  min-height: 100vh;
  padding: var(--al-main-pad-y) var(--al-main-pad-x);
  display: flex;
  flex-direction: column;
  gap: var(--al-sp-6);
}

/* Page title — canonical 44px / 800 */
.al-page-title {
  font-size: var(--al-display-md);
  font-weight: var(--al-w-extra);
  letter-spacing: var(--al-track-display);
  color: var(--al-primary);
  line-height: 1.0;
}

/* Section title — 24px / 800 */
.al-section-title {
  font-size: var(--al-headline-md);
  font-weight: var(--al-w-extra);
  letter-spacing: -0.02em;
  color: var(--al-primary);
  line-height: 1.1;
}

/* ── Typography helpers ─────────────────────────────── */

/* Eyebrow motif — the signature element */
.al-eyebrow {
  font-family: var(--al-font);
  font-size: var(--al-label-sm);
  font-weight: var(--al-w-extra);
  letter-spacing: var(--al-track-eyebrow);
  text-transform: uppercase;
  color: var(--al-on-surface-variant);
  opacity: 0.55;
}

/* Body lede / description text */
.al-lede {
  font-size: var(--al-title-sm);
  color: var(--al-on-surface-variant);
  line-height: 1.55;
  max-width: 62ch;
}

/* ── Surface & numerics ─────────────────────────────── */

/* Card container — the single elevation recipe */
.al-card {
  background: var(--al-surface-container-lowest);
  border-radius: var(--al-radius-3xl);
  box-shadow: var(--al-shadow-float);
  overflow: hidden;
}

/* Tabular numerics utility */
.al-num {
  font-variant-numeric: tabular-nums;
}

/* Monospace numerics (time, money, counts) */
.al-mono {
  font-family: var(--al-font-mono);
  font-variant-numeric: tabular-nums;
}
```

### Organization notes

- Sub-section comments (`/* ── Page structure ──… */`, etc.) group the 8 classes into 3 logical clusters for readability
- Each class has an inline comment describing its role
- The spec's `letter-spacing: -0.02em` on `.al-section-title` is a hardcoded value (not a token) — this matches the design system docs and is intentional since there's no `--al-track-section` token

---

## Files changed

| File | Change | Lines |
|------|--------|-------|
| `src/app/globals.css` | Append 8 utility classes after line 723 | ~55 lines added |

---

## Self-testing

1. **Class existence** — Grep for all 8 classes:
   ```bash
   grep -c "\.al-page\b\|\.al-page-title\|\.al-section-title\|\.al-eyebrow\b\|\.al-lede\|\.al-card\b\|\.al-num\b\|\.al-mono\b" src/app/globals.css
   ```
   Expected: 8 matches.

2. **Token resolution** — Verify every `var(--al-*)` reference resolves to an existing `:root` token:
   ```bash
   # Extract all var() references from the new classes
   grep -oP 'var\(--al-[\w-]+\)' src/app/globals.css | sort -u
   ```
   Cross-check each against the `:root` block. All should exist (including `--al-track-eyebrow` and `--al-radius-3xl` from Slice 1).

3. **TypeScript build** — Run `pnpm build`. No errors expected — CSS-only change.

4. **Visual spot-check** — Open any dashboard page in browser. No visual changes expected since no components use these classes yet. Verify the page renders normally (no CSS parse errors breaking the cascade).

5. **Design system doc alignment** — Confirm the 4 classes also defined in `docs/design-system/tokens/` (`base.css`, `typography.css`) have identical properties:
   - `.al-eyebrow` — 7 properties match
   - `.al-card` — 4 properties match
   - `.al-num` — 1 property matches
   - `.al-mono` — 2 properties match
