# V1 Implementation Plan — Outcome Badge + Design System Compliance

**Slice:** V1: Outcome Badge + Design System Compliance  
**Appetite:** ~2–3 hours  
**File changed:** `src/app/app/appointments/page.tsx` (one file only)  
**Tests:** No new unit tests — badge is a pure style map; TypeScript's union type check IS the test. `pnpm lint && pnpm typecheck` are the gates.

---

## Token Correction (Pre-flight Finding)

The analysis report assumed the page used the light `--al-*` Atelier token set and recommended `--al-surface-container-lowest` and ambient shadow `rgba(26,28,27,0.06)`. This is wrong.

The appointments page uses the **dark `--color-*` token system**:

| Token | Value | Role |
|-------|-------|------|
| `--color-surface-raised` | `#161e2c` | Card / table body background |
| `--color-surface-overlay` | `#1d2738` | Table `<thead>` / neutral badge background |
| `--color-surface-elevated` | `#253044` | Hover target (one step up from raised) |
| `--color-border-default` | `rgba(255,255,255,0.11)` | Borders being removed |
| `--color-border-hairline` | `rgba(255,255,255,0.04)` | Row separators being removed |

**Consequence for implementation:**
- No ambient light-theme shadow. Tonal lift (`surface-raised` cards on darker page background) is the separator.
- No `--al-surface-container-lowest`. All replacements use `--color-surface-raised`.
- Badge borders follow the existing `SlotStatusBadge` pattern (semantic `*-border` tokens).

---

## Change Order

Single file. Top to bottom:

```
1. Add FinancialOutcomeBadge component (new, at bottom of file)
2. Replace outcome column render (one line swap)
3. Fix outcome card styles (remove border × 3 cards)
4. Fix table wrapper styles (remove border × 2 wrappers, add surface background)
5. Fix table row styles (remove borderTop × 2 tables, add hover)
```

---

## Step 1 — Add `FinancialOutcomeBadge` Component

Add at the bottom of `page.tsx`, directly above or below `SlotStatusBadge`. Follow the exact same pattern.

```tsx
function FinancialOutcomeBadge({
  outcome,
}: {
  outcome: "unresolved" | "settled" | "voided" | "refunded" | "disputed";
}) {
  const styles: Record<typeof outcome, React.CSSProperties> = {
    settled: {
      background: "var(--color-success-subtle)",
      color: "var(--color-success)",
      border: "1px solid var(--color-success-border)",
    },
    voided: {
      background: "var(--color-error-subtle)",
      color: "var(--color-error)",
      border: "1px solid var(--color-error-border)",
    },
    unresolved: {
      background: "var(--color-surface-overlay)",
      color: "var(--color-text-tertiary)",
      border: "1px solid var(--color-border-subtle)",
    },
    refunded: {
      background: "var(--color-warning-subtle)",
      color: "var(--color-warning)",
      border: "1px solid var(--color-warning-border)",
    },
    disputed: {
      background: "var(--color-error-subtle)",
      color: "var(--color-error)",
      border: "1px solid var(--color-error-border)",
      fontWeight: 600,
    },
  };

  return (
    <span
      className="inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize"
      style={styles[outcome]}
    >
      {outcome}
    </span>
  );
}
```

**Why this works:** The `outcome` prop type is `typeof appointments.$inferSelect.financialOutcome` in the query, which is the same 5-value enum. TypeScript will error if any value is missing from the styles map.

---

## Step 2 — Replace Outcome Column Render

In the appointments table `<tbody>`, find:

```tsx
<td className="px-4 py-3">
  <span className="capitalize">
    {appointment.financialOutcome}
  </span>
</td>
```

Replace with:

```tsx
<td className="px-4 py-3">
  <FinancialOutcomeBadge outcome={appointment.financialOutcome} />
</td>
```

One line. TypeScript validates `appointment.financialOutcome` matches the badge's prop union automatically.

---

## Step 3 — Fix Outcome Card Borders

Three cards, same change each. Find (×3):

```tsx
style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-default)" }}
```

Replace with (×3):

```tsx
style={{ background: "var(--color-surface-raised)" }}
```

**Rationale:** The page background is darker than `surface-raised` (#161e2c). Cards lift from the page surface without needing a border. The border was adding a faint white glow (`rgba(255,255,255,0.11)`) that is now unnecessary.

> **Verify:** All three cards — Settled, Voided, Unresolved — must have the border style removed. Check line by line.

---

## Step 4 — Fix Table Wrapper Borders

Two table wrappers — Appointments and Slot Recovery. Find (×2):

```tsx
<div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--color-border-default)" }}>
```

Replace with (×2):

```tsx
<div className="overflow-hidden rounded-xl" style={{ background: "var(--color-surface-raised)" }}>
```

**Why `background` is added:** The wrapper currently has no background set. Table rows render transparent over whatever is beneath the wrapper. Removing the border without adding a background would expose table rows directly against the page background with no containment. Setting `surface-raised` on the wrapper gives the table body a defined surface — the thead already uses `surface-overlay` (#1d2738, slightly lighter), which creates the header/body tonal separation that replaces the old border.

---

## Step 5 — Fix Table Row Separators

Two tables, every `<tr>`. Find (×2 — once in appointments map, once in slot openings map):

```tsx
<tr key={...} style={{ borderTop: "1px solid var(--color-border-hairline)" }}>
```

Replace with (×2):

```tsx
<tr key={...} className="transition-colors hover:bg-[var(--color-surface-elevated)]">
```

**Rationale:** The hairline border was `rgba(255,255,255,0.04)` — 4% white, nearly imperceptible. The `py-3` padding on every `<td>` provides the vertical breathing room that was doing the actual separating work. The hover state (`surface-elevated` = #253044, two steps up from `surface-raised`) makes rows interactive without any line.

---

## Verification Sequence

Run these gates in order. Each must pass before proceeding to the next.

### Gate 1 — TypeScript

```bash
pnpm typecheck
```

**What to look for:**
- No errors on `<FinancialOutcomeBadge outcome={appointment.financialOutcome} />` — confirms the badge prop type aligns with the query's inferred type
- No new errors introduced anywhere else

**If TypeScript errors on the badge prop:** The `outcome` prop union doesn't cover all enum values. Check the schema's `financialOutcome` enum definition (`src/lib/schema.ts`) and add any missing values to the badge's type and styles map.

### Gate 2 — Lint

```bash
pnpm lint
```

**What to look for:** 0 warnings, 0 errors. No unused variable warnings (the component is used in step 2).

### Gate 3 — Manual Code Checklist

Read through the modified file and verify each item:

**Badge:**
- [ ] `FinancialOutcomeBadge` is defined and exported as a named function at bottom of file
- [ ] All 5 outcomes have an entry in the styles map: `settled`, `voided`, `unresolved`, `refunded`, `disputed`
- [ ] `disputed` has `fontWeight: 600` and is visually distinct from `voided` by weight alone
- [ ] `outcome` column in appointments table uses `<FinancialOutcomeBadge>` not `<span className="capitalize">`

**Cards (border removal):**
- [ ] Settled card: no `border` in style prop
- [ ] Voided card: no `border` in style prop
- [ ] Unresolved card: no `border` in style prop
- [ ] All 3 retain `background: "var(--color-surface-raised)"`

**Table wrappers (border removal):**
- [ ] Appointments table wrapper: no `border` in style prop, has `background: "var(--color-surface-raised)"`
- [ ] Slot Recovery table wrapper: no `border` in style prop, has `background: "var(--color-surface-raised)"`

**Table rows (hairline removal):**
- [ ] Appointments `<tr>`: no `style={{ borderTop: ... }}`, has hover className
- [ ] Slot Openings `<tr>`: no `style={{ borderTop: ... }}`, has hover className

### Gate 4 — Full Lint + Typecheck Together

```bash
pnpm lint && pnpm typecheck
```

Both must exit 0. This is the shipping gate for V1.

---

## What Is NOT Changing in V1

| Item | Why not touched |
|------|-----------------|
| `NoShowRiskBadge` | Existing, correct |
| `SlotStatusBadge` | Existing, correct — serves as the template |
| `ConflictAlertBanner` | Untouched |
| `ReconcilePaymentsButton` | Untouched |
| All 5 data queries | Untouched — no logic changes in V1 |
| Section structure (`<h2>`, tonal container) | V2's job |
| Empty states | V2's job |
| `PaymentStatusBadge` | V3's job |

---

## Sufficient Conditions Checklist (R × V1)

- [ ] `pnpm lint` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] `financialOutcome` column renders `FinancialOutcomeBadge`, not plain text
- [ ] All 5 outcome states have distinct visual rendering (confirmed by reading styles map)
- [ ] `disputed` has `fontWeight: 600` (heavier than `voided`)
- [ ] Zero `border: "1px solid..."` style props remain on cards or table wrappers
- [ ] Zero `borderTop` style props remain on any `<tr>` in the file
- [ ] Both table wrappers have `background: "var(--color-surface-raised)"` set
- [ ] R1 satisfied: outcome badge hierarchy present
- [ ] R2 satisfied: all 1px solid borders removed
- [ ] R7 satisfied: no other files modified, all queries preserved
