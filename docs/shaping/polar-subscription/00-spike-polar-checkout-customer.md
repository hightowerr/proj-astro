# 00 — Spike: Polar Checkout Customer Creation

## Summary
Verify whether the Polar Better Auth plugin's checkout flow auto-creates a Polar customer, or if one must be created beforehand.

## Prerequisites
None — this is a research spike.

## Question
When `authClient.checkout()` is called for a user who has no `polarCustomerId`:
1. Does Polar create the customer as part of the checkout flow?
2. Does the `onSubscriptionActive` (or `onSubscriptionCreated`) webhook payload include the `customerId`?
3. Or does `createCustomerOnSignUp: true` need to be set for checkout to work?

## Method
- Set up a test Polar product in sandbox
- Configure the Better Auth plugin with `createCustomerOnSignUp: false`
- Attempt checkout for a user with no Polar customer record
- Observe: does checkout succeed? Does webhook payload include customer ID?

## Impact on specs
- If auto-creates: no changes needed. Extract `polarCustomerId` from webhook payload in spec 05.
- If requires pre-creation: either set `createCustomerOnSignUp: true` in spec 03, or add a customer creation call before checkout in spec 09.

## Design brief
None — research only.
