# Marketing "How to Edit" Guide

## Overview
This guide is for the **Marketing Team** to understand which parts of the Astro product they can edit and how to do so without touching the code.

## 1. Changing Copy
### Landing Page
- **Tool**: Sanity Studio (refer to [Sanity Content Guidelines](./SANITY-GUIDELINES.md)).
- **What can be edited**: Headlines, sub-headlines, feature descriptions, FAQ items.

### Product Dashboard (Internal)
- **Tool**: Database or Dashboard Settings (for some values).
- **What can be edited**: Labels, feature names, "Coming Soon" banners.

## 2. Managing Pricing & Policies
### Tier Pricing
- **Location**: `src/lib/tier-pricing.ts` (currently code-defined, target for CMS).
- **Current Edit Strategy**: Coordinate with the dev team to update tiers:
  - `top`: score >= 80, no voids in 90 days.
  - `neutral`: default.
  - `risk`: score < 40, >= 2 voids in 90 days.

### Cancellation Policies
- **Location**: `/app/settings/payment-policy`.
- **Action**: Dashboard owners (shop owners) can change their own deposit amounts and cutoff windows. Marketing can define the **defaults** in the shop onboarding flow.

## 3. Managing SMS Templates
- **Channel**: Twilio (production) / `src/app/api/twilio/inbound` (code).
- **Editable Copy**:
  - Slot Offer: "A slot opened tomorrow at 10:30. Reply YES to book."
  - Confirmation: "Booking Confirmed! You've paid a £X deposit."

## 4. Visual Identity
### Design Tokens
- **Font**: Inter (Next.js font).
- **Color Palette**:
  - `primary`: #3D8B8B (Teal)
  - `accent-coral`: #F4A58A (Coral CTA)
  - `bg-dark`: #1A1D21 (Dark background)

## 5. Deployment Workflow
After making content changes in Sanity:
1. **Push "Publish"** in Sanity Studio.
2. **Webhook** triggers a Vercel re-build (or uses ISR to update immediately).
3. **Wait 1-2 minutes** for the live site to update.

---
*For branding assets, logos, and high-res photography, refer to the Figma Design File (link in #marketing-astro).*
