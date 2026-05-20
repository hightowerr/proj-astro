# Analysis Report — Final
**Job:** Appointments Page Implementation — `/app/appointments`
**Date:** 2026-04-22
**Mental Models Applied:** Bulletproof Problem Solving, Cognitive Load, Von Restorff Effect, Necessity & Sufficiency, Iterative Refinement, Aesthetic-Usability Effect

---

## Executive Summary

The Appointments page exists and its data layer is complete. The implementation spec is 60% satisfied. The remaining 40% is entirely in the **visual presentation layer** — badge hierarchy, design system compliance, section structure, and empty states. No database changes, no new API routes, and no query modifications are required.

The highest-leverage change is introducing `FinancialOutcomeBadge` (von Restorff: make bad outcomes visually distinct) and removing all 1px border violations (design system: No-Line Rule). These two changes deliver the majority of the spec's designer-focus items in minimal code.

---

## Finding 1: Financial Outcome Has No Badge Hierarchy [P0]

**Current state:** `financialOutcome` renders as `<span className="capitalize">settled</span>`. All outcomes (settled, voided, unresolved, refunded, disputed) are visually identical. A user cannot scan this column and instantly identify problematic records.

**Spec requirement:** *"Outcome badge hierarchy"* is explicitly listed as a designer focus.

**Mental model:** Von Restorff Effect — *"When everything is highlighted, nothing is."* The inverse is also true: when nothing is differentiated, the critical signals (voided, disputed) are lost in the noise.

**Recommended fix:**
```tsx
function FinancialOutcomeBadge({ outcome }: {
  outcome: "unresolved" | "settled" | "voided" | "refunded" | "disputed"
}) {
  const styles: Record<typeof outcome, React.CSSProperties> = {
    settled: {
      background: "var(--color-success-subtle)",
      color: "var(--color-success)",
    },
    voided: {
      background: "var(--color-error-subtle)",
      color: "var(--color-error)",
    },
    unresolved: {
      background: "var(--color-surface-overlay)",
      color: "var(--color-text-tertiary)",
    },
    refunded: {
      background: "var(--color-warning-subtle)",
      color: "var(--color-warning)",
    },
    disputed: {
      background: "var(--color-error-subtle)",
      color: "var(--color-error)",
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

**Hierarchy rationale:**
- `disputed` > `voided` in severity → both use error red, but `disputed` gets `fontWeight: 600` to isolate it further
- `settled` → success green (positive signal, quiet)
- `unresolved` → muted gray (no action yet, neutral)
- `refunded` → amber (action completed, informational)

---

## Finding 2: Design System Border Violations [P0]

**Current state:** Three categories of 1px border violations across the page:

| Location | Violation |
|---|---|
| Outcome cards | `border: "1px solid var(--color-border-default)"` |
| Table wrappers (both tables) | `border: "1px solid var(--color-border-default)"` |
| Table row separators | `borderTop: "1px solid var(--color-border-hairline)"` |

**DESIGN.md rule:** *"Standard 1px solid borders are strictly prohibited for sectioning. Boundaries are created through background shifts."* And: *"Strictly forbid horizontal divider lines."*

**Mental model:** Aesthetic-Usability Effect — these borders are the single element that makes the page feel like a generic admin template rather than the Atelier brand. Removing them and using tonal layering will shift the perceived quality of the entire page.

**Recommended fixes:**

**Cards** — Remove `border`, use `surface-container-lowest` (`#ffffff`) background on a `surface-container-low` (`#f4f4f2`) page. The white card on the warm gray page creates the lift without a line.
```tsx
// Before
style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-default)" }}

// After
style={{ background: "var(--color-surface-container-lowest)" }}
```

**Table wrappers** — Remove `border`, use ambient shadow:
```tsx
// After
style={{
  background: "var(--color-surface-container-lowest)",
  boxShadow: "0px 20px 40px rgba(26, 28, 27, 0.06)",
  borderRadius: "12px",
}}
```

**Table rows** — Remove `borderTop`. The existing `py-3` padding creates visual separation via whitespace alone, which is the design system's intended mechanism.
```tsx
// Before
<tr key={appointment.id} style={{ borderTop: "1px solid var(--color-border-hairline)" }}>

// After
<tr key={appointment.id}>
```
Optionally add hover state for interactive feedback:
```tsx
<tr key={appointment.id} className="transition-colors hover:bg-[var(--color-surface-container-low)]">
```

---

## Finding 3: Appointments Table Has No Section Header [P1]

**Current state:** The slot recovery section has:
```tsx
<section className="space-y-3">
  <div className="space-y-1">
    <h2 className="text-xl font-semibold">Slot Recovery</h2>
    <p className="text-sm...">Recently opened slots and their recovery progress.</p>
  </div>
```

The appointments table has no equivalent. It appears directly after the outcome cards with zero structural framing.

**Mental model:** Cognitive Load — users re-orient when page zones have no named boundaries. The absence of a section header on the main table is a scan-path break. Both sections need named zones for the two-table page to work coherently.

**Recommended fix:** Wrap the appointments table in a section with a matching header pattern:
```tsx
<section className="space-y-3">
  <div className="space-y-1">
    <h2 className="text-xl font-semibold">All Appointments</h2>
    <p className="text-sm text-[var(--color-text-secondary)]">
      Booked, pending, and recently ended appointments. Last 7 days + upcoming.
    </p>
  </div>
  {/* table or empty state */}
</section>
```

---

## Finding 4: Empty States Are Unstyled Plain Text [P1]

**Current state:**
```tsx
<p className="text-sm text-[var(--color-text-secondary)]">
  No recent or upcoming appointments. Share your booking link to get started.
</p>
```

**Spec requirement:** *"Empty states for each section"* is listed as a designer focus.

**Mental model:** Cognitive Load — an unstyled `<p>` tag gives the user no spatial anchor. Designed empty states with icons and structured copy reduce confusion about whether the page failed to load or genuinely has no data.

**Recommended fix pattern** (for both sections):
```tsx
// Appointments empty state
<div className="flex flex-col items-center gap-3 py-16 text-center">
  <div
    className="flex h-12 w-12 items-center justify-center rounded-full"
    style={{ background: "var(--color-surface-container-high)" }}
  >
    <CalendarIcon className="h-5 w-5" style={{ color: "var(--color-text-tertiary)" }} />
  </div>
  <div className="space-y-1">
    <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
      No appointments yet
    </p>
    <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
      Share your booking link to start receiving appointments.
    </p>
  </div>
</div>

// Slot Recovery empty state
<div className="flex flex-col items-center gap-3 py-12 text-center">
  <div
    className="flex h-12 w-12 items-center justify-center rounded-full"
    style={{ background: "var(--color-surface-container-high)" }}
  >
    <RefreshCwIcon className="h-5 w-5" style={{ color: "var(--color-text-tertiary)" }} />
  </div>
  <div className="space-y-1">
    <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
      No slots recovered yet
    </p>
    <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
      When a cancelled appointment slot is filled by another customer, it appears here.
    </p>
  </div>
</div>
```

---

## Finding 5: Two-Table Visual Separation Is Insufficient [P1]

**Current state:** Both sections share the same background. The only separation is `space-y-6`. The Slot Recovery section has a section header which helps, but the page doesn't use tonal shifts to reinforce the conceptual boundary between "transaction record" and "operational recovery log."

**Mental model:** Cognitive Load — two logically distinct datasets need spatial territory, not just vertical spacing.

**Recommended fix:** Wrap the Slot Recovery section in a tonal container:
```tsx
<section
  className="space-y-3 rounded-2xl p-6"
  style={{ background: "var(--color-surface-container-low)" }}
>
  {/* Slot Recovery header + table */}
</section>
```

This uses the design system's tonal layering correctly: the Slot Recovery section becomes a visually distinct "zone" sitting slightly inset from the main page background.

---

## Finding 6: Payment Status Has No Visual Treatment [P2]

**Current state:** `paymentStatus` renders as plain capitalized text. "failed" looks identical to "paid."

**Recommended fix:** Introduce a `PaymentStatusBadge` using the same badge pattern as `SlotStatusBadge`:

| Status | Color semantic |
|---|---|
| `paid` | success green |
| `pending` | brand blue |
| `unpaid` | muted gray |
| `failed` | error red |

This is P2 — the spec doesn't explicitly call it out as a designer focus, but it completes the column visual hierarchy implied by the financial outcome badge.

---

## What Does NOT Need Changing

| Component | Assessment |
|---|---|
| `NoShowRiskBadge` | Correct implementation, tooltips working |
| `SlotStatusBadge` | Correct, already uses semantic color |
| `ConflictAlertBanner` | Integration is correct |
| `ReconcilePaymentsButton` | Existing decision, keep |
| All data queries | Complete, no modifications needed |
| Slot recovery logic | `recoveredAppointmentId` join is correct |
| Status filter on appointments query | Excluding `cancelled` is intentional and correct |

---

## Implementation Sequence

Following **Iterative Refinement (Porpoising)** — surgical, smallest-change-first:

**Pass 1 (P0) — Badge + Border:**
1. Add `FinancialOutcomeBadge` component at bottom of `page.tsx`
2. Replace all `border: "1px solid..."` styles on cards and table wrappers
3. Remove `borderTop` from table rows

**Pass 2 (P1) — Structure:**
4. Add section header + description for Appointments table
5. Wrap Slot Recovery in tonal background container
6. Replace plain-text empty states with designed empty state components

**Pass 3 (P2) — Polish:**
7. Add `PaymentStatusBadge` component
8. Add hover state on table rows

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Removing borders breaks visual grouping | Low | Tonal background provides equivalent boundary |
| Empty state icon imports not available | Low | Lucide React is installed; Calendar and RefreshCw are standard |
| Color token mismatch | Low | All tokens used already exist in globals.css |
| `disputed` / `refunded` states missing from query | None | `getOutcomeSummaryForShop` already handles all 5 outcomes |

---

## Conclusion

The Appointments page is feature-complete at the data layer. The implementation gap is a presentation layer deficit — specifically: no outcome badge hierarchy, 1px border violations against the design system, missing section structure for the main table, and unstyled empty states. All fixes are contained within `page.tsx` via new inline components and style adjustments. Estimated scope: 60–80 lines of targeted changes. No schema, query, or API changes required.
