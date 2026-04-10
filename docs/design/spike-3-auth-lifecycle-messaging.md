# Spike 3: Auth Lifecycle Messaging

Source review: `docs/design/login-register-screen-review.md`

## Goal

Define what the auth screens can truthfully promise around verification and password recovery, and identify what backend work is still required for production-ready messaging.

## Current State

Observed in the codebase:

- `src/lib/auth.ts` enables email/password auth, password reset, and email verification
- `sendResetPassword` logs the reset URL to the terminal instead of delivering an email
- `sendVerificationEmail` logs the verification URL to the terminal instead of delivering an email
- `emailVerification.sendOnSignUp` is enabled outside Playwright E2E
- `src/components/auth/forgot-password-form.tsx` already tells the user to check the terminal for the reset URL
- successful signup redirects into `/app`, where users without a shop enter onboarding
- Resend is present in the repo via `src/lib/email.ts`, but auth emails are not using it

This means the product supports the mechanics of verification and password reset, but not production-grade email delivery for those auth messages.

## Decision

Auth screens should present verification and password reset as available flows, but the copy must stay honest about the current delivery model.

For the auth redesign v1:

- keep forgot-password as a supported flow
- keep verification-related states available
- do not imply inbox delivery is fully production-ready unless auth emails are moved onto a real provider

## Verification Requirement

### When should verification be required before entry?

Recommended answer:

- Do not block immediate entry for the current v1 auth redesign

Reasoning:

- the current system already allows post-signup access and redirects new users into `/app`
- `/app` is also the handoff into onboarding when no shop exists
- changing verification from advisory to blocking would alter the onboarding contract, not just copy

Practical boundary:

- verification can be encouraged and messaged
- verification should not be presented as a hard gate until product explicitly decides to change post-signup access rules

## Signup Copy Rule

### Should signup copy mention email verification?

Recommended answer:

- Yes, but only in conditional and truthful language

Launch-safe examples:

- "We may ask you to verify your email to secure your account."
- "After signup, you may receive a verification link."

Avoid:

- "Check your inbox to verify your account" as a universal production promise
- "You must verify your email before continuing" unless the auth flow actually enforces that rule

Because the current implementation logs verification URLs to the terminal, any unconditional inbox language would be false in local/dev and potentially misleading in production until the backend is updated.

## Forgot-Password Copy Rule

### Should forgot-password success copy refer to terminal-only behavior in development?

Recommended answer:

- Yes

Current behavior already does this correctly in `src/components/auth/forgot-password-form.tsx`:

- "If an account exists with that email, a password reset link has been sent. Check your terminal for the reset URL."

Recommendation for auth v1:

- keep development copy explicit about terminal logging
- if environment-aware messaging is introduced later, only switch to inbox-oriented copy when auth email delivery is actually wired to a provider

Suggested rules:

- development/local: explicitly mention the terminal
- production with no auth-email provider integration: do not claim delivery; surface a neutral failure or unavailable state instead
- production with real auth-email delivery: use standard inbox language

## Resend Source-of-Truth Decision

### When does Resend or another provider become the source of truth for auth emails?

Recommended answer:

- Only when Better Auth verification and reset callbacks are changed from console logging to provider-backed delivery

Right now:

- Resend exists for general app email delivery
- auth email lifecycle still bypasses `src/lib/email.ts`

So the source of truth for auth emails is currently:

- Better Auth flow generation
- terminal logging for delivery visibility

It is not yet:

- Resend dashboard
- email delivery logs
- production sender configuration

## Copy Rules By Route / State

### `/register`

Allowed:

- account creation messaging
- light mention that verification may follow
- onboarding handoff framing, such as "You’ll continue into setup after creating your account"

Avoid:

- claiming inbox verification is guaranteed
- claiming verification is mandatory before entry unless the product changes the auth gate

### `/login`

Allowed:

- standard sign-in messaging
- post-reset success banner, which is already supported via `?reset=success`

Avoid:

- references to Google login
- references to mandatory verified status unless enforced

### `/forgot-password`

Allowed:

- "If an account exists, we’ll generate a reset link"
- development-specific mention that the reset URL is available in the terminal

Avoid:

- unconditional "Check your email" copy until real auth email delivery exists

### `/reset-password`

Allowed:

- token validity and expiration messaging
- success redirect back to sign-in

Avoid:

- claims about email delivery or resend timing on this page

## Recommended Copy Strategy

For the redesign:

- keep the primary UX focused on access and onboarding
- use secondary helper text for verification states
- keep copy conservative where backend capability is not yet production-complete

Short rule:

- promise the flow
- do not over-promise the delivery channel

## Backend Dependency List For Production-Ready Auth Email Delivery

To make auth lifecycle messaging fully production-ready, the repo needs:

- Better Auth `sendVerificationEmail` wired to a real email sender
- Better Auth `sendResetPassword` wired to a real email sender
- a decision to reuse `src/lib/email.ts` or add auth-specific mail helpers
- verified sender/domain configuration for `EMAIL_FROM_ADDRESS`
- production-safe templates for verification and reset emails
- operational monitoring for auth email delivery failures
- environment-aware copy that matches actual delivery behavior

Optional but advisable:

- distinct auth email templates rather than ad hoc inline HTML
- event logging or message logging for auth emails, similar to other delivery paths
- docs clarifying that reminder emails and auth emails are separate pipelines until unified

## Repo Notes That Matter

- `src/lib/email.ts` already provides a Resend-based send primitive
- `src/lib/env.ts` requires `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS`, but auth does not use that integration yet
- `docs/shaping/onboarding/shop-owner-onboarding-shaping.md` describes the current signup path as email/password signup followed by verification link logged to console and entry into `/app`

One repo cleanup worth making later:

- `src/lib/env.ts` currently warns that "Social login/calendar OAuth will be disabled" when Google env vars are missing; that message conflates separate concerns and should eventually be split from auth-email messaging decisions

## Launch Recommendation

For auth redesign v1:

- keep verification messaging light and non-blocking
- keep forgot-password available
- continue using explicit terminal-oriented wording in development
- do not market the auth lifecycle as production-grade email delivery until Better Auth is wired to Resend or another provider

## Output

Copy rules for auth states:
- verification can be mentioned, but not as a guaranteed inbox flow or mandatory gate
- forgot-password should stay truthful about terminal delivery in development
- login/reset states can stay straightforward because those mechanics already exist
- signup should frame continuation into onboarding rather than a completed destination

Backend dependency list for production-ready email delivery:
- wire Better Auth verification email to Resend or another provider
- wire Better Auth reset email to Resend or another provider
- define sender identity and templates
- add delivery monitoring/logging
- update UI copy only after provider-backed delivery is live
