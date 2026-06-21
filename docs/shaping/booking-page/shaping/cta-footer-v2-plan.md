# V2: Booking Footer

**Shape:** [CTA + Footer Reskin](./cta-footer-shape.md), Shape A (parts A4-A5)
**Status:** Pending
**Spec:** `09-footer.html`

---

## Goal

Create a `BookingFooter` server component and add it to `src/app/book/layout.tsx` below `{children}`.

## Files to Change

| File | Action | What changes |
|------|--------|-------------|
| `src/components/booking/booking-footer.tsx` | Create | New server component: brand mark + "Powered by Astro · Protected booking" |
| `src/app/book/layout.tsx` | Modify | Import and render `BookingFooter` after `{children}` |

## Implementation Details

### 1. BookingFooter (`src/components/booking/booking-footer.tsx`)

Server Component (no `"use client"`). Matches the nav's brand mark pattern but at 28px instead of 32px.

```tsx
export function BookingFooter() {
  return (
    <footer style={{
      padding: '32px',
      textAlign: 'center' as const,
      borderTop: '1px solid rgba(195,198,209,0.20)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        marginBottom: '12px',
      }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          backgroundColor: 'var(--al-primary)',
          borderRadius: '8px',
        }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 15, color: 'var(--al-on-primary)' }}
            aria-hidden="true"
          >dashboard_customize</span>
        </span>
        <span style={{
          fontSize: '16px',
          fontWeight: 800,
          letterSpacing: '0.04em',
          textTransform: 'uppercase' as const,
          color: 'var(--al-primary)',
        }}>Astro</span>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--al-outline)' }}>
        Powered by Astro {'\u00b7'} Protected booking
      </p>
    </footer>
  );
}
```

### 2. Layout update (`src/app/book/layout.tsx`)

**Current:**
```tsx
import { BookingNav } from "@/components/booking/booking-nav";

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BookingNav />
      {children}
    </>
  );
}
```

**Replace with:**
```tsx
import { BookingNav } from "@/components/booking/booking-nav";
import { BookingFooter } from "@/components/booking/booking-footer";

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BookingNav />
      {children}
      <BookingFooter />
    </>
  );
}
```

---

## Self-testing

1. **Visual — footer visible:** Navigate to `/book/kicksnare`. Scroll to bottom. Confirm:
   - Hairline border separates content from footer
   - Brand mark: 28px navy square with `dashboard_customize` icon
   - "ASTRO" text: 16px/800, uppercase, navy
   - Attribution: "Powered by Astro · Protected booking" in 13px muted `#737780`
   - Everything centered

2. **Visual — footer on all booking pages:** Navigate to `/book/nonexistent` (404). Confirm the footer still renders (it's in the layout, not the page).

3. **Non-regression:** Navigate to `/` (landing page). Confirm SiteFooter still renders there (not BookingFooter).

4. **TypeScript check:**
   ```bash
   pnpm tsc --noEmit 2>&1 | head -20
   ```
