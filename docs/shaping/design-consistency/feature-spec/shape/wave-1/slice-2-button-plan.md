# Slice 2 — Button: Outline Variant

**Spec:** #05 (Button Forbidden Tokens)
**File:** `src/components/ui/button.tsx`
**Depends on:** Nothing (all replacement tokens already exist in production globals.css)

---

## Step 1: Replace outline variant tokens

**File:** `src/components/ui/button.tsx`, line 16

Replace the `outline` variant string:

```tsx
// FROM:
outline:
  "border shadow-xs [background:var(--color-surface-elevated)] [border-color:var(--color-border-medium)] [color:var(--color-text-primary)] hover:[background:var(--color-surface-float)] hover:[border-color:var(--color-border-strong)]",

// TO:
outline:
  "border shadow-xs [background:var(--al-surface-container-lowest)] [border-color:var(--al-outline-variant)] [color:var(--al-on-surface)] hover:[background:var(--al-surface-container)] hover:[border-color:var(--al-outline)]",
```

Token mapping applied:

| Position | Deep Ledger | AL Replacement |
|---|---|---|
| background | `--color-surface-elevated` | `--al-surface-container-lowest` |
| border-color | `--color-border-medium` | `--al-outline-variant` |
| color | `--color-text-primary` | `--al-on-surface` |
| hover:background | `--color-surface-float` | `--al-surface-container` |
| hover:border-color | `--color-border-strong` | `--al-outline` |

---

## Step 2: Verify no other --color-* references

Scan the entire file for any remaining `--color-` references. The other variants (`default`, `destructive`, `secondary`, `ghost`, `link`) use Tailwind theme tokens (`bg-primary`, `bg-destructive`, etc.) which are fine. The `al-*` variants already use correct `--al-*` tokens.

Expected: zero `--color-` references after the edit.

---

## Self-testing

1. **Grep for forbidden tokens:**
   ```bash
   grep '\-\-color-' src/components/ui/button.tsx
   ```
   Expected: zero matches.

2. **Grep for AL tokens in outline variant:**
   ```bash
   grep 'al-surface-container-lowest\|al-outline-variant\|al-on-surface\|al-surface-container\|al-outline' src/components/ui/button.tsx
   ```
   Expected: 5 matches (one per token in the outline variant string).

3. **Build check:** Run `pnpm build` — must complete with zero errors.

4. **Type check:** Run `pnpm tsc --noEmit` — zero type errors (string literal change only, no type impact).

5. **Visual smoke test:** Start dev server, find a page with an outline button (dashboard settings or booking flow). Verify:
   - Button has a white/light background (not dark `#253044`)
   - Border is light gray (`#c3c6d1`), not white-translucent
   - Text is dark (`#1a1c1b`), not light (`#edf2f7`)
   - Hover state: background shifts to `#eeeeec`, border strengthens to `#737780`
