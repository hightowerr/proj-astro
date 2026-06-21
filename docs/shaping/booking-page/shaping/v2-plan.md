# V2: Page Header + Service Card

**Slice of:** [Booking Page Reskin](./booking-page-reskin-slices.md)
**Status:** Complete
**Depends on:** V1 (layout must be in place for correct page background)
**Specs:** `02-page-header.html`, `03-service-card.html`

---

## Goal

Restyle the page header (in `page.tsx`) and service card (in `booking-form.tsx`) to match Atelier Light specs.

## Files to Change

| File | Action | What changes |
|------|--------|-------------|
| `src/app/book/[slug]/page.tsx` | Modify | Restyle page header: add eyebrow, update heading/subtitle typography and tokens |
| `src/components/booking/booking-form.tsx` | Modify | Restyle service card section: new card styling, add green "Selected" badge |

## Implementation Details

### 1. Page header (`page.tsx`)

The page currently renders this header in three places (single service via `?service=`, single active service, multi-service):

```tsx
// Current (repeated 3x with slight variations)
<div className="space-y-2">
  <h1 className="text-3xl font-semibold">Book with {shop.name}</h1>
  <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{eventType.name}</p>
</div>
```

Replace with AL-styled header. Apply consistently in all three render paths:

```tsx
<div style={{ padding: '48px 64px 0' }}>
  <div style={{
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'var(--al-on-surface-variant)',
    opacity: 0.55,
    marginBottom: '12px',
  }}>
    Book an appointment
  </div>
  <h1 style={{
    fontSize: '32px',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    color: 'var(--al-primary)',
    marginBottom: '8px',
  }}>
    Book with {shop.name}
  </h1>
  <p style={{
    fontSize: '16px',
    fontWeight: 400,
    color: 'var(--al-on-surface-variant)',
  }}>
    {eventType.name} &middot; {eventType.durationMinutes} minutes
  </p>
</div>
```

**Notes:**
- The spec shows `padding: 48px 64px` for the content area. This applies to the header section.
- The subtitle format is "[Service] · [Duration]" — use `\u00b7` (middle dot) as separator.
- For the multi-service view (no service selected yet), show only eyebrow + heading. Subtitle shows "Pick a service, then choose a time that works for you."
- For the zero-services empty state, show eyebrow + heading only.

### 2. Service card (`booking-form.tsx`)

The service card is currently at ~lines 1068-1085 in `booking-form.tsx`:

```tsx
// Current
<div className="p-4" style={{ borderRadius: "var(--radius-2xl)", border: "1px solid var(--color-border-default)", background: "var(--color-brand-subtle)" }}>
  <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: "var(--color-text-tertiary)" }}>
    Selected service
  </p>
  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
    <div className="space-y-1">
      <h2 className="text-lg font-semibold">{selectedEventTypeName}</h2>
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {effectiveDurationMinutes} minutes - {timezone}
      </p>
    </div>
    <p className="text-sm font-medium text-foreground">
      {selectedEventTypeId ? "Selected service" : "Default service"}
    </p>
  </div>
</div>
```

Replace with AL-styled card:

```tsx
<div style={{
  background: 'var(--al-surface-container-low)',  // #f4f4f2
  borderRadius: '16px',
  padding: '20px 24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}}>
  <div>
    <div style={{
      fontSize: '10px',
      fontWeight: 800,
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color: 'var(--al-on-surface-variant)',
      opacity: 0.55,
      marginBottom: '6px',
    }}>
      Selected service
    </div>
    <div style={{
      fontSize: '16px',
      fontWeight: 700,
      color: 'var(--al-primary)',
      marginBottom: '4px',
    }}>
      {selectedEventTypeName}
    </div>
    <div style={{
      fontSize: '13px',
      color: 'var(--al-on-surface-variant)',
    }}>
      {effectiveDurationMinutes} minutes &middot; {timezone}
    </div>
  </div>
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'var(--al-status-positive)',         // #0e7a55
    background: 'var(--al-status-positive-bg)', // rgba(14,122,85,0.10)
    padding: '6px 14px',
    borderRadius: '9999px',
  }}>
    <span style={{
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      background: 'var(--al-status-positive)',
    }} />
    Selected
  </div>
</div>
```

**Token check:** Verify `--al-status-positive` and `--al-status-positive-bg` exist in `globals.css`. If not, use inline values: `#0e7a55` and `rgba(14,122,85,0.10)`.

**Note:** When only one service exists, the card is pre-selected and non-interactive (per spec). This matches the current behavior — no change needed.

---

## Self-testing

1. **Visual check — single service:** Navigate to `/book/[slug]` where the shop has one active service. Confirm:
   - Eyebrow "Book an appointment" in 11px uppercase, muted
   - Heading "Book with [shop name]" in 32px/800 navy
   - Subtitle "[Service] · [Duration] minutes" in 16px muted
   - Service card: `#f4f4f2` bg, rounded, eyebrow "Selected service", service name in navy, meta line "[duration] · [timezone]", green "Selected" pill badge on right

2. **Visual check — multi-service:** Navigate to `/book/[slug]` where the shop has multiple services. After selecting one via `ServiceSelector`, confirm the same header and card appear.

3. **Visual check — via ?service= param:** Navigate to `/book/[slug]?service=[uuid]`. Confirm header shows the correct service name and duration in subtitle.

4. **Visual check — empty state:** Navigate to `/book/[slug]` where shop has no services. Confirm eyebrow + heading render without subtitle.

5. **Token audit:** Inspect the rendered elements — confirm NO `--color-*` tokens remain in the page header or service card sections.

6. **Non-regression:** Submit a booking through the full flow. Confirm service card data (name, duration) matches what gets sent to the API.
