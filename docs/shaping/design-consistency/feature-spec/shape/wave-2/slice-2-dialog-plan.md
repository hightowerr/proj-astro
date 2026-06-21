# Slice 2 — Dialog: Token Migration

**Shape:** design-consistency-wave2-shape.md
**Spec:** #06
**File:** `src/components/ui/dialog.tsx`
**Risk:** Minimal

---

## Steps

### Step 1 — Replace DialogContent inline style tokens (lines 66–68)

Replace:
```tsx
style={{
  background: "var(--color-surface-raised)",
  border: "1px solid var(--color-border-default)",
  boxShadow: "var(--shadow-lg)",
```

With:
```tsx
style={{
  background: "var(--al-surface-container-lowest)",
  border: "1px solid var(--al-outline-variant)",
  boxShadow: "var(--al-shadow-menu)",
```

### Step 2 — Replace DialogPrimitive.Close inline style token (line 77)

Replace:
```tsx
style={{ color: "var(--color-text-tertiary)" }}
```

With:
```tsx
style={{ color: "var(--al-on-surface-variant)" }}
```

### Step 3 — Replace DialogDescription inline style token (line 132)

Replace:
```tsx
style={{ color: "var(--color-text-secondary)" }}
```

With:
```tsx
style={{ color: "var(--al-on-surface-variant)" }}
```

---

## Token Summary

| Line | Old Token | New Token |
|------|-----------|-----------|
| 66 | `--color-surface-raised` | `--al-surface-container-lowest` |
| 67 | `--color-border-default` | `--al-outline-variant` |
| 68 | `--shadow-lg` | `--al-shadow-menu` |
| 77 | `--color-text-tertiary` | `--al-on-surface-variant` |
| 132 | `--color-text-secondary` | `--al-on-surface-variant` |

---

## Self-testing

1. **No forbidden tokens remain:** `grep -n "color-surface-raised\|color-border-default\|shadow-lg\|color-text-tertiary\|color-text-secondary" src/components/ui/dialog.tsx` — should return 0 matches
2. **AL tokens present:** `grep -n "al-" src/components/ui/dialog.tsx` — should show 5 occurrences at lines 66–68, 77, 132
3. **TypeScript check:** `pnpm tsc --noEmit --pretty` (or `pnpm build`) — no type errors expected (inline styles are string values, not type-checked against token names)
4. **Visual check:** Open any page that uses a Dialog (e.g., settings, booking cancellation). Dialog should render with:
   - White background (`#ffffff`)
   - Light gray border (`#c3c6d1`)
   - Soft float shadow
   - Muted gray close button and description text (`#43474f`)
