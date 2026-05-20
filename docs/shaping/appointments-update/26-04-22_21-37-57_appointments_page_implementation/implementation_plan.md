# Implementation Plan
**Job:** Appointments Page — Close Presentation Layer Gaps
**File to edit:** `src/app/app/appointments/page.tsx`
**Date:** 2026-04-22

---

## Scope

All changes are in one file: `src/app/app/appointments/page.tsx`.
No new files. No query changes. No schema changes.

---

## Pass 1 — P0: Badge Hierarchy + Border Compliance

### Step 1.1 — Add FinancialOutcomeBadge component
Add at the bottom of page.tsx alongside `SlotStatusBadge`:

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

### Step 1.2 — Add PaymentStatusBadge component
```tsx
function PaymentStatusBadge({
  status,
}: {
  status: "unpaid" | "pending" | "paid" | "failed";
}) {
  const styles: Record<typeof status, React.CSSProperties> = {
    paid: {
      background: "var(--color-success-subtle)",
      color: "var(--color-success)",
    },
    pending: {
      background: "var(--color-brand-subtle)",
      color: "var(--color-brand)",
    },
    unpaid: {
      background: "var(--color-surface-overlay)",
      color: "var(--color-text-tertiary)",
    },
    failed: {
      background: "var(--color-error-subtle)",
      color: "var(--color-error)",
    },
  };
  return (
    <span
      className="inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize"
      style={styles[status]}
    >
      {status}
    </span>
  );
}
```

### Step 1.3 — Replace outcome column render with FinancialOutcomeBadge
Change:
```tsx
<td className="px-4 py-3">
  <span className="capitalize">
    {appointment.financialOutcome}
  </span>
</td>
```
To:
```tsx
<td className="px-4 py-3">
  <FinancialOutcomeBadge outcome={appointment.financialOutcome} />
</td>
```

### Step 1.4 — Replace payment status render with PaymentStatusBadge
Change:
```tsx
<div className="font-medium capitalize">
  {appointment.paymentStatus}
</div>
```
To:
```tsx
<PaymentStatusBadge status={appointment.paymentStatus} />
```

### Step 1.5 — Fix outcome card borders
Change all three outcome cards from:
```tsx
style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border-default)" }}
```
To:
```tsx
style={{ background: "var(--color-surface-container-lowest)" }}
```

### Step 1.6 — Fix table wrapper borders
Change both table `overflow-hidden` divs from:
```tsx
<div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--color-border-default)" }}>
```
To:
```tsx
<div
  className="overflow-hidden rounded-xl"
  style={{
    background: "var(--color-surface-container-lowest)",
    boxShadow: "0px 20px 40px rgba(26, 28, 27, 0.06)",
  }}
>
```

### Step 1.7 — Remove table row hairline borders
Change:
```tsx
<tr key={appointment.id} style={{ borderTop: "1px solid var(--color-border-hairline)" }}>
```
To:
```tsx
<tr
  key={appointment.id}
  className="transition-colors hover:bg-[var(--color-surface-container-low)]"
>
```
Apply same change to slot openings rows.

---

## Pass 2 — P1: Section Structure + Empty States

### Step 2.1 — Wrap appointments table in named section
Wrap the appointments table block in:
```tsx
<section className="space-y-3">
  <div className="space-y-1">
    <h2 className="text-xl font-semibold">All Appointments</h2>
    <p className="text-sm text-[var(--color-text-secondary)]">
      Booked, pending, and recently ended. Last 7 days and upcoming.
    </p>
  </div>
  {/* empty state or table */}
</section>
```

### Step 2.2 — Replace appointments empty state
Change:
```tsx
<p className="text-sm text-[var(--color-text-secondary)]">
  No recent or upcoming appointments. Share your booking link to get started.
</p>
```
To:
```tsx
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
    <p className="text-xs max-w-xs" style={{ color: "var(--color-text-secondary)" }}>
      Share your booking link to start receiving appointments.
    </p>
  </div>
</div>
```
Add `import { Calendar as CalendarIcon, RefreshCw as RefreshCwIcon } from "lucide-react"` to imports.

### Step 2.3 — Replace slot recovery empty state
Change:
```tsx
<p className="text-sm text-[var(--color-text-secondary)]">No slot openings yet.</p>
```
To:
```tsx
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
    <p className="text-xs max-w-xs" style={{ color: "var(--color-text-secondary)" }}>
      When a cancelled appointment slot is filled by another customer, it appears here.
    </p>
  </div>
</div>
```

### Step 2.4 — Add tonal background to Slot Recovery section
Change the Slot Recovery `<section>` from:
```tsx
<section className="space-y-3">
```
To:
```tsx
<section
  className="space-y-3 rounded-2xl p-6"
  style={{ background: "var(--color-surface-container-low)" }}
>
```

---

## Checklist

- [ ] `FinancialOutcomeBadge` component added
- [ ] `PaymentStatusBadge` component added
- [ ] `financialOutcome` column uses `FinancialOutcomeBadge`
- [ ] `paymentStatus` uses `PaymentStatusBadge`
- [ ] All 3 outcome card borders removed → tonal background
- [ ] Both table wrapper borders removed → ambient shadow
- [ ] All row `borderTop` hairlines removed → hover bg
- [ ] Appointments section has `<h2>All Appointments</h2>` + description
- [ ] Appointments empty state is designed (icon + copy)
- [ ] Slot Recovery empty state is designed (icon + copy)
- [ ] Slot Recovery section has tonal background container
- [ ] Lucide imports updated (Calendar, RefreshCw)
- [ ] `pnpm lint && pnpm typecheck` passes

---

## Estimated Change Size
~80–100 lines net change in `page.tsx` (additions + removals).
No other files touched.
