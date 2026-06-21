# V3: Date Picker + Communication Preferences

**Slice of:** [Booking Page Reskin](./booking-page-reskin-slices.md)
**Status:** Complete
**Depends on:** V2 (sequential to avoid merge conflicts in `booking-form.tsx`)
**Specs:** `04-date-picker.html`, `07-communication-preferences.html`

---

## Goal

Restyle the date picker field and communication preferences (SMS + email checkboxes) in `booking-form.tsx` to match Atelier Light specs.

## Files to Change

| File | Action | What changes |
|------|--------|-------------|
| `src/components/booking/booking-form.tsx` | Modify | Restyle date input section (~lines 1093-1102) and comm prefs section (~lines 1191-1221) |

## Implementation Details

### 1. Date picker (~lines 1093-1102)

**Current:**
```tsx
<div className="space-y-2.5">
  <Label htmlFor="booking-date" className="text-sm font-semibold">Date</Label>
  <Input
    id="booking-date"
    type="date"
    value={date}
    onChange={(event) => setDate(event.target.value)}
    required
  />
</div>
```

**Replace with:**

```tsx
<div style={{ marginBottom: '24px' }}>
  {/* Label with required dot */}
  <label
    htmlFor="booking-date"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '13px',
      fontWeight: 800,
      color: 'var(--al-primary)',
      marginBottom: '8px',
    }}
  >
    Date
    <span style={{
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      background: 'var(--al-primary)',
      display: 'inline-block',
    }} />
  </label>

  {/* Input wrap */}
  <div style={{
    position: 'relative',
    background: 'var(--al-surface-container-lowest)',
    border: '1px solid rgba(195,198,209,0.50)',
    borderRadius: '12px',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  }}>
    <input
      id="booking-date"
      type="date"
      value={date}
      onChange={(event) => setDate(event.target.value)}
      required
      style={{
        fontFamily: 'var(--font-manrope-raw)',
        fontSize: '16px',
        fontWeight: 700,
        color: 'var(--al-primary)',
        border: 'none',
        outline: 'none',
        background: 'transparent',
        width: '100%',
      }}
    />
    {/* Calendar icon */}
    <span
      className="material-symbols-outlined"
      style={{
        color: 'var(--al-outline)',
        fontSize: '20px',
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      calendar_today
    </span>
  </div>
</div>
```

**Focus state:** The spec calls for `border-color: var(--al-primary)` + `box-shadow: 0 0 0 3px rgba(0,30,64,0.12)` on focus-within. This can be handled via:
- A CSS class in globals.css for `.booking-date-wrap:focus-within`, OR
- An inline `onFocus`/`onBlur` state toggle (simpler, consistent with the codebase pattern of JS-driven states)

**Recommendation:** Use a simple `useState` for focus state to stay consistent with the codebase pattern (the existing code uses JS state for hover effects throughout). No new CSS classes needed.

### 2. Communication preferences (~lines 1191-1221)

**Current SMS checkbox (lines 1191-1202):**
```tsx
<div className="flex items-start gap-3">
  <input id="sms-opt-in" type="checkbox" className="mt-0.5 h-4 w-4 rounded ..." checked={smsOptIn} onChange={...} />
  <Label htmlFor="sms-opt-in" className="text-sm font-medium leading-5 cursor-pointer">
    Send me SMS updates about this booking.
  </Label>
</div>
```

**Replace SMS with:**
```tsx
<label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
  {/* Custom checkbox */}
  <span style={{
    width: '20px',
    height: '20px',
    border: smsOptIn ? '2px solid var(--al-primary)' : '2px solid rgba(195,198,209,0.50)',
    borderRadius: '6px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: smsOptIn ? 'var(--al-primary)' : 'var(--al-surface-container-lowest)',
    transition: 'all 0.15s ease',
  }}>
    {smsOptIn && (
      <span style={{ color: 'var(--al-on-primary)', fontSize: '14px', fontWeight: 700 }}>✓</span>
    )}
  </span>
  {/* Hidden native checkbox for form semantics + accessibility */}
  <input
    type="checkbox"
    checked={smsOptIn}
    onChange={(e) => setSmsOptIn(e.target.checked)}
    style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
    aria-label="Send me SMS updates about this booking"
  />
  <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--al-on-surface)' }}>
    Send me SMS updates about this booking.
  </span>
</label>
```

**Current email checkbox (lines 1204-1221):**
```tsx
<div className="flex items-start gap-3 p-4" style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border-subtle)", background: "var(--color-surface-overlay)" }}>
  <input id="email-opt-in" type="checkbox" className="mt-0.5 h-4 w-4 ..." checked={emailOptIn} onChange={...} />
  <div className="space-y-1.5">
    <Label htmlFor="email-opt-in" ...>Send me email reminders.</Label>
    <p ...>Get an email reminder about 24 hours before...</p>
  </div>
</div>
```

**Replace email with:**
```tsx
<label style={{
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
  padding: '16px 20px',
  background: 'var(--al-surface-container-low)',  // #f4f4f2
  borderRadius: '12px',
  cursor: 'pointer',
}}>
  {/* Custom checkbox */}
  <span style={{
    width: '20px',
    height: '20px',
    border: emailOptIn ? '2px solid var(--al-primary)' : '2px solid rgba(195,198,209,0.50)',
    borderRadius: '6px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: emailOptIn ? 'var(--al-primary)' : 'var(--al-surface-container-lowest)',
    transition: 'all 0.15s ease',
    marginTop: '2px',
  }}>
    {emailOptIn && (
      <span style={{ color: 'var(--al-on-primary)', fontSize: '14px', fontWeight: 700 }}>✓</span>
    )}
  </span>
  {/* Hidden native checkbox */}
  <input
    type="checkbox"
    checked={emailOptIn}
    onChange={(e) => setEmailOptIn(e.target.checked)}
    style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
    aria-label="Send me email reminders"
  />
  <div>
    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--al-on-surface)', marginBottom: '4px' }}>
      Send me email reminders.
    </div>
    <div style={{ fontSize: '13px', color: 'var(--al-on-surface-variant)', lineHeight: 1.5 }}>
      Get an email reminder about 24 hours before your appointment. You can opt out later.
    </div>
  </div>
</label>
```

**Accessibility note:** The native `<input type="checkbox">` is visually hidden but remains in the DOM for screen readers and keyboard navigation. The custom `<span>` is the visual representation. The `<label>` wrapping makes the entire row clickable.

### 3. Spacing between comm prefs

The spec calls for `12px` gap between the two preference items. Wrap both in a container:

```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
  {/* SMS checkbox */}
  {/* Email card checkbox */}
</div>
```

---

## Self-testing

1. **Date picker visual check:** Navigate to `/book/[slug]` and confirm:
   - "Date" label in 13px/800 navy with 6px navy dot to the right
   - Input wrap: white bg, gray border (`rgba(195,198,209,0.50)`), rounded 12px
   - Date value renders in 16px/700 navy
   - Calendar icon (Material Symbol) on the right in muted gray
   - Click into the field — confirm focus ring appears: navy border + `0 0 0 3px rgba(0,30,64,0.12)` shadow
   - Native browser date picker opens on click

2. **Date picker functional check:** Change the date — confirm:
   - Available slots update (availability fetch fires)
   - Previously selected slot clears
   - No console errors

3. **SMS checkbox visual check:** Confirm:
   - 20px square checkbox, unchecked by default
   - Gray border when unchecked, navy bg + border when checked
   - White checkmark appears when checked
   - Label: "Send me SMS updates about this booking." in 14px/500

4. **Email checkbox visual check:** Confirm:
   - Card layout: `#f4f4f2` bg, 12px radius, 16px/20px padding
   - Checkbox checked by default (navy bg, white checkmark)
   - Title: "Send me email reminders." in 14px/700
   - Description: "Get an email reminder about 24 hours before your appointment. You can opt out later." in 13px muted

5. **Checkbox interaction check:** Click each checkbox — confirm:
   - Visual state toggles (checked ↔ unchecked)
   - Clicking anywhere on the label/card toggles the checkbox
   - `smsOptIn` and `emailOptIn` values are sent correctly in form submission

6. **Token audit:** Inspect all restyled elements — confirm NO `--color-*` tokens remain in the date picker or comm prefs sections.

7. **Non-regression:** Complete a full booking flow with SMS opt-in checked and email opt-in unchecked. Verify the API receives `{ smsOptIn: true, emailOptIn: false }` in the customer payload.

8. **Keyboard accessibility:** Tab through the form — confirm date input and both checkboxes are reachable via keyboard. Space/Enter toggles checkboxes.
