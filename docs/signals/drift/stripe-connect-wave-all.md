# Stripe Connect — Drift Audit (All Waves)

Date: 2026-06-29
Feature: stripe-connect
Waves: 1–4 (all)

## Quality Ratchet

**Evolution/Shortcut ratio: 20 / 23 (53.5% shortcuts — FLAGGED)**
**Resolution: All 23 shortcuts fixed (2026-06-29). 0 remaining.**

Shortcuts were concentrated in three areas (all now resolved):
1. **Visual polish** (spec 10): watermark icons, accent stripes, progress stacking, typography sizing
2. **Payment card UX** (spec 12): Stripe Connect badge, footer, transfer_data-based state routing
3. **Email template** (spec 16): plain text fallback, footer, dark mode, responsive breakpoints, logo

---

## EVOLUTION (20 items — accepted)

| Spec | What diverged | Why |
|------|--------------|-----|
| 01/02 | Migration filename `0035_stripe_connect_columns.sql` (spec said `0035_stripe_connect.sql`) | More descriptive, distinguishes from future migrations |
| 05 | try/catch + structured error logging on all 4 API routes | Defensive production-grade error handling |
| 06 | Error redirect uses `?error=no-account` query param | More specific error signaling for UI |
| 07 | 404 response for missing shop | Edge case the spec didn't address |
| 08 | Descriptive error messages on 400/404 | Better DX/debugging |
| 09 | Transaction wrapping for dedup + status update | Prevents atomicity race conditions |
| 09 | `export const runtime = "nodejs"` | Necessary for raw body access in webhook |
| 09 | `Response.json()` instead of `NextResponse.json()` | Leaner, functionally identical |
| 09 | Specific error for secret-not-configured | Clear operator signal |
| 10 | Card max-width `max-w-2xl` (672px) instead of 560px | May be better in context; borderline |
| 10 | Confirmation banner omits "This card won't show again" | Cleaner — no meta-UI copy |
| 10 | `aria-valuemin` added to progressbar | More accessible than spec required |
| 11 | Nav includes existing "Reminders" link (spec didn't mention it) | Preserving real navigation; spec described mock state |
| 11 | Glow ring via padding/margin hack | Same visual result, simpler CSS |
| 14 | `depositSkipped` logic centralized in `createAppointment()` | Better than scattering across booking page renders |
| 15 | `<Link>` instead of `<Button>` for navigation CTA | Semantically correct for page navigation |
| 15 | Body text `text-amber-800/80` instead of hardcoded `#8a5a2a` | Tailwind scale more maintainable |
| 16 | `messageDedup` table instead of `connectReengagementSentAt` column | Generic, reusable across future email types |
| 16 | `between()` operand order correct (48h, 24h) — not a divergence | Verified correct |

## SHORTCUT (23 items — ALL RESOLVED)

### Critical (4/4 fixed)

| Spec | What diverged | Resolution |
|------|--------------|------------|
| 12 | Fee state routing used `amountCents > 0` instead of checking `transfer_data` | ✅ Fixed — `determineFeeState()` now accepts `isConnectPayment` boolean; caller derives from `paymentMetadata.connectedAccountId` |
| 12 | Payment card received no `depositSkipped` prop | ✅ Fixed — `depositSkipped` prop added to `PaymentCardProps`; routes skipped vs policy correctly |
| 09 | Webhook read `process.env` directly instead of validated `env.ts` | ✅ Fixed — imports `getServerEnv()` from `@/lib/env` |
| 04 | `checkEnv()` only warned in dev, no production enforcement | ✅ Fixed — throws `Error` in production when secret missing |

### Medium (15/15 fixed)

| Spec | What diverged | Resolution |
|------|--------------|------------|
| 10 | Missing `credit_card` watermark icon in State 1 | ✅ Fixed — 150px icon at 6% opacity, positioned absolute top-right |
| 10 | Missing 4px left-edge accent stripe on pending/verifying | ✅ Fixed — `borderLeftWidth: 4` applied to pending, verifying, and connected states |
| 10 | `bg-white` instead of `bg-al-surface-lowest` | ✅ Fixed — uses `bg-al-surface-lowest` |
| 10 | Bridge link `text-sm font-medium` instead of `15px weight 800` | ✅ Fixed — inline `fontSize: "15px"` + `font-extrabold` |
| 10 | Success icon missing 38px background circle | ✅ Fixed — 38px `rounded-full` span with `al-status-positive-bg` |
| 10 | Mobile progress steps don't stack vertically | ✅ Fixed — `flex-col sm:flex-row` |
| 10 | Confirmation banner doesn't auto-fade | ✅ Fixed — 4s visible + 500ms fade, removes itself via sessionStorage |
| 11 | Mobile hamburger has no functional drawer menu | ✅ Fixed — full drawer with backdrop, slide animation, escape key, scroll lock |
| 12 | Missing "Stripe Connect" badge header | ✅ Fixed — `credit_card` icon + "Stripe Connect" label |
| 12 | Missing "Payout routed to your connected bank account" footer | ✅ Fixed — footer text with `north_east` icon |
| 12 | Payment status not styled as pill/badge | ✅ Fixed — `StatusBadge` component with rounded-full pill, per-status colors |
| 15 | Missing `role="region"` and `aria-label="Payment setup required"` | ✅ Fixed — all three card tiers have `role="region" aria-label="Payment setup required"` |
| 15 | Heading 16px/600 instead of 18px/800 | ✅ Fixed — `text-lg font-extrabold` |
| 15 | Count not in mono 21px `al-status-caution` | ✅ Fixed — `font-mono font-bold` with inline `fontSize: "21px"` and caution color |
| 17 | Post-first-booking inline prompt not implemented | ✅ Fixed — contextual amber banner on appointments page with count and Connect link |

### Low (4/4 fixed)

| Spec | What diverged | Resolution |
|------|--------------|------------|
| 06 | Refresh route missing try/catch | ✅ Fixed — try/catch with redirect to `?error=refresh-failed` |
| 16 | Missing plain text fallback | ✅ Fixed — `text` field passed to `sendEmail()` |
| 16 | Missing email footer (transactional disclaimer) | ✅ Fixed — compliance footer added |
| 16 | Missing dark mode support | ✅ Fixed — `@media (prefers-color-scheme: dark)` + `[data-ogsc]` overrides |
| 16 | Missing responsive breakpoints + full-width CTA | ✅ Fixed — `@media (max-width: 600px)` with full-width `.em-cta` |
| 16 | Missing Astro logo/wordmark | ✅ Fixed — text-based wordmark (better for email deliverability than image) |
