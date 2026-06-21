# Plan: Slice 1 — Token Foundation

**Slice:** `docs/shaping/home-screen-ds-conformance-slices.md` → Slice 1
**Files:** `src/app/globals.css`, `docs/context/code-standards.md`

---

## Steps

### 1. Add missing tokens to `globals.css :root`

Insert the following 6 tokens into the `:root` block, grouped with their related existing tokens:

```css
/* After --al-ghost-border (line ~366) */
--al-hairline:        rgba(195, 198, 209, 0.20);

/* After --al-shadow-float (line ~367) — or in a new effects group */
--al-shadow-cta:      0px 14px 28px rgba(0, 30, 64, 0.20);
--al-focus-ring:      0 0 0 3px rgba(0, 30, 64, 0.12);

/* After --al-gradient-cta (line ~368) — typography group */
--al-track-eyebrow:   0.2em;
--al-display-lg:      3.5rem;

/* After --al-radius-2xl (line ~381) */
--al-radius-3xl:      24px;
```

### 2. Update `code-standards.md` radius reference

Line 28 currently reads:
```
- Maintain the border radius scale: `rounded-xl` for small elements, `rounded-2xl` for cards, `rounded-3xl` for modals.
```

Change to:
```
- Maintain the border radius scale: `rounded-xl` for small elements/controls, `rounded-3xl` for cards/sheets, `rounded-full` for pills.
```

---

## Self-testing

1. **Token presence:** After editing, grep `globals.css` for each token name — all 6 must appear exactly once in `:root`:
   ```bash
   grep -c '\-\-al-shadow-cta\|--al-focus-ring\|--al-hairline\b\|--al-track-eyebrow\|--al-display-lg\|--al-radius-3xl' src/app/globals.css
   ```
   Expected: 6 matches.

2. **No syntax errors:** Run `pnpm build` (or `pnpm dev`) and verify no CSS parse errors in the terminal output.

3. **No visual regression:** Open any existing page (e.g., `/app/appointments`). Adding new tokens with no consumers should produce zero visual change. Spot-check that the page renders identically.

4. **`code-standards.md` consistency:** Read the updated line and confirm it matches the DS radius ladder: sheets = 24px (`rounded-3xl`), controls = 10-12px (`rounded-xl`), pills = 9999px (`rounded-full`).
