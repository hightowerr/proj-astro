# Spike 2: Social Login Strategy

Source review: `docs/design/login-register-screen-review.md`

## Goal

Determine whether Google sign-in is a near-term product requirement or just mock decoration, and define the launch boundary for auth v1.

## Current State

Observed in the codebase:

- `src/lib/auth.ts` enables `emailAndPassword` and `emailVerification`
- there is no Google provider configured in Better Auth
- `src/lib/auth-client.ts` exports email/password actions only; current auth UI uses `signIn.email` and `signUp.email`
- the login/register forms do not render or call any social auth flow
- `env.example` includes Google credentials, but they are currently used for Google Calendar OAuth
- the existing Google callback route is `src/app/api/settings/calendar/callback/route.ts`

This means the product does not currently support Google sign-in, even though Google credentials already exist in the environment for a different feature.

## Decision

Google sign-in should be treated as out of scope for auth v1.

For the first auth redesign:

- do not present Google sign-in as a live primary path
- remove it from the UI, or render it as clearly disabled future-state decoration
- keep the shipped auth experience anchored to email/password

## Why

This is not just a button-addition task. Shipping Google sign-in would expand both product behavior and auth infrastructure:

- Better Auth server configuration needs a Google provider
- client auth flows need a social sign-in path
- callback URLs and consent-screen setup must be defined for each environment
- account linking behavior needs product decisions
- onboarding needs to behave correctly when the Google account is new or already linked

Nothing in the current auth UI or server setup indicates that this work is already in progress. The mock implies a capability the product does not yet support.

## Product Decision

Recommendation:

- `No` for launch-critical requirement in v1
- `Later` if product explicitly wants lower-friction owner signup after the core auth shell ships

Rationale:

- the current user journey already works with email/password
- the register flow is already coupled to onboarding into `/app`
- the main value of the redesign is premium presentation and clearer auth framing, not auth-method expansion
- social login would introduce new edge cases without solving a proven launch blocker

## Better Auth Assessment

Better Auth does need additional provider configuration before Google sign-in can exist.

At minimum, the repo would need:

- Google provider added in `src/lib/auth.ts`
- auth client usage updated to call the provider-based sign-in flow
- UI controls for social auth states and failure handling
- environment documentation separated from the existing Google Calendar OAuth setup

Today, none of that is wired.

## Important Constraint: Calendar OAuth Already Uses Google

The repo already uses Google OAuth for calendar connection.

Current Google usage:

- connect route: `src/app/api/settings/calendar/connect/route.ts`
- callback route: `src/app/api/settings/calendar/callback/route.ts`
- OAuth helpers: `src/lib/google-calendar-oauth.ts`

That matters because auth Google sign-in cannot be treated as "we already have Google set up". It would need:

- its own OAuth callback path for auth
- its own scope design
- clarity on whether the same Google Cloud project is used for both auth and calendar integration
- environment docs that distinguish auth OAuth from calendar OAuth

## Required Questions Before Implementation

### 1. Is Google sign-in required for launch?

Recommended answer:

- No

If the answer changes to yes, it becomes a scoped auth feature project, not a styling detail.

### 2. Does Better Auth need a Google provider configured now?

Recommended answer:

- No for v1 launch
- Yes only when the team commits to shipping Google sign-in as a supported auth path

### 3. Are domain, callback URL, and consent-screen requirements already understood?

Current answer:

- Not fully for auth

What is known:

- calendar OAuth has a defined callback route and env usage
- auth Google sign-in does not yet have a documented callback route, environment contract, or consent-screen notes in the repo

### 4. How does Google sign-in map to onboarding and shop creation?

Current answer:

- not yet defined

Open product questions:

- If a user signs in with Google for the first time, do we create the account immediately and send them to `/app` onboarding?
- If an email already exists from password signup, do we link accounts or block with an error?
- Do we still require a display name in-app if Google profile data is incomplete or unavailable?
- What happens if a user first uses Google auth and later wants password login?

These are product and identity rules, not visual-design details.

## Provider Setup Checklist

If Google sign-in moves into scope later, this is the minimum checklist.

### Product

- Decide whether Google sign-in is primary, optional, or parity-only with email/password
- Define account-linking rules for existing email/password users
- Define onboarding behavior for first-time Google users
- Define fallback behavior if Google account data is missing expected profile fields

### Google Cloud

- Create or confirm the OAuth client for auth usage
- Define authorized JavaScript origins per environment
- Define authorized redirect URIs for auth callback routes
- Verify consent-screen configuration and publishing state
- Confirm brand/app naming shown in the consent flow

### App / Better Auth

- Add Google provider configuration in `src/lib/auth.ts`
- Add client-side social sign-in entry points in the auth UI
- Define post-login redirect behavior to `/app`
- Define error handling for denied consent, callback mismatch, and duplicate-account cases
- Add tests for new-user sign-in, returning-user sign-in, and account-linking edge cases

### Documentation / Env

- Separate auth Google OAuth docs from calendar OAuth docs
- Document any new env vars or clarified reuse rules
- Avoid ambiguous naming that implies one callback or one OAuth setup serves both features

## Launch Recommendation

For the auth redesign v1:

- ship email/password only
- omit the Google button entirely, or keep it visibly disabled and labeled as unavailable
- do not let the UI imply a production-ready social login path

This keeps the redesign truthful to current capability and avoids introducing auth expansion work under a design spike.

## Output

Yes/no product decision:
- No, Google sign-in should not be treated as a v1 launch requirement

Provider setup checklist:
- product decision on whether social auth is actually needed
- Google OAuth client, origins, redirects, and consent-screen setup for auth
- Better Auth Google provider configuration
- client-side social sign-in flow and error handling
- onboarding/account-linking rules
- tests and docs separating auth OAuth from calendar OAuth

Launch recommendation:
- ship the premium auth shell with email/password only, and defer Google sign-in to a later scoped feature
