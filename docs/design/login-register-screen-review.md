# Login / Register Screen Review

Reviewed against:
- Proposed mock: `docs/log-in_screen.png`
- Current login route: `src/app/(auth)/login/page.tsx`
- Current register route: `src/app/(auth)/register/page.tsx`
- Current auth UI: `src/components/auth/sign-in-button.tsx`, `src/components/auth/sign-up-form.tsx`
- Current auth config: `src/lib/auth.ts`
- Current route chrome: `src/components/layout/route-chrome.tsx`
- Current post-auth landing: `src/app/app/page.tsx`
- Design tokens: `docs/design-system/design-system.md`

## Summary

The proposed mock is directionally strong for the product:
- more premium than the current auth pages
- visually aligned with the Atelier / studio positioning
- simple enough to map onto the current email-password flow

The core layout is feasible now:
- split-screen hero + form
- branded heading and support copy
- email/password login
- forgot-password link
- login/register cross-links

But the mock also implies several capabilities or structural decisions that the app does not fully support yet:
- Google sign-in
- a dedicated standalone auth shell separate from the marketing site header/footer
- production-ready email verification and password reset delivery
- legal/support footer links that actually resolve
- a register page identical to login, even though signup currently requires more fields

The right boundary is:
1. implement the visual shell now
2. keep the functional scope anchored to current Better Auth email/password flows
3. spike the parts that imply auth-product expansion, not just UI polish

## What The App Supports Now

### Fully supported now

- Email/password sign-in
- Email/password account creation
- Forgot-password entry point
- Password reset flow
- Redirect authenticated users away from `/login` and `/register`
- Post-auth redirect to `/app`
- Conditional onboarding after signup when no shop exists
- Shared design tokens and typography that can support a premium auth screen

### Supported by current backend, but the UI is much simpler today

- A full-page branded auth layout for both `/login` and `/register`
- Hero image panel and stronger visual identity
- Better spacing, typography, and form styling
- Password visibility toggle
- Inline success/error messaging with stronger presentation
- Route-specific copy for sign-in vs register
- Mobile-first stacked version of the split-screen layout

### Important nuance

The product does not end at account creation. After successful auth, users land on `/app`, and if they do not have a shop yet they enter the onboarding flow. That means the register screen should be designed as the start of onboarding, not as a complete standalone destination.

## Mock Elements That Are Feasible Now

### Safe now

- Left-side editorial/brand image
- Brand lockup and short positioning line
- Right-side auth form block
- Larger heading and helper copy
- Email and password fields
- Forgot-password link placement near the password field
- Primary CTA button
- Bottom link between sign-in and register
- Footer-style legal/support row as static text or as links once routes exist

### Safe with a small extension

- Shared `AuthShell` component for `/login`, `/register`, `/forgot-password`, and `/reset-password`
- Eye icon password reveal control
- Route-specific hero copy per page
- Success banner styling for `reset=success`
- Disabled “Continue with Google” button with explicit non-interactive semantics
- Responsive image treatment tuned for smaller screens

## Mock Elements That Are Not Feasible As-Is Today

### 1. `Continue with Google`

The current auth configuration enables email/password plus verification/reset helpers only. There is no Google OAuth provider configured in the auth client or server setup.

This means the mock can only show Google as:
- a clearly disabled future-state control
- or a removed element for v1

It should not appear production-ready in the first implementation.

### 2. Register page mirroring the login form exactly

Current signup requires:
- `name`
- `email`
- `password`
- `confirm password`

So a register page that only mirrors the login inputs would be inaccurate against shipped behavior. Either:
- the register design needs its own expanded form state
- or signup requirements need to change

That is a product and implementation choice, not just styling.

### 3. Production-ready email-based account lifecycle

The app supports verification and password reset flows, but the actual delivery is still terminal logged in the auth config rather than sent through a real email provider.

That means the design can represent:
- forgot password
- verification-related messaging

But not a fully credible production auth lifecycle without backend work.

### 4. Dedicated auth-only chrome

Right now non-`/app` routes render through the shared site header and site footer. The mock reads more like a focused standalone auth shell.

That is feasible, but it requires an explicit routing/chrome decision:
- keep marketing chrome around auth
- or suppress it for auth routes and let the auth screen own the full viewport

### 5. Footer links as real product destinations

The mock includes:
- privacy policy
- terms of service
- support

The current site footer also links to legal/contact destinations, but those app routes are not present in `src/app` today. So these should not be treated as complete product features yet.

## Recommended Design Boundary

If the team wants to move now, the design should stay within this boundary:

- Build a premium split-screen auth shell
- Use the Atelier light design tokens already documented
- Support four routes consistently:
  - `/login`
  - `/register`
  - `/forgot-password`
  - `/reset-password`
- Keep auth methods limited to email/password
- Keep signup truthful to the current required fields
- Treat Google sign-in as out of scope for the first pass
- Treat legal/support links as content dependencies, not guaranteed launch-ready features

## Spikes Needed

### Spike 1: Auth Shell vs Marketing Chrome

Goal:
- decide whether auth routes should keep the site header/footer or become a dedicated full-viewport auth experience

Questions:
- Should `/login` and `/register` still expose marketing nav?
- Does the hero panel replace the global site header/footer on auth routes?
- How should mobile behave if the split-screen collapses?
- Should auth use a separate route group layout?

Output:
- route/chrome decision
- implementation boundary for `src/app/(auth)/layout.tsx`

### Spike 2: Social Login Strategy

Goal:
- determine whether Google sign-in is a near-term requirement or just mock decoration

Questions:
- Is Google sign-in required for launch?
- Does Better Auth need a Google provider configured now?
- Are there domain, callback URL, and consent-screen requirements already understood?
- How does Google sign-in map to onboarding and shop creation?

Output:
- yes/no product decision
- provider setup checklist
- launch recommendation for v1 vs later

### Spike 3: Auth Lifecycle Messaging

Goal:
- define what the auth screens can truthfully promise around verification and password recovery

Questions:
- When should verification be required before entry?
- Should signup copy mention email verification?
- Should forgot-password success copy refer to terminal-only behavior in development?
- When does Resend or another provider become the source of truth for auth emails?

Output:
- copy rules for auth states
- backend dependency list for production-ready email delivery

### Spike 4: Signup Information Architecture

Goal:
- decide whether registration is just account creation or the first step of onboarding

Questions:
- Should `name` stay required on register?
- Should `confirm password` stay on-page or move to a lighter pattern?
- Should register screen preview the next step after auth?
- Can the auth design visually hand off into `/app` onboarding without feeling abrupt?

Output:
- register field contract
- content/copy direction
- transition plan into onboarding

### Spike 5: Legal / Support Content Readiness

Goal:
- determine whether the footer row in the mock should be functional in v1

Questions:
- Do `/privacy`, `/terms`, and `/contact` or `/support` routes need to ship alongside auth redesign?
- Are these simple static pages or managed content?
- Should missing destinations be removed rather than shown as dead links?

Output:
- route/content checklist
- recommendation for launch-safe footer treatment

## Practical Feedback On The Mock

- The overall composition is strong and is realistic for the current product if Google is removed or clearly disabled.
- The image-led left panel fits the Atelier positioning better than the current plain card implementation.
- The login form is close to current capability, but the register page cannot be a visual copy without accounting for extra required fields.
- The “coming soon” badge on Google only works if the control is obviously disabled and not announced as available.
- The legal footer is visually useful, but it should not be linked until those destinations exist.
- The form should retain visible labels and not rely on placeholders alone.
- The hero text over imagery will need a stable contrast treatment, likely via gradient overlay, to stay accessible across responsive crops.

## Suggested v1 Cut

Ship now:
- shared branded auth shell
- redesigned `/login`
- redesigned `/register`
- redesigned `/forgot-password`
- redesigned `/reset-password`
- email/password only
- truthful signup fields

Do not commit yet:
- Google auth
- standalone support/legal ecosystem unless routes exist
- any register simplification that conflicts with current auth requirements
