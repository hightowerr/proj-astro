# 04 — Existing Shop MCC Audit

## Summary
One-time script to audit existing shops for MCC discrepancies. Retrieves each shop's Stripe account, compares the assigned MCC against the expected MCC from `getMccForBusinessType()`, and logs mismatches.

## Prerequisites
- Depends on: 01 (mcc-mapping-module), 02 (route-integration deployed)
- Run **after** deploying specs 01-02

## Changes

**New file:** `scripts/audit-mcc.ts`

### Logic

1. Query all shops where `stripeAccountId IS NOT NULL`
2. For each shop:
   - Call `stripe.accounts.retrieve(shop.stripeAccountId)` 
   - Read `account.business_profile?.mcc`
   - Compare against `getMccForBusinessType(shop.businessType)`
   - Log: `shopId`, `slug`, `businessType`, `expectedMcc`, `stripeMcc`, `match: boolean`
3. Summary: count of matches, mismatches, and shops where Stripe auto-corrected

### Rate limiting
Stripe API rate limit is 25 reads/sec in live mode. Process sequentially with no delay — at current scale (1 merchant) this is irrelevant. Add a 100ms delay between calls if merchant count exceeds 20.

### Output format
```
[MCC Audit] Shop: kicksnare (hair) — expected: 7241, stripe: 7241, match: ✓
[MCC Audit] Summary: 1 checked, 1 match, 0 mismatch
```

### Post-audit action
If Stripe has auto-corrected an MCC during Express verification, the platform's mapping is informational only — Stripe's assigned MCC takes precedence. Log for awareness; no automated remediation. If the mismatch is material (e.g., health-clinic assigned barbershop MCC), consider contacting Stripe support.

### Lifecycle
This script is run once, manually, via `npx tsx scripts/audit-mcc.ts`. It is not a cron job. Delete or archive after confirming results.

## Acceptance
- Script runs without error against the production database
- Output shows the MCC comparison for every shop with a Stripe account
- No data is modified — read-only audit
