# Re-engagement Email Copy Fix — Shape

## Problem
The re-engagement email (spec 16, Stripe Connect) makes process-specific claims that are false for ~1-5% of recipients. `stripeAccountCreatedAt` fires before the browser redirect to Stripe. If the redirect fails (popup blocker, network drop, tab closed), the email says "You started connecting your Stripe account" — referencing an interaction that never happened.

Root cause: the DB timestamp is a map of system state, not user experience. The `"pending"` status conflates five distinct scenarios into one undifferentiated state.

## Mental models
- **Map Is Not the Territory** — DB state ≠ user experience
- **Curse of Knowledge** — "Stripe Connect onboarding" is system jargon
- **Framing Effect** — outcome-anchored language ("setting up deposits") vs process-specific ("connecting Stripe")

Analysis: `mcp-go/Mental Models/WorkSpace/26-06-30_14-24-05_reengagement_email_false_premise/analysis_report.md`

## Requirements
- **R0**: Headline must be true regardless of Stripe redirect success
- **R1**: Body must not imply user entered a verification flow
- **R2**: Footer must not reference "Stripe Connect onboarding" (internal jargon)
- **R3**: Plain text must mirror HTML copy changes
- **R4**: Subject line and CTA unchanged (already correct)
- **R5**: No layout, styling, timing, or logic changes

## Shape (single — no alternatives needed)
Copy-only fix. 4 string replacements in `src/app/api/jobs/connect-reengagement/route.ts`. No new columns, no telemetry, no architectural change — proportionate to severity (low impact, mild confusion).

### Fit check

| Req | Fits? | Notes |
|-----|-------|-------|
| R0 | Yes | "You began setting up deposits" is always true |
| R1 | Yes | "Once set up" vs "Once verified" |
| R2 | Yes | "setting up deposit collection" vs "Stripe Connect onboarding" |
| R3 | Yes | Plaintext mirrors HTML |
| R4 | Yes | No subject/CTA changes |
| R5 | Yes | Copy-only, no code logic changes |

## Spikes needed
None. No technical unknowns — all changes are string literal replacements.

## Design reference
Prototype: `Email Connect Reengagement Standalone.html` — confirmed across 4 variants (Desktop/Light, Mobile/Light, Desktop/Dark, Mobile/Dark).

## Risk
Effectively zero. No logic changes. Self-healing already works (settings page shows "Continue setup" on next visit). CTA still works (generates fresh Account Link via `/refresh`).
