# V1: Confirm Booking CTA Restyle

**Shape:** [CTA + Footer Reskin](./cta-footer-shape.md), Shape A (parts A1-A3)
**Status:** Pending
**Spec:** `08-confirm-booking-cta.html`

---

## Goal

Restyle the "Confirm booking" button and error block in `booking-form.tsx` to Atelier Light. Add spinner @keyframes to `globals.css`.

## Files to Change

| File | Action | What changes |
|------|--------|-------------|
| `src/app/globals.css` | Modify | Add `@keyframes al-spin` + `.al-cta-loading` class |
| `src/components/booking/booking-form.tsx` | Modify | Restyle CTA button (~line 1392) + error block (~lines 1383-1390) |

## Implementation Details

### 1. Spinner keyframes + loading class (`globals.css`)

Add after the `.al-input-wrap:focus-within` rule:

```css
/* Atelier Light CTA spinner */
@keyframes al-spin {
  to { transform: rotate(360deg); }
}
.al-cta-loading {
  position: relative;
  color: transparent !important;
}
.al-cta-loading::after {
  content: "";
  position: absolute;
  inset: 0;
  margin: auto;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: al-spin 0.6s linear infinite;
}
```

### 2. Error block restyle (`booking-form.tsx` ~lines 1383-1390)

**Current:**
```tsx
{error ? (
  <div className="p-3.5" style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--color-error-border)", background: "var(--color-error-subtle)" }}>
    <p className="text-sm font-semibold" style={{ color: "var(--color-error)" }}>{error.message}</p>
    <p className="mt-1.5 text-sm opacity-85">
      Please select a different time slot and try again.
    </p>
  </div>
) : null}
```

**Replace with:**
```tsx
{error ? (
  <div style={{
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1px solid var(--al-error)',
    background: 'var(--al-error-container)',
  }}>
    <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--al-error)', marginBottom: '4px' }}>{error.message}</p>
    <p style={{ fontSize: '13px', color: 'var(--al-on-surface-variant)' }}>
      Please select a different time slot and try again.
    </p>
  </div>
) : null}
```

### 3. CTA button restyle (`booking-form.tsx` ~line 1392)

**Current:**
```tsx
<button type="submit" disabled={isSubmitting} style={{ width: "100%", height: "2.75rem", background: isSubmitting ? "var(--color-brand-dim)" : "var(--color-brand)", color: "var(--color-surface-void)", borderRadius: "var(--radius-lg)", fontSize: "1rem", fontWeight: 600, border: "none", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}>
  {isSubmitting ? "Booking…" : "Confirm booking"}
</button>
```

**Replace with:**
```tsx
<button
  type="submit"
  disabled={isSubmitting}
  className={isSubmitting ? 'al-cta-loading' : ''}
  style={{
    width: '100%',
    padding: '16px 24px',
    borderRadius: '12px',
    background: isSubmitting ? 'var(--al-surface-container-high)' : 'var(--al-gradient-cta)',
    color: isSubmitting ? 'var(--al-outline)' : 'var(--al-on-primary)',
    fontFamily: 'var(--font-manrope-raw), sans-serif',
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '0.02em',
    border: 'none',
    cursor: isSubmitting ? 'not-allowed' : 'pointer',
    boxShadow: isSubmitting ? 'none' : '0px 14px 28px rgba(0, 30, 64, 0.20)',
    transition: 'opacity 0.15s ease, transform 0.15s ease',
  }}
>
  {isSubmitting ? 'Booking…' : 'Confirm booking'}
</button>
```

**Notes:**
- `isSubmitting` triggers both the disabled visual (gray bg, no shadow) AND the spinner (via `al-cta-loading` class which hides text with `color: transparent !important` and shows the `::after` spinner)
- The text "Booking…" is still in the DOM for screen readers but visually hidden by the spinner class
- Hover/active states (opacity 0.92, scale 0.985) are CSS concerns — since the button uses inline styles, these won't be implemented. Consistent with the pattern of no hover states in the codebase. Parked in current-issues.md.

---

## Self-testing

1. **Visual — default state:** Navigate to `/book/kicksnare`. Confirm:
   - "Confirm booking" button is full-width navy gradient with CTA shadow
   - Text: white, ~14px, weight 700
   - Button radius 12px, padding 16px 24px

2. **Visual — error state:** Submit the form without selecting a slot. Confirm:
   - Error block shows with `--al-error` text color (deep red), `--al-error-container` bg (light pink)
   - No `--color-*` tokens in the error block

3. **Visual — loading state:** Fill in form and submit. Confirm:
   - Button changes to gray bg (`#e8e8e6`), muted text (`#737780`), no shadow
   - White spinner appears centered in the button
   - Button text is visually hidden while spinner shows

4. **Token audit:** Inspect button and error block — zero `--color-*` tokens.

5. **TypeScript check:**
   ```bash
   pnpm tsc --noEmit 2>&1 | head -20
   ```
