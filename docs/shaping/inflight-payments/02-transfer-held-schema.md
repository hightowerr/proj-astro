# Spec 02: Transfer Held Schema Migration

**Priority**: Foundation (blocks P2 + P3)

## Summary
Add a `transferHeld` boolean column to the appointments table to flag payments where the charge succeeded but the automatic transfer to the connected account did not execute due to suspension.

## Behaviour
- New column: `transfer_held` — `boolean`, default `false`, nullable `false`
- No backfill needed (no existing appointments have this condition untracked)
- Column is orthogonal to `paymentStatus` and `financialOutcome` — it is a modifier, not a state (same pattern as the refund modifier per spec R5 in refund-state)

## Scope
- **File**: `src/lib/schema.ts` — add column to `appointments` table definition
- **File**: `drizzle/NNNN_transfer_held.sql` — migration file
- No enum changes to `paymentStatus` or `financialOutcome`

## Dependencies
- **Prerequisites**: None — additive schema change

## Out of scope
- Reading or writing the column (see specs 03, 04, 07, 08)
- UI display (see specs 04, 05, 06)
