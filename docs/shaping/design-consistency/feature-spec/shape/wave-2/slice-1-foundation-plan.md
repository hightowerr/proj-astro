# Slice 1 — Foundation: Fonts + Tokens

**Shape:** design-consistency-wave2-shape.md
**Spec:** #02 (remaining steps) + token gap from Spike C
**File:** `src/app/globals.css`
**Risk:** Minimal

---

## Steps

### Step 1 — Add 2 new status border tokens to `:root`

Insert after `--al-status-positive-border` (line 442):

```css
  --al-status-negative-border: rgba(168, 41, 74, 0.20);
  --al-status-caution-border: rgba(201, 122, 42, 0.20);
```

**Pattern:** Follows `--al-status-positive-border: rgba(14, 122, 85, 0.20)` — same 0.20 opacity, base color from each status token.

### Step 2 — Update `@layer base` font rules (lines 498, 502, 506)

Replace:
```css
body {
  @apply bg-background text-foreground;
  font-family: var(--font-body, system-ui, sans-serif);
}
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display, Georgia, serif);
}
code, kbd, samp, pre {
  font-family: var(--font-mono, monospace);
}
```

With:
```css
body {
  @apply bg-background text-foreground;
  font-family: var(--al-font);
}
h1, h2, h3, h4, h5, h6 {
  font-family: var(--al-font);
}
code, kbd, samp, pre {
  font-family: var(--al-font-mono);
}
```

**Note:** Drop the CSS fallback values — `--al-font` and `--al-font-mono` already contain full fallback stacks (`Manrope, system-ui, sans-serif` and `JetBrains Mono, ui-monospace, SFMono-Regular, monospace`).

### Step 3 — Update utility classes (lines 515–517)

Replace:
```css
.font-display { font-family: var(--font-display, Georgia, serif); }
.font-body    { font-family: var(--font-body, system-ui, sans-serif); }
.font-mono    { font-family: var(--font-mono, monospace); }
```

With:
```css
.font-display { font-family: var(--al-font); }
.font-body    { font-family: var(--al-font); }
.font-mono    { font-family: var(--al-font-mono); }
```

### Step 4 — Update current-issues.md

Add to Solved section:
- **`--font-display` and `--font-body` base rules normalized** — resolved by Wave 2 Slice 1 (2026-06-19). `@layer base` and utility classes now use `--al-font` / `--al-font-mono` directly. The `@theme inline` aliases still exist but are no longer depended on by base rules.

Add to Open section:
- **Stripe Elements theme still uses Deep Ledger** — `booking-form.tsx` lines 115–150 contain hardcoded dark-theme hex colors in the Stripe appearance object. Cannot use CSS variables. Needs a dedicated Stripe theme spec.
- **Hardcoded rgba hairlines in booking-form.tsx** — 7 instances of `rgba(195,198,209,0.50)` should use `--al-hairline-strong`. Not a `--color-*` violation but a tokenization gap.
- **Hardcoded rgba warning border in conflict-alert-banner.tsx** — `rgba(201,122,42,0.25)` at line 76 should use `--al-status-caution-border` once Wave 2 is complete.

---

## Self-testing

1. **Token existence check:** `grep -n "al-status-negative-border\|al-status-caution-border" src/app/globals.css` — should show 2 new definitions in `:root`
2. **Font rule check:** `grep -n "al-font" src/app/globals.css | grep -E "line (498|502|506|515|516|517)"` — or just verify lines 496–517 contain only `--al-font` / `--al-font-mono` references, no `--font-body` / `--font-display` / `--font-mono`
3. **No legacy in base rules:** `grep -n "font-body\|font-display" src/app/globals.css` — should only appear in `@theme inline` (lines 10–12), NOT in `@layer base` or utility classes
4. **Build check:** `pnpm build` — should compile without errors (font resolution unchanged)
5. **Dev server visual check:** Load any page — fonts should render identically (Manrope for text, JetBrains Mono for code/numbers). No visual change expected.
