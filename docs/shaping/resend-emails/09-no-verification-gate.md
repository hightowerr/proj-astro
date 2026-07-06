# Spec: No Verification Gate (Decision Record)

## Summary
Decision: do NOT add `emailVerified` enforcement to `requireAuth()`. Unverified users can access the dashboard immediately after signup. Verification emails send but are not enforced.

## Type
Decision record (no code change)

## Prerequisites
None

## Rationale
Three mental models (Setup Moment, Iatrogenics, Friction) converge on this decision. Full analysis: `WorkSpace/26-07-05_22-36-55_email_verification_gate_vs_open_access/analysis_report.md`

Key points:
1. **No activation value** — verification doesn't help merchants set up services or reach their booking page
2. **Iatrogenic risk** — gate solves non-existent problem (n=1 users, no abuse) while creating lockout risk on Resend failure
3. **FR score** — gate doubles step count (4→8) with inbox context switch for zero additional reward
4. **Stripe Connect is the real gate** — no financial actions possible without Stripe's own identity verification
5. **All competitors gateless** — Calendly, Acuity, Square Appointments allow immediate access

## Revisit Triggers
- Public SaaS signup goes live AND fake signup rate exceeds 10%
- Product feature requires verified email (e.g., public merchant directory)
- Security incident involving unverified account

## Files Changed
None — this is explicitly a "do not change" decision.

## Effort
0 min (no code change)
