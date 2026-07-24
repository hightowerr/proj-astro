# Spike: Polar Checkout Customer Creation

## Question

When `authClient.checkout()` runs for a user who has no `polarCustomerId`, does Polar auto-create the customer?

## Method

Reviewed Polar SDK documentation, Better Auth plugin docs, and GitHub issues.

## Findings

1. **Polar docs recommend `createCustomerOnSignUp: true`** — the plugin auto-creates a Polar Customer when a Better Auth user signs up. This maps the user via `externalId` for seamless downstream operations.
2. **Checkout with `authenticatedUsersOnly: true`** associates customer information with the authenticated user. The docs do not guarantee auto-creation at checkout time.
3. **GitHub issue #2254** reports that Polar customer creation errors do not prevent Better Auth user creation. This confirms the creation call is a separate step.
4. **Anonymous checkout** (`authenticatedUsersOnly: false`) can proceed without a pre-existing customer. Authenticated checkout likely requires one.

## Decision

Set `createCustomerOnSignUp: true` in spec 03. This is the safer default:
- Customer exists before checkout — no race condition.
- `externalId` mapping is automatic — webhook lookups resolve cleanly.
- Portal access works immediately after subscription.

## Impact on specs

- **Spec 03**: Change `createCustomerOnSignUp: false` to `true`.
- **Spec 05**: Webhook handler can still store `polarCustomerId` from the payload as a belt-and-suspenders update. The customer record already exists.
- **Spec 09**: No pre-checkout customer creation call needed. Checkout proceeds directly.
- **Spec 13**: Reconciliation can use the stored `polarCustomerId` to query Polar API.

## Risk

If `createCustomerOnSignUp: true` fails silently (GitHub issue #2254), the user has no Polar customer. Mitigation: spec 05 webhook handler stores `polarCustomerId` from the subscription payload. If the customer was not created at signup, the webhook creates the association.
