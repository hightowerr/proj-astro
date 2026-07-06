# 03 — HTML Footer: Remove "Stripe Connect onboarding" Reference

## Summary
Replace the footer's process-specific claim with outcome-anchored language. Users who never reached Stripe shouldn't see "you started Stripe Connect onboarding."

## Prerequisites
- Depends on: spec 16 implemented (`connect-reengagement/route.ts` exists and is deployed)

## Design reference
**Prototype:** [`Email Connect Reengagement Standalone.html`](Email%20Connect%20Reengagement%20Standalone.html)

The design prototype already uses the correct footer copy ("setting up deposit collection"). The current code (`route.ts:117`) deviates from the design — this spec aligns the code with the design.

## Change

**File:** `src/app/api/jobs/connect-reengagement/route.ts`
**Location:** HTML template, line ~117

**Before (current code):**
```
You're receiving this email because you started Stripe Connect onboarding for your Astro account.
```

**After (matches design prototype):**
```
You're receiving this because you began setting up deposit collection for your Astro account. This is a transactional account-setup message.
```

### Design details (from prototype)

**Footer block:**

| Property | Value |
|----------|-------|
| Margin top | 40px |
| Padding top | 20px |
| Border top | 1px solid `{{ cHair }}` |

**Footer text:**

| Property | Value |
|----------|-------|
| Font size | 11.5px |
| Line height | 1.6 |
| Color (light) | `#737780` (cFaint) |
| Color (dark) | `#7c828c` (cFaint) |
| Margin | 0 |

**Brand footer (below footer text):**

| Property | Value |
|----------|-------|
| Layout | flex, align-items center, gap 8px, margin-top 12px |
| Wordmark | font-size 10px, weight 800, letter-spacing .14em, uppercase |
| Tagline | font-size 11px |
| Color | cFaint (same as footer text) |
| Copy | "Astro" + "Stop losing money to no-shows." |

### Hair/divider color tokens

| Token | Light | Dark |
|-------|-------|------|
| cHair | `rgba(195,198,209,.45)` | `rgba(255,255,255,.10)` |

## Rationale
- "Stripe Connect onboarding" is internal jargon. The user's mental model is "setting up deposits," not "onboarding onto a payment platform."
- Eliminates Curse of Knowledge (projecting system internals onto user experience).
- The design prototype already carries the correct copy — this spec closes the gap between design and code.

## Acceptance
- HTML email footer reads "You're receiving this because you began setting up deposit collection for your Astro account. This is a transactional account-setup message."
- Brand footer: "ASTRO · Stop losing money to no-shows."
- Typography matches design prototype: 11.5px / line-height 1.6 / cFaint color
