# Wave 1 — All Copy Changes (Implementation Plan)

## Overview
4 string replacements in `src/app/api/jobs/connect-reengagement/route.ts`. Single agent, sequential. No logic changes.

## File
`src/app/api/jobs/connect-reengagement/route.ts`

## Changes (in order)

### 1. HTML headline (line ~109)
**Before:** `You started connecting your Stripe account — you're almost there.`
**After:** `You began setting up deposits — finish in under 5 minutes.`

### 2. HTML body (line ~110)
**Before:** `Once verified, customer deposits will go directly to your bank account on every booking.`
**After:** `Once set up, customer deposits will go directly to your bank account on every booking.`

### 3. HTML footer (line ~117)
**Before:** `You're receiving this email because you started Stripe Connect onboarding for your Astro account. This is a transactional notification — not a marketing email. If you've already completed setup, you can disregard this message.`
**After:** `You're receiving this because you began setting up deposit collection for your Astro account. This is a transactional account-setup message. If you've already completed setup, you can disregard this message.`

### 4. Plaintext headline (line ~122)
**Before:** `You started connecting your Stripe account — you're almost there.`
**After:** `You began setting up deposits — finish in under 5 minutes.`

### 5. Plaintext body (line ~122)
**Before:** `Once verified, customer deposits will go directly to your bank account on every booking.`
**After:** `Once set up, customer deposits will go directly to your bank account on every booking.`

### 6. Plaintext footer (line ~122)
**Before:** `You're receiving this email because you started Stripe Connect onboarding for your Astro account. This is a transactional notification — not a marketing email.`
**After:** `You're receiving this because you began setting up deposit collection for your Astro account. This is a transactional notification — not a marketing email.`

## Acceptance criteria
- [ ] HTML headline reads "You began setting up deposits — finish in under 5 minutes."
- [ ] HTML body reads "Once set up, customer deposits…"
- [ ] HTML footer reads "you began setting up deposit collection for your Astro account"
- [ ] Plaintext headline matches HTML
- [ ] Plaintext body matches HTML
- [ ] Plaintext footer matches HTML
- [ ] Subject line unchanged: "You're one step away from collecting deposits"
- [ ] CTA unchanged: "Complete setup →"
- [ ] Lint + type-check pass
- [ ] No logic changes — only string content

## DO NOT
- Modify send timing, deduplication, or query logic
- Add new imports, columns, or telemetry
- Self-test with Playwright — verification is Phase 3
