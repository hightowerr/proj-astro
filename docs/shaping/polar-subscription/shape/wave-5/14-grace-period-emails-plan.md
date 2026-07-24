# Wave 5 — Slice 5a: Grace Period Emails

## Spec
14-grace-period-emails.md

## Files to create/modify
- **Modify**: `src/lib/auth.ts` — add deferred email calls to webhook callbacks

## Acceptance Criteria
1. `onSubscriptionUpdated` (status = `past_due`): send "Payment failed" email after DB commit.
2. `onSubscriptionActive` (when previous status was `past_due`): send "Payment recovered" email after DB commit.
3. `onSubscriptionRevoked`: send "Subscription ended" email after DB commit.
4. Emails sent via Resend using existing `sendEmail()` pattern.
5. Email failures do not roll back webhook state changes.
6. Dedup via `messageDedup` table (same pattern as onboarding drips).
7. Email subjects match spec: "Payment failed", "Payment recovered", "Subscription ended".
8. `pnpm check` passes with zero new errors.
