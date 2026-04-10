# Login / Register Requirements

Derived from:

- `docs/design/login-register-screen-review.md`
- `docs/design/stitch_reminder_system_prd (login)/DESIGN.md`
- `docs/design/stitch_reminder_system_prd (login)/code.html`
- `docs/design/spike-1-auth-shell-vs-marketing-chrome.md`
- `docs/design/spike-2-social-login-strategy.md`
- `docs/design/spike-3-auth-lifecycle-messaging.md`
- `docs/design/spike-4-signup-information-architecture.md`
- `docs/design/spike-5-legal-support-content-readiness.md`

## Scope

- The auth redesign must cover:
  - `/login`
  - `/register`
  - `/forgot-password`
  - `/reset-password`
- The redesign must stay within the current Better Auth email/password product boundary.

## Route Chrome

- Auth routes must use a dedicated auth shell.
- Auth routes must not render the shared marketing `SiteHeader` or `SiteFooter`.
- Auth routes must own the full viewport.
- Auth routes must use a shared route group layout at `src/app/(auth)/layout.tsx`.
- The auth shell may include a minimal auth-specific brand bar or brand anchor.
- Any auth-specific top bar must remain minimal, non-marketing, and non-navigational.
- The auth shell must support a premium split-screen desktop layout.
- The auth shell must collapse to a dedicated single-column mobile layout without falling back to marketing chrome.

## Visual / Layout

- The auth UI must use the Atelier light design tokens from `docs/design-system/design-system.md`.
- The auth UI must also follow the editorial constraints described in `docs/design/stitch_reminder_system_prd (login)/DESIGN.md`.
- The auth shell must support:
  - brand lockup
  - route-specific heading and helper copy
  - hero/media panel
  - form panel
- The desktop layout should use intentional asymmetry rather than a rigid 50/50 split.
- The desktop layout should bias visual weight toward the hero/media side and keep the form side narrower.
- The shell should use tonal layering and background shifts instead of heavy box sectioning.
- Standard 1px divider-style borders must not be used as the primary way to structure the screen.
- If a border is needed for accessibility or focus, it must use a low-contrast ghost-border treatment.
- The hero/media treatment must maintain accessible text contrast.
- The hero/media panel should support a full-bleed editorial image with a gradient overlay for text legibility.
- The hero/media panel should support large editorial headline copy and short supporting copy.
- The auth shell must visually align with the onboarding experience so the register-to-`/app` handoff feels continuous.
- The auth shell should use generous whitespace and avoid cramped card-in-card composition.

## Component Styling

- Input fields must use filled surface treatments rather than hard boxed outlines.
- Input fields must use `surface_container_low`-style backgrounds with soft rounded corners.
- Focus states must rely on subtle surface elevation and low-contrast focus rings rather than harsh outlines.
- Password inputs on supported routes should include a visibility toggle.
- Primary actions should use the Atelier primary treatment with soft depth, not generic flat buttons.
- Secondary or supporting actions should use softer secondary-container styling or tertiary text-link styling.
- The auth screen may use a centered divider treatment such as "or use email" only if it reflects truthful functionality.
- Form labels must remain visible and must not rely on placeholders alone.

## Supported Auth Methods

- Auth v1 must support email/password only.
- Google sign-in must not be treated as a launch requirement.
- Google sign-in must not appear as an active production-ready control.
- If shown at all, Google sign-in must be clearly disabled and presented as future-state only.

## Login Requirements

- `/login` must support email/password sign-in.
- `/login` must preserve the forgot-password entry point.
- `/login` should place the forgot-password action adjacent to the password label/field area.
- `/login` must preserve the link to `/register`.
- `/login` must redirect authenticated users to `/app`.
- `/login` must support a success state for `?reset=success`.
- `/login` copy must stay within currently supported auth capabilities.
- `/login` should use a route-specific headline and helper copy aligned with the editorial auth shell.

## Register Requirements

- `/register` must support email/password account creation.
- `/register` must redirect authenticated users to `/app`.
- `/register` must keep the current signup field contract:
  - `name` required
  - `email` required
  - `password` required
  - `confirm password` required
- `/register` must not collapse to the same field set as `/login`.
- `/register` must not absorb business setup fields.
- `/register` must frame account creation as the beginning of onboarding.
- `/register` copy must preview the next step after signup.
- `/register` must not imply that account creation alone completes setup.
- `/register` should use route-specific headline and helper copy aligned with the editorial auth shell.

## Onboarding Handoff

- Successful signup must continue redirecting to `/app`.
- `/app` must remain the decision point for onboarding vs dashboard.
- Business setup must remain in onboarding, not in auth:
  - business type
  - shop name
  - shop slug
  - service setup

## Forgot Password Requirements

- `/forgot-password` must remain a supported route.
- `/forgot-password` must support requesting a reset link by email address.
- `/forgot-password` success copy must stay truthful to current delivery behavior.
- In development/local flows, forgot-password messaging must explicitly reference terminal delivery of the reset URL unless backend behavior changes.
- `/forgot-password` must preserve the link back to `/login`.

## Reset Password Requirements

- `/reset-password` must remain a supported route.
- `/reset-password` must support valid token-based password reset.
- `/reset-password` must handle invalid or expired token states.
- `/reset-password` must redirect users back to `/login?reset=success` after a successful reset.

## Messaging / Copy Requirements

- Auth copy must promise only flows the product actually supports now.
- Auth copy must not imply production-ready inbox delivery for verification or reset emails unless auth email delivery is provider-backed.
- Verification messaging may be present, but must remain non-blocking in v1.
- Signup copy may mention verification only in conditional, truthful language.
- Auth copy must not claim that email verification is required before entry unless the auth flow is changed to enforce that.
- Forgot-password copy must not use unconditional "check your email" language while auth emails are terminal-logged.
- Login and register pages must each have route-specific editorial helper copy rather than generic shared card copy.
- The auth shell may include premium brand/editorial language, but it must not overstate unsupported product features.

## Email Lifecycle Requirements

- The design may represent verification-related states.
- The design may represent forgot-password and reset-password states.
- The design must not imply production-ready auth email delivery.
- Production-grade auth email claims are blocked until:
  - Better Auth verification emails are wired to a real provider
  - Better Auth reset emails are wired to a real provider
  - sender identity and templates are defined
  - delivery monitoring/logging exists

## Legal / Support Footer Requirements

- The auth shell must not show live legal/support links unless the corresponding routes exist.
- The auth shell may include a minimal footer row or copyright line if it remains truthful and low-noise.
- If legal/support routes do not ship, the auth footer row must either:
  - be omitted
  - or be rendered as non-interactive text
- Clickable legal/support links require real destinations for:
  - `/privacy`
  - `/terms`
  - `/contact` or `/support`

## Functional Integrity Requirements

- Existing Better Auth email/password flows must remain intact.
- Existing redirect guards for authenticated users on auth routes must remain intact.
- Existing post-auth redirect to `/app` must remain intact.
- Existing onboarding trigger for users without a shop must remain intact.
- The requirements must remain truthful to the current codebase:
  - `src/app/(auth)/login/page.tsx`
  - `src/app/(auth)/register/page.tsx`
  - `src/components/auth/sign-in-button.tsx`
  - `src/components/auth/sign-up-form.tsx`

## Explicit Non-Requirements For V1

- Google auth provider setup
- Social login launch support
- Changes to the signup field contract
- Verification-before-entry enforcement
- Moving business setup fields into `/register`
- Production-ready auth email delivery claims
- Live legal/support footer links without matching routes
