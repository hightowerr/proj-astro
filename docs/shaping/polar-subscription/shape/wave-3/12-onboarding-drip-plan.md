# Wave 3 — Slice 3d: Onboarding Drip

## Spec
12-onboarding-drip.md

## Files to create/modify
- **Create**: `src/lib/onboarding-drips.ts` — drip processing function
- **Modify**: `src/app/api/jobs/resolve-outcomes/route.ts` — call `processOnboardingDrips()` after advisory lock release

## Dependencies
- Wave 1 slice 1a (01-schema) — needs `subscriptionStatus` column
- Wave 2 slice 2c (06-trial) — shops must have `trialEndsAt`

## Acceptance Criteria
1. Create `processOnboardingDrips()` function in `src/lib/onboarding-drips.ts`.
2. Query shops WHERE `subscriptionStatus = 'trialing'`.
3. For each shop, calculate `trialDay = daysSince(shop.createdAt)`.
4. Implement 8 drip emails with correct day triggers (1, 3, 5, 7, 10, 12, 13, 14).
5. Days 3, 5, 7, 10 have completion gates (skip if setup step already done).
6. Days 1, 12, 13, 14 always send (no gates).
7. Dedup via `messageLog` — check if drip already sent for this shop.
8. Send emails via Resend.
9. Log sent drips to `messageLog`.
10. Call `processOnboardingDrips()` in resolve-outcomes route AFTER advisory lock release.
11. Drip failures do not affect outcome resolution.
12. `pnpm check` passes with zero new errors.
