# Spec 06 — BookingNav: Remove Marketing Links and Auth CTAs

## Priority

P1 — HIGH. Independent. Ship standalone.

## Summary

Delete the center section (landing page anchor links) and right section (auth CTAs) from BookingNav. Keep the brand mark only. The current BookingNav leaks booking customers to the ShowUp marketing site and shows irrelevant "Sign in" / "Start free trial" CTAs on a customer-facing booking page.

This is the Via Negativa solution from the existing current-issues analysis: session inconsistency is dissolved (no auth CTAs to be inconsistent), booking flow leak is fixed (no links navigating away), and the merchant's brand is improved (platform marketing removed from their storefront). Net negative lines of code.

## Changes

- **File:** `src/components/booking/booking-nav.tsx`

### 1. Remove NAV_LINKS constant (lines 3-8)

**Delete:**
```typescript
const NAV_LINKS = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];
```

### 2. Remove center section

Delete the `<nav>` block that maps over `NAV_LINKS` (the landing page anchor links).

### 3. Remove right section

Delete the "Sign in" and "Start free trial" links.

### 4. Keep brand mark

The left section with the "SHOWUP" brand mark remains (dashboard_customize icon + "SHOWUP" text).

### 5. Optional — Calendly-style "Powered by" variant

Instead of the full brand mark, render a smaller `Powered by [icon] SHOWUP` treatment. Smaller and less prominent — signals the platform without competing with the merchant's storefront. Recommended if the merchant's own branding lives elsewhere on the page.

## Design Prototype

**[BookingNav Simplified.export.html](../design/BookingNav%20Simplified.export.html)**

### Before → After (from prototype)

**Before (three sections):**
```
[icon SHOWUP]   [How it works  Features  Pricing  FAQ]   [Sign in] [Start free trial]
```
- Problems: Leaks to marketing site, Irrelevant auth CTAs, Session inconsistency

**After (brand mark only):**
```
[icon SHOWUP]
```
- Left-aligned, no empty space
- Booking flow stays put
- Stays a Server Component

**Optional "Powered by" variant:**
```
Powered by [icon] SHOWUP
```

### In-context views (from prototype)

- **Desktop:** Brand mark sits top-left, booking form content flows below. No empty right section.
- **Mobile:** Brand mark only, no hamburger. Hamburger removed entirely — nothing to open.

## Design Notes

- BookingNav is a Server Component — no auth dependency, no client JS. This deletion keeps it as a Server Component.
- The booking page layout (`book/layout.tsx`) will have a minimal header — brand mark only
- On mobile, the hamburger menu must be removed — there are no menu items to show. The prototype confirms: "Hamburger removed — nothing to open."
- **Flex note (from prototype):** With one child, keep `justify-content: flex-start` (or drop it — `space-between` collapses to left-align with a single child anyway). No spacer div needed.

### Pages impacted

- `/book/[slug]` — all merchant booking pages (customer-facing)

## Acceptance Criteria

- [ ] BookingNav shows brand mark only — no marketing links, no auth CTAs
- [ ] No "How it works", "Features", "Pricing", "FAQ" links on booking pages
- [ ] No "Sign in" or "Start free trial" on booking pages
- [ ] Booking page layout is visually clean with minimal header
- [ ] Mobile view has no empty hamburger menu
- [ ] `pnpm check` passes

## Prerequisites

None.

## Dependencies

None — fully independent.
