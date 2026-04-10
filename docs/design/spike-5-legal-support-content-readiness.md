# Spike 5: Legal / Support Content Readiness

Source review: `docs/design/login-register-screen-review.md`

## Goal

Determine whether the footer row in the auth mock should be functional in v1, and define the launch-safe treatment for legal and support links.

## Current State

Observed in the codebase:

- `src/components/site-footer.tsx` includes links to:
  - `/privacy`
  - `/terms`
  - `/contact`
- there are no matching route files under `src/app` for:
  - `/privacy`
  - `/terms`
  - `/contact`
  - `/support`
- the auth review mock references:
  - privacy policy
  - terms of service
  - support

This means the current product visually implies those destinations in the shared footer, but they are not implemented as usable app routes today.

## Decision

The auth footer row should not be treated as fully functional in v1 unless the matching routes ship at the same time.

For the auth redesign:

- do not render dead legal/support links as if they are live
- either ship the routes alongside the redesign
- or reduce the footer row to non-link text / omit the row entirely

## Question 1: Do `/privacy`, `/terms`, and `/contact` or `/support` need to ship alongside auth redesign?

Recommended answer:

- No, not strictly

But if the auth shell includes a footer row styled as navigable links, then the destinations should exist.

Practical rule:

- linked footer row requires real routes
- no routes means no live links

## Question 2: Are these simple static pages or managed content?

Recommended answer:

- simple static pages for v1

Why:

- these are foundational legal/support destinations, not dynamic product content
- the main requirement is that they resolve and provide credible baseline information
- static pages are enough to unblock truthful linking from auth

Managed content would only make sense if the team already has a content workflow requirement for legal copy or support pages. Nothing in the current repo suggests that is necessary for this spike.

## Question 3: Should missing destinations be removed rather than shown as dead links?

Recommended answer:

- Yes

Dead links on auth pages are a credibility problem:

- they weaken trust at a high-intent moment
- they create obvious broken-path UX
- they make the premium shell feel unfinished

If the routes do not exist, remove the links or render them as plain, non-interactive text only if there is a strong visual need for the row.

## Route / Content Checklist

If the team wants the auth footer row to be functional, the minimum route set is:

- `/privacy`
- `/terms`
- `/contact` or `/support`

Minimum content expectation for each:

### `/privacy`

- what data the product collects
- how booking/account/contact data is used
- how users can get in touch about privacy questions

### `/terms`

- baseline terms for using the platform
- payment/refund or booking-policy references where appropriate
- contact point for legal/business questions

### `/contact` or `/support`

- a working support email or contact method
- expected use of the channel
- lightweight reassurance that businesses can reach the team if needed

## Recommended V1 Treatments

### Option A: Best launch-safe option if routes do not exist

- omit the legal/support row from the auth shell

This is the cleanest option and avoids fake completeness.

### Option B: Acceptable if the visual row is important but routes do not exist

- render a muted, non-interactive text row

Example:

- "Privacy"
- "Terms"
- "Support"

This preserves some composition without implying navigable destinations.

### Option C: Best option if the team wants linked footer items

- ship simple static pages at the same time

Then the auth shell can safely include real links.

## Recommendation

For auth redesign v1, use one of these two paths:

- if legal/support pages are not shipping now, omit the row or make it non-interactive
- if the team wants clickable footer items, add simple static pages first

Do not ship the auth shell with live-looking links to missing routes.

## Fit With Existing Site Footer

One repo issue already exists:

- `src/components/site-footer.tsx` links to `/privacy`, `/terms`, and `/contact`
- those routes are missing under `src/app`

That means this is not only an auth-shell concern. The marketing footer has the same content-readiness gap.

So the auth redesign should not repeat that mistake.

## Launch Recommendation

Preferred v1 recommendation:

- keep the auth shell focused
- omit the footer row unless the legal/support destinations are actually ready

Secondary recommendation:

- if the row is visually necessary, use non-link text until routes exist

Future-safe recommendation:

- add static `/privacy`, `/terms`, and `/contact` pages, then convert the auth footer row into real links

## Output

Route/content checklist:
- `/privacy`
- `/terms`
- `/contact` or `/support`
- each route needs at least baseline static content and a real support contact

Recommendation for launch-safe footer treatment:
- if routes are missing, remove the links or render them as non-interactive text
- only show real clickable legal/support links when the corresponding routes exist
