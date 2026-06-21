# Plan: Slice 6 — Theme Mapping Prerequisite

**Slice:** `hex-to-token-slices.md` → Slice 1
**File:** `src/app/globals.css`

---

## Steps

### 1. Add `--color-al-on-secondary-container` to `@theme inline`

Insert after `--color-al-on-secondary-fixed` (line 181):

```css
  --color-al-on-secondary-container: var(--al-on-secondary-container);
```

The secondary block should read:

```css
  --color-al-secondary:            var(--al-secondary);
  --color-al-secondary-container:  var(--al-secondary-container);
  --color-al-secondary-fixed:      var(--al-secondary-fixed);
  --color-al-on-secondary-fixed:   var(--al-on-secondary-fixed);
  --color-al-on-secondary-container: var(--al-on-secondary-container);
```

---

## Self-testing

1. **Token presence:** Grep for the new mapping:
   ```bash
   grep "color-al-on-secondary-container" src/app/globals.css
   ```
   Expected: exactly 1 match in the `@theme inline` block.

2. **No CSS parse errors:** Run `pnpm build` (or `pnpm dev`) and verify no CSS parse errors in terminal output.

3. **No visual regression:** Open any page that uses secondary container colors (e.g., dashboard at `/app`). Adding a new `@theme` mapping with no consumers yet produces zero visual change.

4. **Tailwind utility now works:** After this change, `text-al-on-secondary-container` and `bg-al-on-secondary-container` will be available as Tailwind utilities. Verify by temporarily adding `text-al-on-secondary-container` to any element in DevTools — it should resolve to `color: #785c53`.
