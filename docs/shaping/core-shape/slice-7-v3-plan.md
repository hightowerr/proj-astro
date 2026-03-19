# V3: Tier Policy Settings

**Goal:** Enable business owners to configure tier-based deposit adjustments and offer loop behavior

**Appetite:** 0.5 day

**Demo:** Navigate to payment policy settings, configure tier overrides (risk deposit $50, waive top tier deposit, exclude risk from offers), save settings, verify persistence

---

## Overview

V3 extends the payment policy settings page with tier-based override controls. Business owners can configure different deposit amounts for risk and top tier customers, waive deposits for reliable customers, and control whether risk tier customers receive slot recovery offers. These settings are stored in `shop_policies` and consumed by V4 (booking pricing) and V5 (offer loop).

### What's Built

- Extend payment policy settings page: `/app/app/settings/payment-policy/page.tsx`
- Tier override form section with 4 inputs:
  - Risk deposit amount (nullable, fallback to base policy)
  - Top tier deposit waived checkbox (default false)
  - Top tier deposit amount (nullable, disabled when waived)
  - Exclude risk from offers checkbox (default false)
- Server action: `updateShopPolicyTierSettings()` (updates tier columns)
- Form validation (amounts must be positive, top deposit < base if not waived)
- Help text explaining each setting
- Visual separation from base policy section

---

## Scope

### In Scope

- Form inputs for tier-based deposit overrides
- Server action to update `shop_policies` tier columns
- Pre-population of current values from database
- Validation for deposit amounts (positive integers)
- Help text explaining tier behavior
- "Tier-based overrides" section in existing payment policy page
- Revalidation after save (show updated values)
- NULL handling (NULL = use base policy)

### Out of Scope

- Database schema changes (already in V1)
- Preview of affected customers (V2 provides visibility)
- Tier assignment UI (automatic, based on scores)
- Manual tier override for specific customers (future)
- Deposit amount suggestions/recommendations (future)
- Tier simulation/preview (future)
- Bulk tier reassignment (automatic via recompute job)

---

## Implementation Steps

### Step 1: Read Existing Payment Policy Page

**File:** `src/app/app/settings/payment-policy/page.tsx`

First, examine the existing structure to understand where to inject the tier settings section:

```bash
# Read existing page to understand current structure
cat src/app/app/settings/payment-policy/page.tsx
```

Expected structure:
- Page uses `requireAuth()` and `getShopByOwnerId()`
- Form with base policy fields (currency, payment mode, deposit amount)
- Server action to update `shop_policies`
- Form validation and revalidation

---

### Step 2: Extend Shop Policies Schema (If Not Already Done in V1)

**File:** `src/lib/schema.ts`

Verify tier columns exist in `shopPolicies` table:

```typescript
// Should already exist from V1:
export const shopPolicies = pgTable("shop_policies", {
  // ... existing base policy columns ...

  // Tier-based deposit overrides (added in V1)
  riskPaymentMode: paymentModeEnum("risk_payment_mode"), // nullable
  riskDepositAmountCents: integer("risk_deposit_amount_cents"), // nullable
  topDepositWaived: boolean("top_deposit_waived").default(false),
  topDepositAmountCents: integer("top_deposit_amount_cents"), // nullable
  excludeRiskFromOffers: boolean("exclude_risk_from_offers").default(false),

  // ... rest of columns ...
});
```

If not present, generate migration:

```bash
pnpm db:generate
pnpm db:migrate
```

---

### Step 3: Create Server Action for Tier Settings

**File:** `src/app/app/settings/payment-policy/actions.ts` (new file or add to existing actions)

```typescript
"use server";

import { db } from "@/lib/db";
import { shopPolicies } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/session";
import { getShopByOwnerId } from "@/lib/queries/shops";

interface TierSettingsInput {
  shopId: string;
  riskDepositAmountCents: number | null;
  topDepositWaived: boolean;
  topDepositAmountCents: number | null;
  excludeRiskFromOffers: boolean;
}

/**
 * Update tier-based policy settings for a shop.
 *
 * NULL values mean "use base policy" (no override).
 * Top deposit amount is ignored if topDepositWaived is true.
 *
 * Validation:
 * - Deposit amounts must be positive integers (if not null)
 * - Top deposit should be ≤ base deposit (warning, not enforced)
 * - Risk deposit typically ≥ base deposit (warning, not enforced)
 */
export async function updateShopPolicyTierSettings(
  input: TierSettingsInput
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify authentication and ownership
    const session = await requireAuth();
    const shop = await getShopByOwnerId(session.user.id);

    if (!shop || shop.id !== input.shopId) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate amounts
    if (
      input.riskDepositAmountCents !== null &&
      input.riskDepositAmountCents < 0
    ) {
      return {
        success: false,
        error: "Risk deposit amount must be positive",
      };
    }

    if (
      input.topDepositAmountCents !== null &&
      input.topDepositAmountCents < 0
    ) {
      return {
        success: false,
        error: "Top tier deposit amount must be positive",
      };
    }

    // If top tier deposit is waived, ignore the amount value
    const topDepositAmountCents = input.topDepositWaived
      ? null
      : input.topDepositAmountCents;

    // Update shop policies
    await db
      .update(shopPolicies)
      .set({
        riskDepositAmountCents: input.riskDepositAmountCents,
        topDepositWaived: input.topDepositWaived,
        topDepositAmountCents: topDepositAmountCents,
        excludeRiskFromOffers: input.excludeRiskFromOffers,
      })
      .where(eq(shopPolicies.shopId, input.shopId));

    // Revalidate page to show updated values
    revalidatePath("/app/settings/payment-policy");

    return { success: true };
  } catch (error) {
    console.error("[updateShopPolicyTierSettings] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

---

### Step 4: Extend Payment Policy Page with Tier Settings UI

**File:** `src/app/app/settings/payment-policy/page.tsx` (modify existing)

Add tier settings section after base policy section:

```typescript
import { updateShopPolicyTierSettings } from "./actions";
// ... existing imports ...

export default async function PaymentPolicyPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return <div>Shop not found</div>;
  }

  // Load current policy
  const policy = await db
    .select()
    .from(shopPolicies)
    .where(eq(shopPolicies.shopId, shop.id))
    .limit(1)
    .then((rows) => rows[0]);

  if (!policy) {
    return <div>Policy not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Payment Policy</h1>
        <p className="text-sm text-muted-foreground">
          Configure deposit requirements and tier-based overrides for {shop.name}.
        </p>
      </header>

      {/* Existing base policy form */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Base Policy</h2>
        <form action={updateBasePolicy}>
          {/* Existing base policy fields: currency, payment mode, deposit amount, cutoff, etc. */}
          {/* ... */}
        </form>
      </section>

      {/* NEW: Tier-based overrides section */}
      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Tier-Based Overrides</h2>
          <p className="text-sm text-muted-foreground">
            Adjust deposit amounts based on customer reliability tiers.
            Leave blank to use base policy.
          </p>
        </div>

        <form
          action={async (formData: FormData) => {
            "use server";
            const result = await updateShopPolicyTierSettings({
              shopId: shop.id,
              riskDepositAmountCents: formData.get("riskDepositAmountCents")
                ? Number(formData.get("riskDepositAmountCents"))
                : null,
              topDepositWaived: formData.get("topDepositWaived") === "on",
              topDepositAmountCents: formData.get("topDepositAmountCents")
                ? Number(formData.get("topDepositAmountCents"))
                : null,
              excludeRiskFromOffers:
                formData.get("excludeRiskFromOffers") === "on",
            });

            if (!result.success) {
              throw new Error(result.error || "Failed to update tier settings");
            }
          }}
          className="space-y-6 rounded-lg border p-6"
        >
          {/* Risk Tier Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Risk Tier</h3>
            <p className="text-xs text-muted-foreground">
              Applies to customers with low payment reliability (score &lt;40 or
              multiple voids in 90 days).
            </p>

            <div className="space-y-2">
              <label htmlFor="riskDepositAmountCents" className="text-sm font-medium">
                Risk Tier Deposit Amount (cents)
              </label>
              <input
                type="number"
                id="riskDepositAmountCents"
                name="riskDepositAmountCents"
                defaultValue={policy.riskDepositAmountCents ?? ""}
                placeholder={`${policy.depositAmountCents} (base policy)`}
                min="0"
                step="1"
                className="w-full rounded border px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Typically higher than base deposit to cover risk. Leave blank to use
                base policy ({policy.depositAmountCents} cents).
              </p>
            </div>
          </div>

          {/* Top Tier Settings */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-medium">Top Tier</h3>
            <p className="text-xs text-muted-foreground">
              Applies to highly reliable customers (score ≥80, no voids in 90 days).
            </p>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="topDepositWaived"
                  defaultChecked={policy.topDepositWaived}
                  className="h-4 w-4 rounded border"
                />
                <span className="font-medium">Waive deposit for top tier customers</span>
              </label>
              <p className="text-xs text-muted-foreground">
                When enabled, top tier customers book without any deposit. This
                incentivizes reliability.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="topDepositAmountCents" className="text-sm font-medium">
                Top Tier Deposit Amount (cents)
              </label>
              <input
                type="number"
                id="topDepositAmountCents"
                name="topDepositAmountCents"
                defaultValue={policy.topDepositAmountCents ?? ""}
                placeholder={`${policy.depositAmountCents} (base policy)`}
                min="0"
                step="1"
                className="w-full rounded border px-3 py-2 text-sm disabled:bg-muted disabled:cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Reduced deposit for top tier (ignored if waived is checked). Leave
                blank to use base policy.
              </p>
            </div>
          </div>

          {/* Offer Loop Settings */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-medium">Slot Recovery Offers</h3>
            <p className="text-xs text-muted-foreground">
              Control whether risk tier customers receive SMS offers when slots become
              available due to cancellations.
            </p>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="excludeRiskFromOffers"
                  defaultChecked={policy.excludeRiskFromOffers}
                  className="h-4 w-4 rounded border"
                />
                <span className="font-medium">
                  Exclude risk tier from slot recovery offers
                </span>
              </label>
              <p className="text-xs text-muted-foreground">
                When enabled, risk tier customers won't receive SMS offers (they can
                still book directly via your booking link). When disabled (default),
                risk tier customers receive offers last (after top and neutral tiers).
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end border-t pt-4">
            <button
              type="submit"
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Save Tier Settings
            </button>
          </div>
        </form>
      </section>

      {/* Info box explaining tiers */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <h3 className="text-sm font-medium mb-2">How Tiers Work</h3>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            <strong>Tiers are assigned automatically</strong> based on customer
            reliability scores (0-100), which are computed nightly from booking
            outcomes over the last 180 days.
          </p>
          <p>
            <strong>Top tier:</strong> Score ≥80 + no voids in 90 days (green badge
            in customer list)
          </p>
          <p>
            <strong>Neutral tier:</strong> Mid-range reliability, default for most
            customers (grey badge)
          </p>
          <p>
            <strong>Risk tier:</strong> Score &lt;40 OR ≥2 voids in 90 days (red badge)
          </p>
          <p className="mt-3">
            View customer tiers and scores in the{" "}
            <a href="/app/customers" className="underline">
              Customers page
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

### Step 5: Add Client-Side Interactivity (Optional Enhancement)

**File:** `src/components/settings/tier-settings-form.tsx` (new file)

For better UX, create a client component that disables the top deposit amount input when "waive deposit" is checked:

```typescript
"use client";

import { useState } from "react";

interface TierSettingsFormProps {
  shopId: string;
  initialValues: {
    riskDepositAmountCents: number | null;
    topDepositWaived: boolean;
    topDepositAmountCents: number | null;
    excludeRiskFromOffers: boolean;
    baseDepositAmountCents: number;
  };
  onSubmit: (formData: FormData) => Promise<void>;
}

export function TierSettingsForm({
  shopId,
  initialValues,
  onSubmit,
}: TierSettingsFormProps) {
  const [topDepositWaived, setTopDepositWaived] = useState(
    initialValues.topDepositWaived
  );

  return (
    <form action={onSubmit} className="space-y-6 rounded-lg border p-6">
      {/* Risk Tier Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Risk Tier</h3>
        <p className="text-xs text-muted-foreground">
          Applies to customers with low payment reliability (score &lt;40 or multiple
          voids in 90 days).
        </p>

        <div className="space-y-2">
          <label
            htmlFor="riskDepositAmountCents"
            className="text-sm font-medium"
          >
            Risk Tier Deposit Amount (cents)
          </label>
          <input
            type="number"
            id="riskDepositAmountCents"
            name="riskDepositAmountCents"
            defaultValue={initialValues.riskDepositAmountCents ?? ""}
            placeholder={`${initialValues.baseDepositAmountCents} (base policy)`}
            min="0"
            step="1"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Typically higher than base deposit to cover risk. Leave blank to use base
            policy ({initialValues.baseDepositAmountCents} cents).
          </p>
        </div>
      </div>

      {/* Top Tier Settings */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-sm font-medium">Top Tier</h3>
        <p className="text-xs text-muted-foreground">
          Applies to highly reliable customers (score ≥80, no voids in 90 days).
        </p>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="topDepositWaived"
              checked={topDepositWaived}
              onChange={(e) => setTopDepositWaived(e.target.checked)}
              className="h-4 w-4 rounded border"
            />
            <span className="font-medium">
              Waive deposit for top tier customers
            </span>
          </label>
          <p className="text-xs text-muted-foreground">
            When enabled, top tier customers book without any deposit. This
            incentivizes reliability.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="topDepositAmountCents" className="text-sm font-medium">
            Top Tier Deposit Amount (cents)
          </label>
          <input
            type="number"
            id="topDepositAmountCents"
            name="topDepositAmountCents"
            defaultValue={initialValues.topDepositAmountCents ?? ""}
            placeholder={`${initialValues.baseDepositAmountCents} (base policy)`}
            min="0"
            step="1"
            disabled={topDepositWaived}
            className="w-full rounded border px-3 py-2 text-sm disabled:bg-muted disabled:cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">
            Reduced deposit for top tier (ignored if waived is checked). Leave blank
            to use base policy.
          </p>
        </div>
      </div>

      {/* Offer Loop Settings */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-sm font-medium">Slot Recovery Offers</h3>
        <p className="text-xs text-muted-foreground">
          Control whether risk tier customers receive SMS offers when slots become
          available due to cancellations.
        </p>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="excludeRiskFromOffers"
              defaultChecked={initialValues.excludeRiskFromOffers}
              className="h-4 w-4 rounded border"
            />
            <span className="font-medium">
              Exclude risk tier from slot recovery offers
            </span>
          </label>
          <p className="text-xs text-muted-foreground">
            When enabled, risk tier customers won't receive SMS offers (they can still
            book directly via your booking link). When disabled (default), risk tier
            customers receive offers last (after top and neutral tiers).
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end border-t pt-4">
        <button
          type="submit"
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Save Tier Settings
        </button>
      </div>
    </form>
  );
}
```

Then use this component in the page:

```typescript
// In page.tsx
import { TierSettingsForm } from "@/components/settings/tier-settings-form";

// In the tier section:
<TierSettingsForm
  shopId={shop.id}
  initialValues={{
    riskDepositAmountCents: policy.riskDepositAmountCents,
    topDepositWaived: policy.topDepositWaived,
    topDepositAmountCents: policy.topDepositAmountCents,
    excludeRiskFromOffers: policy.excludeRiskFromOffers,
    baseDepositAmountCents: policy.depositAmountCents,
  }}
  onSubmit={async (formData: FormData) => {
    "use server";
    // ... same submit logic as before
  }}
/>
```

---

## Testing Checklist

### Manual Testing

1. **Navigate to settings page:**
   ```bash
   # Start dev server (or ask user)
   # Navigate to /app/settings/payment-policy
   ```

2. **Verify form renders:**
   - ✅ "Tier-Based Overrides" section visible
   - ✅ Risk deposit amount input
   - ✅ Top deposit waived checkbox
   - ✅ Top deposit amount input
   - ✅ Exclude risk from offers checkbox
   - ✅ Help text for each field
   - ✅ "How Tiers Work" info box

3. **Test risk deposit override:**
   - Enter 5000 (50.00 in base currency)
   - Submit form
   - Refresh page → value persists
   - Check DB: `shop_policies.risk_deposit_amount_cents = 5000`

4. **Test top deposit waived:**
   - Check "Waive deposit for top tier"
   - Verify top deposit amount input becomes disabled
   - Submit form
   - Check DB: `shop_policies.top_deposit_waived = true`
   - Check DB: `shop_policies.top_deposit_amount_cents = NULL` (ignored)

5. **Test top deposit amount:**
   - Uncheck "Waive deposit"
   - Enter 1000 (10.00 in base currency)
   - Submit form
   - Refresh page → value persists
   - Check DB: `shop_policies.top_deposit_amount_cents = 1000`

6. **Test exclude risk from offers:**
   - Check "Exclude risk tier from slot recovery offers"
   - Submit form
   - Check DB: `shop_policies.exclude_risk_from_offers = true`

7. **Test NULL handling (fallback to base):**
   - Clear risk deposit amount (leave blank)
   - Submit form
   - Check DB: `shop_policies.risk_deposit_amount_cents = NULL`
   - Verify booking flow uses base policy for risk tier (V4 testing)

8. **Test validation:**
   - Enter negative number in risk deposit → error shown
   - Enter negative number in top deposit → error shown
   - Enter valid values → save succeeds

9. **Test persistence across sessions:**
   - Configure settings
   - Log out
   - Log back in
   - Navigate to settings → values still present

10. **Test visual separation:**
    - Base policy section clearly separated from tier overrides
    - Headings distinguish sections
    - Border/spacing creates visual hierarchy

### Database Verification

```bash
# Open Drizzle Studio
pnpm db:studio

# Verify shop_policies table shows:
# - risk_deposit_amount_cents (nullable integer)
# - top_deposit_waived (boolean, default false)
# - top_deposit_amount_cents (nullable integer)
# - exclude_risk_from_offers (boolean, default false)

# After saving settings, verify values match form inputs
```

---

## Acceptance Criteria

- ✅ Tier override section added to payment policy page
- ✅ Four form inputs render correctly (risk deposit, top waived, top deposit, exclude risk)
- ✅ Current values pre-populate from database
- ✅ Server action updates `shop_policies` tier columns
- ✅ Form validation prevents negative deposit amounts
- ✅ Top deposit amount ignored when "waived" is checked
- ✅ NULL values properly handled (fallback to base policy)
- ✅ Page revalidates after save (shows updated values without manual refresh)
- ✅ Help text explains each setting clearly
- ✅ "How Tiers Work" info box provides context
- ✅ Link to customer list page for viewing tiers
- ✅ Visual separation from base policy section
- ✅ Responsive layout on mobile/desktop
- ✅ Authentication required (uses `requireAuth()`)
- ✅ Shop ownership verified (uses `getShopByOwnerId()`)

---

## Dependencies

**Required:**
- V1: `shop_policies` table with tier columns
- V1: Database migration applied
- V2: Customer list page (linked in help text)
- Existing: Payment policy page structure
- Existing: `requireAuth()`, `getShopByOwnerId()` functions

**Provides to:**
- V4: Tier settings used to calculate booking deposit amounts
- V5: `excludeRiskFromOffers` setting used in offer loop logic

---

## Cut Strategy

If time runs short:

**Must have:**
- ✅ Tier override form inputs (risk deposit, top waived, top deposit, exclude risk)
- ✅ Server action to save settings
- ✅ Basic validation

**Nice to have:**
- Client-side checkbox interaction (disable top deposit when waived)
- "How Tiers Work" info box (can add later)
- Help text for each field (can simplify)
- Link to customer list page

**Can cut entirely:**
- Visual polish (spacing, borders, colors)
- Advanced validation (can just check positive numbers)
- Form error messages (can rely on browser validation)

Backend persistence is more important than polish. V4 and V5 depend on these settings.

---

## Design Principles

### Configuration Flexibility

- **NULL = use base policy:** Shop owners can opt-in to overrides selectively
- **Per-tier control:** Risk and top tiers configured independently
- **Offer loop toggle:** Exclude vs. deprioritize gives business choice
- **No forced adoption:** Default behavior keeps existing flow (no tier pricing)

### Clear Explanations

- **Each setting has help text:** Explains what the setting does
- **Tier criteria documented:** Score thresholds and void count rules visible
- **Link to customer list:** Business owners can see who's affected
- **No mystery:** Transparent about how tiers are assigned

### Safe Defaults

- **Top deposit waived = false:** Don't waive deposits by default
- **Exclude risk = false:** Give everyone a chance, just prioritize by tier
- **NULL amounts:** Fallback to base policy if not configured
- **Non-destructive:** Settings don't affect existing bookings (V5 snapshots policy)

---

## Security Notes

- Server action requires authentication (`requireAuth()`)
- Shop ownership verified before update (`getShopByOwnerId()`)
- Validation prevents negative amounts (business logic constraint)
- No SQL injection (Drizzle ORM parameterized queries)
- Settings scoped per-shop (no cross-shop data access)

---

## UI/UX Notes

### Form Layout

```
┌─────────────────────────────────────┐
│ Base Policy                         │
│ [existing fields: currency, mode,   │
│  deposit, cutoff, etc.]             │
│ [Save Base Policy]                  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Tier-Based Overrides                │
│                                     │
│ Risk Tier                           │
│ [Risk deposit amount input]         │
│ Help: Typically higher than base... │
│                                     │
│ ─────────────────────────────────   │
│                                     │
│ Top Tier                            │
│ [✓] Waive deposit for top tier      │
│ Help: Top tier books without...    │
│ [Top deposit amount] (disabled)     │
│ Help: Reduced deposit for...       │
│                                     │
│ ─────────────────────────────────   │
│                                     │
│ Slot Recovery Offers                │
│ [✓] Exclude risk tier from offers   │
│ Help: When enabled, risk tier...   │
│                                     │
│ [Save Tier Settings]                │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ How Tiers Work                      │
│ [explanation of tier assignment]    │
│ [link to customer list page]        │
└─────────────────────────────────────┘
```

### Visual Hierarchy

- **Section headings:** Differentiate base policy from tier overrides
- **Subsection headings:** Risk Tier, Top Tier, Slot Recovery Offers
- **Borders:** Separate subsections visually
- **Help text:** Muted color, smaller font size
- **Input grouping:** Label + input + help text for each setting

---

## Rollback Plan

If V3 causes issues:

1. **Settings are additive:** No changes to base policy logic
2. **NULL = safe:** Tier columns default to NULL (use base policy)
3. **Can disable:** Set all tier columns to NULL via DB
4. **No breaking changes:** V4 and V5 handle NULL gracefully

V3 has zero impact until V4 (booking pricing) is shipped. Settings just sit in database.

---

## Future Enhancements (Out of Scope)

- **Preview affected customers:** Show count of customers in each tier before saving
- **Deposit recommendations:** Suggest amounts based on historical data
- **A/B testing:** Test different tier settings to optimize revenue vs. no-shows
- **Per-tier cutoff times:** Different cancellation windows for each tier
- **Tier simulation:** Preview what tier a customer would have with different thresholds
- **Manual tier override:** Force specific customer to specific tier (override auto-assignment)
- **Tier notification:** Email business owner when customer tier changes

---

## Integration Points

### V4: Booking Tier Pricing

V4 reads these settings to determine deposit amount:

```typescript
// Pseudocode from V4
const tier = await loadCustomerScore(customerId, shopId);
const policy = await getShopPolicy(shopId);

let depositAmountCents;
if (tier === "risk" && policy.riskDepositAmountCents !== null) {
  depositAmountCents = policy.riskDepositAmountCents;
} else if (tier === "top" && policy.topDepositWaived) {
  depositAmountCents = 0;
} else if (tier === "top" && policy.topDepositAmountCents !== null) {
  depositAmountCents = policy.topDepositAmountCents;
} else {
  depositAmountCents = policy.depositAmountCents; // base policy
}
```

### V5: Offer Loop Prioritization

V5 reads `excludeRiskFromOffers` setting:

```typescript
// Pseudocode from V5
const policy = await getShopPolicy(shopId);
const customers = await getEligibleCustomers(slotOpeningId);

if (policy.excludeRiskFromOffers) {
  // Filter out risk tier
  customers = customers.filter((c) => c.tier !== "risk");
} else {
  // Include risk tier but deprioritize (sort last)
  customers.sort(tierPriority); // top=1, neutral=2, risk=3
}
```

---

## Performance Considerations

- Single UPDATE query (fast, no loops)
- Revalidation uses Next.js cache (efficient)
- No customer queries (just shop_policies row)
- Settings cached per-request (no repeated DB hits)
- Form submission is synchronous (good UX feedback)

---

## Accessibility Notes

- Form labels properly associated with inputs
- Help text uses `aria-describedby` (implicit via proximity)
- Checkbox labels are clickable (wraps input)
- Color is not the only indicator (text also explains)
- Keyboard navigation supported (native form elements)

---

## Notes

### Why NULL Instead of 0?

Using NULL for "not configured" instead of 0 for "no deposit" makes the intent clear:
- NULL = "use base policy"
- 0 = "explicitly charge $0"

This distinction is important for top tier:
- `topDepositWaived = true` → explicitly waive (charge $0)
- `topDepositAmountCents = NULL` → use base policy

### Why Separate Form from Base Policy?

Tier settings are conceptually different from base policy:
- Base policy applies to all customers (default)
- Tier overrides apply selectively (based on reliability)
- Separation makes it clear that tier settings are optional enhancements

### Why Default Exclude Risk = False?

Default behavior is inclusive (everyone gets offers, just prioritized by tier):
- More inclusive (risk customers aren't permanently excluded)
- SMS budget concern is opt-in (shop can enable if needed)
- Aligns with "give everyone a chance" philosophy

---

## Next Steps

After V3 ships:

1. Verify settings persist correctly in production database
2. Monitor usage (do shops enable tier overrides?)
3. Gather feedback on default values and help text
4. Begin V4: Booking Tier Pricing (apply these settings to payment intents)
5. Begin V5: Offer Loop Prioritization (use exclude setting in offer logic)
