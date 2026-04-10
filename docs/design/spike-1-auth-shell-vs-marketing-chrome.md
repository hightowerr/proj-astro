# Spike 1: Auth Shell vs Marketing Chrome

Source review: `docs/design/login-register-screen-review.md`

## Goal

Decide whether auth routes should continue using the shared marketing header/footer or move to a dedicated full-viewport auth shell.

## Current State

Observed in the codebase:

- `src/app/layout.tsx` wraps the entire app in `RouteChrome`
- `src/components/layout/route-chrome.tsx` removes global chrome only for `/app`
- `/login`, `/register`, `/forgot-password`, and `/reset-password` currently render inside the marketing `SiteHeader` and `SiteFooter`
- there is no `src/app/(auth)/layout.tsx` yet

This means the auth experience currently inherits the same chrome as the public marketing pages, with a `pt-16` offset for the sticky site header.

## Decision

Use a dedicated auth-only shell for the `(auth)` route group.

Decision details:

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`

These routes should not render the marketing `SiteHeader` or `SiteFooter`.

## Why

The mock reads as a focused, high-intent entry flow rather than a marketing browse flow. Keeping the global nav/footer around auth creates three problems:

- It weakens the premium split-screen composition by forcing the auth page to coexist with unrelated navigation and footer content.
- It adds exit paths at the exact point where the product wants commitment and continuity into onboarding.
- It complicates the viewport math because the current auth pages are sized around `calc(100vh - 4rem)` to compensate for the shared header.

The app already has a meaningful routing distinction between public pages and `/app`. Auth should be treated as a third shell:

- marketing shell for browse/read routes
- auth shell for account entry and recovery
- app shell for signed-in product routes

## Route / Chrome Decision

Recommendation:

- Marketing chrome stays on non-auth public routes.
- Auth routes own the full viewport.
- The auth hero panel replaces the global site header/footer on auth routes.
- Any required legal/support links live inside the auth shell itself, not in the global footer.

## Mobile Behavior

On mobile, the auth shell should remain dedicated and should not fall back to the marketing header/footer.

Recommended mobile behavior:

- keep a single-column auth page
- collapse the split layout into a stacked flow
- show the brand lockup and a compact hero block above the form
- hide or heavily simplify the large editorial image treatment below tablet widths
- keep footer-style legal/support links at the bottom of the auth shell if they are launch-ready

This preserves the focused auth context while avoiding a cramped split-screen on small devices.

## Implementation Boundary

Add `src/app/(auth)/layout.tsx` and let it own auth presentation.

Boundary for that layout:

- render a dedicated auth shell wrapper for all routes in `(auth)`
- provide full-height page structure without depending on the marketing header offset
- host shared brand lockup, hero copy slots, background treatment, and legal/support row
- allow individual pages to supply route-specific heading, helper copy, and hero content
- keep auth business logic in the existing page/form components

What should not be in this spike:

- Google auth
- signup field contract changes
- verification/reset backend changes
- legal page implementation

## Recommended Refactor Shape

1. Update `RouteChrome` so it can identify auth routes and avoid rendering marketing chrome there.
2. Add `src/app/(auth)/layout.tsx` for the shared shell.
3. Remove the current auth-page reliance on `min-h-[calc(100vh-4rem)]` and size against the viewport directly.
4. Keep the page files thin and move visual composition into shared auth-shell primitives.

## Suggested Ownership Split

`src/components/layout/route-chrome.tsx`
- Continue owning marketing vs non-marketing chrome decisions at the root level.

`src/app/(auth)/layout.tsx`
- Own the auth viewport shell and responsive split/stack structure.

`src/app/(auth)/*/page.tsx`
- Own redirect guards and route-specific copy only.

`src/components/auth/*`
- Continue owning the form interactions and submit states.

## Launch Recommendation

Ship auth as a dedicated full-viewport shell.

This is the cleanest match to the mock, requires only bounded routing/layout work, and avoids mixing high-intent auth screens with browse-oriented marketing chrome.

## Output

Route/chrome decision:
- auth routes should use a dedicated auth shell, not the shared marketing header/footer

Implementation boundary for `src/app/(auth)/layout.tsx`:
- shared full-viewport auth layout for login, register, forgot-password, and reset-password
- owns hero/media/brand/support framing
- leaves auth logic and route guards in the existing route pages and form components
