# 06 — Trial Initialization

## Summary
Set `subscriptionStatus = 'trialing'` and `trialEndsAt` when a shop is created.

## Prerequisites
- **01-schema-migration** — needs the new columns to exist

## Changes

### Shop creation flow (wherever `INSERT INTO shops` happens)
- Set `subscriptionStatus: 'trialing'`
- Set `trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)` (createdAt + 14 days)

### Fallback in `requireShopAuth()` (spec 07)
- If `subscriptionStatus` is NULL → treat as `trialing` with `trialEndsAt = createdAt + 14d`
- Belt-and-suspenders: handles existing shops created before migration

## Design brief
None — backend only.
