# V2 Implementation Plan — Section Structure + Empty States

**Slice:** V2: Section Structure + Empty States  
**Appetite:** ~1–2 hours  
**Prerequisite:** V1 complete (`pnpm lint && pnpm typecheck` passing)  
**File changed:** `src/app/app/appointments/page.tsx` (one file only)  
**Tests:** No new unit tests — all changes are structural JSX. Gates are `pnpm lint && pnpm typecheck` + empty-state verification technique described below.

---

## Dark-Theme Token Decisions (Pre-flight)

V1 established the page uses the dark `--color-*` token system. V2 must follow the same system for the Slot Recovery tonal container.

The slices doc specified `surface-container-low` (a light `--al-*` token). The correct dark-theme equivalent is:

| Intent | Wrong (light theme) | Correct (dark theme) |
|--------|---------------------|----------------------|
| Section enclosure background | `--al-surface-container-low` (#f4f4f2) | `--color-surface-overlay` (#1d2738) |
| Icon container in empty state | `--al-surface-container-high` (#e8e8e6) | `--color-surface-elevated` (#253044) |
| Icon color | `--color-text-tertiary` same | `--color-text-tertiary` (#485f74) |

**Visual result:** Slot Recovery section renders as a slightly lighter zone (`overlay` = #1d2738) on the dark page background, with the table inside at `surface-raised` (#161e2c — one step darker, a subtle inset effect). This achieves the required visual separation without fighting the dark theme.

---

## Change Order

```
1. Add Lucide imports (Calendar, RefreshCw)
2. Wrap appointments block in <section> with h2 + description
3. Replace appointments empty state <p> with designed component
4. Add tonal wrapper to Slot Recovery <section>
5. Replace slot recovery empty state <p> with designed component
```

---

## Step 1 — Add Lucide Imports

The page currently has no Lucide imports. `customer-history-card.tsx` confirms the import pattern for this codebase.

Add to the top of `page.tsx` with the other imports:

```tsx
import { Calendar, RefreshCw } from "lucide-react";
```

Both `Calendar` and `RefreshCw` are standard Lucide React exports. No aliasing needed — these names don't conflict with anything in `page.tsx`.

---

## Step 2 — Wrap Appointments Block in Named Section

**Current structure (lines ~92–179):**

```tsx
{appointments.length === 0 ? (
  <p className="text-sm text-[var(--color-text-secondary)]">
    No recent or upcoming appointments. Share your booking link to get started.
  </p>
) : (
  <div className="overflow-hidden rounded-xl" ...>
    <table ...>
      ...
    </table>
  </div>
)}
```

This block floats directly after the outcome cards with no structural wrapper or label.

**Replace with:**

```tsx
<section className="space-y-3">
  <div className="space-y-1">
    <h2 className="text-xl font-semibold">All Appointments</h2>
    <p className="text-sm text-[var(--color-text-secondary)]">
      Booked, pending, and recently ended. Last 7 days and upcoming.
    </p>
  </div>

  {appointments.length === 0 ? (
    /* Step 3 — empty state goes here */
  ) : (
    <div className="overflow-hidden rounded-xl" style={{ background: "var(--color-surface-raised)" }}>
      <table className="w-full text-sm">
        {/* thead and tbody unchanged */}
      </table>
    </div>
  )}
</section>
```

**Note:** The table wrapper's style comes from V1 (`background: var(--color-surface-raised)`, no border). Do not re-introduce a border here. The `<section>` wrapper and spacing match the existing Slot Recovery section pattern exactly (same `space-y-3`, same `space-y-1` inner header block).

---

## Step 3 — Appointments Empty State

Inside the section from Step 2, replace the bare `<p>` empty state with:

```tsx
<div className="flex flex-col items-center gap-3 py-16 text-center">
  <div
    className="flex h-12 w-12 items-center justify-center rounded-full"
    style={{ background: "var(--color-surface-elevated)" }}
  >
    <Calendar
      className="h-5 w-5"
      style={{ color: "var(--color-text-tertiary)" }}
    />
  </div>
  <div className="space-y-1">
    <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
      No appointments yet
    </p>
    <p className="max-w-xs text-xs" style={{ color: "var(--color-text-secondary)" }}>
      Share your booking link to start receiving appointments.
    </p>
  </div>
</div>
```

**Token rationale:**
- `--color-surface-elevated` (#253044) — icon sits in a raised circle, visible against the page background but not jarring
- `--color-text-tertiary` (#485f74) — muted icon, not competing with content
- `--color-text-primary` (#edf2f7) — heading is the main read, near-white
- `--color-text-secondary` (#8aa2bc) — sub-copy is softer

---

## Step 4 — Add Tonal Wrapper to Slot Recovery Section

**Current structure (line 181):**

```tsx
<section className="space-y-3">
  <div className="space-y-1">
    <h2 className="text-xl font-semibold">Slot Recovery</h2>
    ...
  </div>
  ...
</section>
```

**Replace the opening `<section>` tag only:**

```tsx
<section
  className="space-y-3 rounded-xl p-5"
  style={{ background: "var(--color-surface-overlay)" }}
>
```

Everything inside — the `<div className="space-y-1">` header block, the empty state conditional, and the table — stays exactly as-is from V1. Only the `<section>` opening tag changes.

**Visual result:** The Slot Recovery section becomes a visually enclosed zone (`overlay` = #1d2738 — slightly lighter than the page's base surface). The table wrapper inside retains `background: var(--color-surface-raised)` from V1, creating a subtle inset ("well") effect — the table sits slightly darker within the lighter section. This is a standard dark-UI layering pattern.

**Why not a different approach:** A left-border accent or a simple divider line would work but doesn't give the section its own spatial territory. The background enclosure makes it unambiguous that Slot Recovery is a distinct operational view, not a continuation of the transaction table above it.

---

## Step 5 — Slot Recovery Empty State

**Current empty state (line 190):**

```tsx
<p className="text-sm text-[var(--color-text-secondary)]">No slot openings yet.</p>
```

**Replace with:**

```tsx
<div className="flex flex-col items-center gap-3 py-12 text-center">
  <div
    className="flex h-12 w-12 items-center justify-center rounded-full"
    style={{ background: "var(--color-surface-elevated)" }}
  >
    <RefreshCw
      className="h-5 w-5"
      style={{ color: "var(--color-text-tertiary)" }}
    />
  </div>
  <div className="space-y-1">
    <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
      No slots recovered yet
    </p>
    <p className="max-w-xs text-xs" style={{ color: "var(--color-text-secondary)" }}>
      When a cancelled appointment slot is filled by another customer, it appears here.
    </p>
  </div>
</div>
```

**Why `py-12` not `py-16`:** The Slot Recovery section is inside a padded container (`p-5` from Step 4). Less outer padding needed — the container already gives it breathing room. The Appointments empty state has no outer container so uses `py-16` for breathing room.

**Copy rationale:** "No slot openings yet" (current) gives no context — the owner may not know what slot recovery is. The new copy explains the mechanic in one sentence so the empty state is self-documenting.

---

## Verification Sequence

### Gate 1 — TypeScript

```bash
pnpm typecheck
```

**What to look for:**
- No errors on `Calendar` or `RefreshCw` imports — confirms Lucide exports both names
- No JSX errors on the new structural elements (no props required on `<section>` or `<div>`)
- No regressions from V1

### Gate 2 — Lint

```bash
pnpm lint
```

**What to look for:**
- `Calendar` and `RefreshCw` are used (Steps 3 and 5) — no unused-import warnings
- 0 warnings, 0 errors

### Gate 3 — Empty State Verification (Force-Render Technique)

Empty states only render when `appointments.length === 0` or `slotOpenings.length === 0`. In a live environment these conditions are unlikely. Verify them without the dev server by temporarily forcing the condition:

**Appointments empty state:**

In `page.tsx`, temporarily change:
```tsx
{appointments.length === 0 ? (
```
to:
```tsx
{true ? (
```

Then run `pnpm typecheck` — it should still pass. Read the empty state JSX manually and verify:
- `<Calendar>` icon renders inside a `rounded-full` container
- Heading says "No appointments yet"
- Sub-copy mentions booking link
- The whole block is within the `<section>` with the `h2`

**Revert immediately** (`appointments.length === 0` back). Repeat for Slot Recovery empty state with `slotOpenings.length === 0` → `true`.

> This technique lets you verify the component tree is structurally correct without running the dev server. TypeScript will catch any prop/type errors in the forced path.

### Gate 4 — Manual Code Checklist

Read through the modified file and verify each item:

**Imports:**
- [ ] `import { Calendar, RefreshCw } from "lucide-react"` present at top of file

**Appointments section:**
- [ ] Outer `<section className="space-y-3">` wraps both the header and the conditional
- [ ] `<h2 className="text-xl font-semibold">All Appointments</h2>` present
- [ ] Description `<p>` present with `color-text-secondary`
- [ ] Empty state: `<Calendar>` icon inside `rounded-full` + `surface-elevated` bg
- [ ] Empty state heading: "No appointments yet"
- [ ] Empty state copy: mentions "booking link"
- [ ] Table path unchanged from V1 (no border reintroduced, background stays `surface-raised`)

**Slot Recovery section:**
- [ ] `<section>` opening tag has `rounded-xl p-5` classNames
- [ ] `<section>` opening tag has `style={{ background: "var(--color-surface-overlay)" }}`
- [ ] Section header (`h2` "Slot Recovery" + description) unchanged
- [ ] Empty state: `<RefreshCw>` icon inside `rounded-full` + `surface-elevated` bg
- [ ] Empty state heading: "No slots recovered yet"
- [ ] Empty state copy: explains the slot recovery mechanic
- [ ] Table path unchanged from V1 (no border, background stays `surface-raised`)

### Gate 5 — Combined Pass

```bash
pnpm lint && pnpm typecheck
```

Both must exit 0. This is the shipping gate for V2.

---

## What Is NOT Changing in V2

| Item | Why not touched |
|------|-----------------|
| `FinancialOutcomeBadge` | V1's work, do not modify |
| `SlotStatusBadge` | Existing, correct |
| `NoShowRiskBadge` | Existing, correct |
| All `<thead>` backgrounds | Already correct (`surface-overlay`) from before V1 |
| All table row hover states | V1's work, do not modify |
| All 5 data queries | Untouched |
| `ConflictAlertBanner` | Untouched |
| `ReconcilePaymentsButton` | Untouched |
| Outcome cards | V1's work, do not modify |
| `PaymentStatusBadge` | V3's job |

---

## Sufficient Conditions Checklist (R × V2)

- [ ] `pnpm lint` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] `<h2>All Appointments</h2>` present above the appointments table
- [ ] Appointments section has a description line
- [ ] Appointments empty state has an icon, heading, and copy (not a bare `<p>`)
- [ ] Slot Recovery `<section>` has `background: var(--color-surface-overlay)` and `rounded-xl p-5`
- [ ] Slot Recovery empty state has an icon, heading, and copy (not a bare `<p>`)
- [ ] Force-render technique confirmed both empty states render without TypeScript errors
- [ ] No borders reintroduced anywhere (V1's compliance preserved)
- [ ] R3 satisfied: Appointments table has named section header
- [ ] R4 satisfied: Slot Recovery enclosed in tonal background container
- [ ] R5 satisfied: both sections have designed empty states
- [ ] R7 satisfied: no other files modified, all queries preserved
