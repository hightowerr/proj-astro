# Spike: RouteChrome Exclusion for Booking Page

## Context

The booking page needs its own layout with a non-fixed, AL-styled nav instead of the shared `SiteHeader`. We need to understand how to cleanly exclude `/book` routes from `RouteChrome`.

## Goal

Understand the exact code changes needed and any side effects.

## Questions & Answers

| # | Question | Answer |
|---|----------|--------|
| **S1-Q1** | What code change is needed in RouteChrome? | Add `"/book"` to `APP_ROUTE_PREFIXES` array (line 12). The existing prefix-matching logic (`startsWith`) handles it correctly. Single line change: `const APP_ROUTE_PREFIXES = ["/app", "/book"];` |
| **S1-Q2** | Is omitting `pt-16` correct for non-fixed nav? | Yes. `pt-16` exists solely to compensate for `SiteHeader`'s `fixed top-0`. A non-fixed nav is in normal document flow — no padding compensation needed. |
| **S1-Q3** | Are there other routes under `/book`? | No. Only `src/app/book/[slug]/page.tsx` exists. No bare `/book` page, no nested routes, no existing layout. |
| **S1-Q4** | Should `SiteFooter` be preserved? | No. The current `SiteFooter` is a marketing footer. Spec 09 defines a booking-specific footer but is out of scope. The layout should render BookingNav + children only. |

## Implementation Summary

**`src/components/layout/route-chrome.tsx`:** Change `APP_ROUTE_PREFIXES` from `["/app"]` to `["/app", "/book"]`.

**New `src/app/book/layout.tsx`:** Renders `BookingNav` (non-fixed, AL-styled) + `{children}` in `<main>`. No `SiteFooter`, no `pt-16`.

**BookingNav** is much simpler than `SiteHeader`: no framer-motion, no scroll detection, no fixed positioning. Can be a Server Component if auth state isn't needed in the nav (the spec shows static "Sign in" link + "Start free trial" CTA).
