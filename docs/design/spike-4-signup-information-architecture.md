# Spike 4: Signup Information Architecture

Source review: `docs/design/login-register-screen-review.md`

## Goal

Decide whether registration is just account creation or the first step of onboarding, and define the field and copy boundary for the redesigned register screen.

## Current State

Observed in the codebase:

- `src/components/auth/sign-up-form.tsx` currently requires:
  - `name`
  - `email`
  - `password`
  - `confirmPassword`
- successful signup redirects to `/app`
- `src/app/app/page.tsx` sends users without a shop into `OnboardingFlow`
- `src/components/onboarding/onboarding-flow.tsx` is already a multi-step flow:
  - business type
  - shop details
  - add service
- `src/app/app/actions.ts` requires shop creation details later in onboarding, not during account signup

This means registration is already structurally the first step of onboarding, even though the current UI still presents it as a conventional standalone signup form.

## Decision

Treat register as account creation that explicitly hands off into onboarding.

That means:

- register should remain a dedicated auth step
- it should not absorb shop setup fields yet
- it should preview the immediate next step so the transition into `/app` onboarding feels intentional

## Information Architecture Recommendation

The clean v1 structure is:

1. Register creates the user account
2. App redirects to `/app`
3. `/app` starts onboarding when no shop exists

This is already how the product behaves. The redesign should make that flow legible rather than pretending register is the end of the journey.

## Question 1: Should `name` stay required on register?

Recommended answer:

- Yes, for v1

Why:

- it is already required by the shipped signup contract
- changing it would be a product and data-contract decision, not a pure layout change
- the app benefits from having a user name immediately for personalization and account identity

If the team later wants to simplify signup further, that should be a separate scope with explicit validation and downstream UX review.

## Question 2: Should `confirm password` stay on-page or move to a lighter pattern?

Recommended answer:

- Keep `confirm password` on-page for v1

Why:

- it is already implemented and validated in `src/components/auth/sign-up-form.tsx`
- removing it would change current signup behavior
- there is no compensating passwordless or magic-link flow to offset that simplification

Could it be revisited later?

- Yes

But that would be a separate auth-product decision. For the auth redesign, the safer move is to keep the current requirement and improve the visual treatment rather than change the contract.

## Question 3: Should the register screen preview the next step after auth?

Recommended answer:

- Yes

This is the most important content change for the register screen.

The register page should make it clear that creating an account is the gateway into setting up the business, not the final destination.

Good directions:

- "Create your account to start setting up your studio"
- "Next, you’ll choose your business type and set up your booking hub"
- "You’ll continue into setup after creating your account"

Avoid:

- copy that suggests the account is fully usable immediately with no setup context
- copy that implies shop creation happens on the register screen itself

## Question 4: Can the auth design visually hand off into `/app` onboarding without feeling abrupt?

Recommended answer:

- Yes, if the visual language is intentionally bridged

The handoff should use continuity rather than duplication.

Recommended continuity points:

- shared brand lockup
- shared Atelier light token palette
- similar type scale and spacing rhythm
- similar card/surface treatment between auth shell and onboarding container
- short "next step" preview on the register screen

The auth screen does not need to replicate onboarding UI. It only needs to set expectation that setup continues after account creation.

## Register Field Contract

Recommended v1 field contract:

- `name` required
- `email` required
- `password` required
- `confirm password` required

Not in scope for register:

- business type
- shop name
- shop slug
- service setup

Those belong to onboarding, where they already exist.

## Content / Copy Direction

Register should be framed as:

- account creation for shop owners
- the beginning of business setup
- a short preface to onboarding

Suggested content direction:

- headline focused on starting setup, not just "Sign up"
- support copy that explains the immediate next step
- optional micro-list of what happens after signup:
  - choose business type
  - create shop name and public URL
  - add first service

This should be lightweight. The goal is expectation-setting, not turning the auth page into a wizard.

## Transition Plan Into Onboarding

Recommended transition plan:

- keep signup form scope limited to account credentials and name
- on success, continue redirecting to `/app`
- let `/app` continue deciding whether to show dashboard or onboarding
- update register copy and shell visuals so the `/app` onboarding flow feels like the next chapter of the same journey

Practical implication:

- do not duplicate onboarding questions on the register page
- do not collapse register and onboarding into one giant form
- do not present register as a dead-end account screen disconnected from setup

## Why This Boundary Is Better

This boundary preserves three useful properties:

- auth stays focused and easy to complete
- onboarding stays responsible for business-specific setup
- the product becomes more understandable because the handoff is explicit

Trying to move business setup fields into register now would create an awkward hybrid:

- longer auth form
- more validation complexity
- blurred ownership between auth and onboarding

That is not needed for the current redesign.

## Launch Recommendation

For v1:

- keep the existing signup field contract intact
- redesign register as the first visible step toward onboarding
- add copy that previews the next setup stage
- rely on the existing `/app` onboarding flow for shop-specific data collection

## Output

Register field contract:
- `name`, `email`, `password`, and `confirm password` stay required on the register screen
- business setup fields stay in onboarding, not in auth

Content / copy direction:
- present register as the start of setting up the shop account
- preview that the user will continue into business setup after account creation
- avoid implying that register alone completes product setup

Transition plan into onboarding:
- keep redirect to `/app`
- keep `/app` as the decision point for onboarding vs dashboard
- align auth-shell and onboarding visuals so the transition feels continuous rather than abrupt
