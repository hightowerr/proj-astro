# V1: Time Slot Grid Restyle

**Shape:** [Time Slot Grid Reskin](./time-slot-grid-shape.md), Shape A
**Status:** Complete
**Spec:** `05-time-slot-grid.html`

---

## Goal

Restyle the time slot grid section in `booking-form.tsx` (lines ~1156-1202) from Deep Ledger `--color-*` tokens to Atelier Light `--al-*` tokens, matching the feature spec.

## File to Change

| File | Action | What changes |
|------|--------|-------------|
| `src/components/booking/booking-form.tsx` | Modify | Restyle slot grid section (~lines 1156-1202) |

## Implementation Details

### Current code (lines 1156-1202)

```tsx
<fieldset className="space-y-3">
  <div className="space-y-1">
    <legend className="text-sm font-semibold">Available slots</legend>
    <p className="text-sm opacity-90">
      {availabilityDurationMinutes} minutes - {timezone}
    </p>
  </div>
  {loading ? (
    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Loading slots…</p>
  ) : availabilityError ? (
    <p className="text-sm" style={{ color: "var(--color-error)" }}>{availabilityError}</p>
  ) : slots.length === 0 ? (
    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
      No slots available for this day.
    </p>
  ) : (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {slots.map((slot) => {
        const label = timeFormatter.format(new Date(slot.startsAt));
        const selected = selectedSlot === slot.startsAt;
        return (
          <button
            key={slot.startsAt}
            type="button"
            onClick={() => setSelectedSlot(slot.startsAt)}
            data-slot={slot.startsAt}
            data-booking-slot={slot.startsAt}
            aria-pressed={selected}
            style={{
              height: "2.75rem",
              borderRadius: "var(--radius-lg)",
              fontSize: "0.875rem",
              fontWeight: 600,
              border: selected ? "none" : "1px solid var(--color-border-default)",
              background: selected ? "var(--color-brand)" : "var(--color-surface-overlay)",
              color: selected ? "var(--color-surface-void)" : "var(--color-text-secondary)",
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  )}
</fieldset>
```

### Replacement

```tsx
<fieldset>
  <div style={{ marginBottom: '12px' }}>
    <legend style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      fontSize: '13px', fontWeight: 800, color: 'var(--al-primary)',
      marginBottom: '4px',
    }}>
      Available slots
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: 'var(--al-primary)', display: 'inline-block',
      }} />
    </legend>
    <p style={{ fontSize: '13px', color: 'var(--al-on-surface-variant)' }}>
      {availabilityDurationMinutes} minutes {'\u00b7'} {timezone}
    </p>
  </div>
  {loading ? (
    <p style={{ fontSize: '13px', color: 'var(--al-on-surface-variant)' }}>Loading slots…</p>
  ) : availabilityError ? (
    <p style={{ fontSize: '13px', color: 'var(--al-error)' }}>{availabilityError}</p>
  ) : slots.length === 0 ? (
    <p style={{ fontSize: '13px', color: 'var(--al-on-surface-variant)' }}>
      No slots available for this day.
    </p>
  ) : (
    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '10px' }}>
      {slots.map((slot) => {
        const label = timeFormatter.format(new Date(slot.startsAt));
        const selected = selectedSlot === slot.startsAt;
        return (
          <button
            key={slot.startsAt}
            type="button"
            onClick={() => setSelectedSlot(slot.startsAt)}
            data-slot={slot.startsAt}
            data-booking-slot={slot.startsAt}
            aria-pressed={selected}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: selected ? 700 : 600,
              fontVariantNumeric: 'tabular-nums',
              color: selected ? 'var(--al-on-primary)' : 'var(--al-on-surface-variant)',
              background: selected ? 'var(--al-primary)' : 'var(--al-surface-container-lowest)',
              border: `1px solid ${selected ? 'var(--al-primary)' : 'rgba(195,198,209,0.50)'}`,
              borderRadius: '12px',
              padding: '12px 20px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: selected ? '0 0 0 4px rgba(0,30,64,0.08)' : 'none',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  )}
</fieldset>
```

### Key changes summarized

| Element | Before | After |
|---------|--------|-------|
| `<fieldset>` | `className="space-y-3"` | No className — spacing via inline `marginBottom` |
| `<legend>` | `className="text-sm font-semibold"` | Inline: 13px/800/navy + required dot |
| Meta line | Tailwind `text-sm opacity-90`, dash separator | Inline: 13px/`--al-on-surface-variant`, middle dot `·` |
| Grid container | `grid grid-cols-2 gap-3 sm:grid-cols-3` | `display: flex, flexWrap: wrap, gap: 10px` |
| Button font | System font, 0.875rem | `var(--font-mono)` (Fira Code), 13px, `tabular-nums` |
| Button default | `--color-surface-overlay` bg, `--color-border-default` border | `--al-surface-container-lowest` (white) bg, `rgba(195,198,209,0.50)` border |
| Button selected | `--color-brand` (teal) bg, no border | `--al-primary` (navy) bg, navy border, ring shadow |
| Button padding | `height: 2.75rem` (fixed height) | `padding: 12px 20px` (content-driven) |
| Loading/empty text | `--color-text-secondary` | `--al-on-surface-variant` |
| Error text | `--color-error` | `--al-error` |

### Tokens NOT in globals.css (use inline values)

- `--al-hairline-strong` → `rgba(195,198,209,0.50)` (inline)
- `--al-shadow-ring` → `0 0 0 4px rgba(0,30,64,0.08)` (inline)
- `--al-font-mono` → `var(--font-mono)` which resolves to Fira Code (loaded globally)

### Hover state

The spec includes a hover state (`#eeeeec` bg, lighter border). Since `booking-form.tsx` uses inline styles (no CSS classes), hover must be implemented via JS state. However, the existing slot buttons have NO hover effect — adding one is a functional addition. **Skip hover for now** to stay consistent with the "design change only" constraint and the pattern established by V1-V3 (no hover states added). If needed, it can be added as a follow-up.

### Preserved attributes

These must remain unchanged on each `<button>`:
- `key={slot.startsAt}`
- `type="button"`
- `onClick={() => setSelectedSlot(slot.startsAt)}`
- `data-slot={slot.startsAt}`
- `data-booking-slot={slot.startsAt}`
- `aria-pressed={selected}`

---

## Self-testing

1. **Visual check — slots render:** Navigate to `/book/kicksnare`. Confirm:
   - "Available slots" label in 13px/800 navy with 6px navy dot
   - Meta line "[duration] · [timezone]" in 13px muted (middle dot, not dash)
   - Slot buttons wrap in a flex row with 10px gap
   - Unselected slots: white bg, gray border, monospace font, muted text
   - Click a slot — it turns navy with white text and a subtle ring shadow

2. **Visual check — selected state:** Click 10:00 AM, then click 2:00 PM. Confirm:
   - Only one slot is selected at a time
   - Previously selected slot reverts to default styling
   - Newly selected slot gets navy bg + white text + ring shadow

3. **Date change reloads slots:** Change the date. Confirm:
   - Slots clear and "Loading slots…" shows in muted text (not old `--color-text-secondary`)
   - New slots appear after loading

4. **Empty state:** Pick a date with no availability (e.g., far future or past). Confirm:
   - "No slots available for this day." renders in `--al-on-surface-variant` (muted), not old tokens

5. **Token audit:** Inspect slot section elements. Confirm:
   - Zero `--color-*` tokens in the fieldset/legend/meta/button/loading/empty/error elements
   - Buttons use `var(--font-mono)` font family

6. **E2E non-regression:**
   ```bash
   grep -r "data-booking-slot\|data-slot" tests/e2e/ --include="*.ts" -l
   ```
   Then run any booking-related E2E tests:
   ```bash
   pnpm exec playwright test --grep "book" --reporter=list
   ```

7. **TypeScript check:**
   ```bash
   pnpm tsc --noEmit 2>&1 | head -20
   ```
