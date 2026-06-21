# V1: Booking Layout + Navigation Header

**Slice of:** [Booking Page Reskin](./booking-page-reskin-slices.md)
**Status:** Complete
**Specs:** `01-navigation-header.html`

---

## Goal

Replace the shared `SiteHeader` (fixed, `--color-*` tokens) with a booking-specific layout that renders a non-fixed, Atelier Light navigation header.

## Files to Change

| File | Action | What changes |
|------|--------|-------------|
| `src/components/layout/route-chrome.tsx` | Modify | Add `"/book"` to `APP_ROUTE_PREFIXES` |
| `src/app/book/layout.tsx` | Create | New layout: renders `BookingNav` + `<main>{children}</main>` |
| `src/components/booking/booking-nav.tsx` | Create | New server component: AL-styled marketing nav |

## Implementation Details

### 1. RouteChrome exclusion (`route-chrome.tsx`)

Change line 12:
```tsx
// Before
const APP_ROUTE_PREFIXES = ["/app"];

// After
const APP_ROUTE_PREFIXES = ["/app", "/book"];
```

This causes `/book/*` routes to render bare `<main id="main-content">{children}</main>` — no `SiteHeader`, no `SiteFooter`, no `pt-16`.

### 2. Booking layout (`src/app/book/layout.tsx`)

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

No `<main>` wrapper needed — `RouteChrome` already wraps in `<main id="main-content">`.

### 3. BookingNav (`src/components/booking/booking-nav.tsx`)

Server Component (no `"use client"` needed). Structure from spec:

```
<nav> (flex, space-between, 16px/32px padding, white bg, bottom hairline)
  <div> brand mark + brand name
  <div> nav links (How it works, Features, Pricing, FAQ)
  <div> Sign in link + CTA button
</nav>
```

**Token mapping from spec:**

| Element | Style |
|---------|-------|
| Nav container | `bg: var(--al-surface-container-lowest)` (#fff), `border-bottom: 1px solid rgba(195,198,209,0.20)`, `padding: 16px 32px` |
| Brand mark | 32px square, `bg: var(--al-primary)`, radius 8px, Material Symbol `dashboard_customize` centered in white |
| Brand name | `font-size: 18px`, `font-weight: 800`, `letter-spacing: 0.04em`, `text-transform: uppercase`, `color: var(--al-primary)` |
| Nav links | `font-size: 14px`, `font-weight: 600`, `color: var(--al-on-surface-variant)`, hover `bg: #eeeeec`, radius 10px, `padding: 8px 16px` |
| Sign in | Same style as nav links |
| CTA | `background: var(--al-gradient-cta)`, `color: var(--al-on-primary)`, `font-size: 13px`, `font-weight: 700`, `letter-spacing: 0.02em`, radius 12px, `padding: 10px 20px`, `box-shadow: var(--al-shadow-cta)` |
| Bottom border | `1px solid rgba(195,198,209,0.20)` |

**Nav links target:**
- "How it works" → `/#how-it-works`
- "Features" → `/#features`
- "Pricing" → `/#pricing`
- "FAQ" → `/#faq`
- "Sign in" → `/login`
- CTA → `/register`

**Not included:** No fixed/sticky positioning. No framer-motion. No scroll detection. No session state (always shows "Sign in" + "Start free trial"). No mobile drawer (spec is desktop-only).

### 4. Page background

The booking page currently gets its background from the root `<body>` class `bg-background`. Verify this resolves to `#f9f9f7` (AL surface). If not, add `style={{ background: 'var(--al-background)' }}` to the layout wrapper or page container.

---

## Self-testing

1. **Visual check:** Navigate to `/book/[slug]` in dev server. Confirm:
   - Old `SiteHeader` is gone (no fixed nav, no teal brand color)
   - `BookingNav` renders at top of page, scrolls with content
   - Brand mark (navy square with icon), "ASTRO" text, 4 nav links, "Sign in", "Start free trial" button visible
   - Bottom hairline visible
   - Page background is `#f9f9f7`
   - No `pt-16` gap at top of content

2. **Link check:** Click each nav link — verify they navigate to expected targets (`/#how-it-works`, `/login`, `/register`).

3. **Non-regression:** Visit the landing page (`/`) — verify `SiteHeader` still renders there (RouteChrome should NOT exclude `/`). Visit `/manage/[token]` — verify `SiteHeader` still renders.

4. **Form still works:** On `/book/[slug]`, select a date, pick a slot, fill contact fields, submit — verify the form submission flow is unchanged.

5. **E2E sanity:** Run existing booking E2E tests to confirm no regressions:
   ```bash
   pnpm exec playwright test --grep "book" --reporter=list
   ```
