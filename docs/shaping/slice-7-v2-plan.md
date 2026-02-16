# V2: Customer List Dashboard

**Goal:** Make customer reliability scores visible to business owners with transparent, data-driven explanations

**Appetite:** 0.5 day

**Demo:** Navigate to `/app/customers`, see all customers with tier badges, scores, and concrete reliability stats

---

## Overview

V2 creates the customer list dashboard where business owners can view reliability scores and tier assignments. This page makes the scoring engine (V1) visible and actionable, showing exactly why each customer has their assigned tier with concrete stats like "Settled: 6, Voided: 0, Late cancels: 1" instead of vague AI messaging.

### What's Built

- Customer list page: `/app/app/customers/page.tsx`
- Query function: `listCustomersForShop()` in `/lib/queries/customers.ts`
- TierBadge component (color-coded: top=green, neutral=grey, risk=red)
- Score display (0-100 or "—" for customers without history)
- Reliability explanation (concrete stats from customer_scores.stats)
- Link to customer detail page (future enhancement)

---

## Scope

### In Scope

- New customer list page with table UI
- LEFT JOIN to customer_scores (handles customers without scores)
- Tier badge with visual color coding
- Score display with null handling
- Human-readable reliability stats
- Sort by score (scored customers first, then by score descending)
- Responsive table layout
- Empty state for shops with no customers
- "Insufficient history" message for unscored customers

### Out of Scope

- Customer detail page (future, referenced but not built)
- Filters/search (future enhancement)
- Export to CSV (future)
- Score history/trending (future)
- Tier change notifications (future)
- Inline tier override (V3 handles policy settings)

---

## Implementation Steps

### Step 1: Customer Query

**File:** `src/lib/queries/customers.ts` (new file)

```typescript
import { db } from "@/lib/db";
import { customers, customerScores } from "@/lib/schema";
import { eq, desc, isNull, sql } from "drizzle-orm";

export interface CustomerWithScore {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  createdAt: Date;
  score: number | null;
  tier: "top" | "neutral" | "risk" | null;
  stats: {
    settled: number;
    voided: number;
    refunded: number;
    lateCancels: number;
    lastActivityAt: string | null;
    voidedLast90Days: number;
  } | null;
  computedAt: Date | null;
}

/**
 * List all customers for a shop with their reliability scores.
 *
 * Joins customer_scores to show tier/score/stats.
 * Customers without scores show null values (new customers).
 *
 * Sorted by:
 * 1. Scored customers first (score IS NOT NULL)
 * 2. Score descending (highest scores first)
 * 3. Customer name alphabetically
 *
 * @param shopId - Shop UUID
 * @returns Array of customers with scores
 */
export async function listCustomersForShop(
  shopId: string
): Promise<CustomerWithScore[]> {
  const results = await db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      createdAt: customers.createdAt,
      score: customerScores.score,
      tier: customerScores.tier,
      stats: customerScores.stats,
      computedAt: customerScores.computedAt,
    })
    .from(customers)
    .leftJoin(
      customerScores,
      eq(customerScores.customerId, customers.id)
    )
    .where(eq(customers.shopId, shopId))
    .orderBy(
      // Scored customers first
      sql`CASE WHEN ${customerScores.score} IS NULL THEN 1 ELSE 0 END`,
      // Then by score descending
      desc(customerScores.score),
      // Then by name
      customers.name
    );

  return results.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    createdAt: row.createdAt,
    score: row.score,
    tier: row.tier,
    stats: row.stats as CustomerWithScore["stats"],
    computedAt: row.computedAt,
  }));
}
```

---

### Step 2: TierBadge Component

**File:** `src/components/customers/tier-badge.tsx` (new file)

```typescript
import type { Tier } from "@/lib/scoring";

interface TierBadgeProps {
  tier: Tier | null;
}

/**
 * Color-coded badge for customer tier.
 *
 * Colors:
 * - Top tier: Green (reliable, high score, no voids)
 * - Neutral tier: Grey (default, mid-range score)
 * - Risk tier: Red (low score or multiple voids)
 * - No tier: Grey with dashed border (no history yet)
 */
export function TierBadge({ tier }: TierBadgeProps) {
  if (tier === null) {
    return (
      <span className="inline-flex rounded-full border border-dashed px-2 py-1 text-xs font-medium text-muted-foreground">
        —
      </span>
    );
  }

  const styles = {
    top: "bg-green-100 text-green-800",
    neutral: "bg-muted text-muted-foreground",
    risk: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${styles[tier]}`}
    >
      {tier}
    </span>
  );
}
```

---

### Step 3: Reliability Stats Display

**File:** `src/components/customers/reliability-stats.tsx` (new file)

```typescript
interface ReliabilityStatsProps {
  stats: {
    settled: number;
    voided: number;
    refunded: number;
    lateCancels: number;
    lastActivityAt: string | null;
    voidedLast90Days: number;
  } | null;
}

/**
 * Human-readable reliability statistics.
 *
 * Shows concrete counts instead of vague descriptions.
 * Examples:
 * - "Settled: 6, Voided: 0, Late cancels: 1"
 * - "Insufficient history"
 *
 * No "AI decided" or black-box language. Full transparency.
 */
export function ReliabilityStats({ stats }: ReliabilityStatsProps) {
  if (!stats) {
    return (
      <span className="text-xs text-muted-foreground">
        Insufficient history
      </span>
    );
  }

  const { settled, voided, refunded, lateCancels } = stats;
  const total = settled + voided + refunded + lateCancels;

  if (total === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        Insufficient history
      </span>
    );
  }

  // Build parts array (only show non-zero counts)
  const parts: string[] = [];

  if (settled > 0) {
    parts.push(`Settled: ${settled}`);
  }
  if (voided > 0) {
    parts.push(`Voided: ${voided}`);
  }
  if (refunded > 0) {
    parts.push(`Refunded: ${refunded}`);
  }
  if (lateCancels > 0) {
    parts.push(`Late cancels: ${lateCancels}`);
  }

  return (
    <span className="text-xs text-muted-foreground">
      {parts.join(", ")}
    </span>
  );
}
```

---

### Step 4: Customer List Page

**File:** `src/app/app/customers/page.tsx` (new file)

```typescript
import Link from "next/link";
import { listCustomersForShop } from "@/lib/queries/customers";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { requireAuth } from "@/lib/session";
import { TierBadge } from "@/components/customers/tier-badge";
import { ReliabilityStats } from "@/components/customers/reliability-stats";

export default async function CustomersPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return (
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold">Customers</h1>
        <p className="text-sm text-muted-foreground">
          Create your shop to start managing customers.
        </p>
      </div>
    );
  }

  const customers = await listCustomersForShop(shop.id);

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Customers</h1>
        <p className="text-sm text-muted-foreground">
          Reliability scores and tier assignments for {shop.name}.
        </p>
      </header>

      {customers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No customers yet. Share your booking link to get started.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Contact</th>
                <th className="px-4 py-2 font-medium">Tier</th>
                <th className="px-4 py-2 font-medium">Score</th>
                <th className="px-4 py-2 font-medium">Reliability</th>
                <th className="px-4 py-2 font-medium">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-medium">{customer.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-muted-foreground">
                      {customer.email ?? customer.phone}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TierBadge tier={customer.tier} />
                  </td>
                  <td className="px-4 py-3">
                    {customer.score !== null ? (
                      <span className="font-medium">{customer.score}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ReliabilityStats stats={customer.stats} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {customer.computedAt
                      ? new Date(customer.computedAt).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-lg border bg-muted/50 p-4">
        <h3 className="text-sm font-medium mb-2">Understanding Tiers</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            <span className="font-medium text-green-800">Top tier:</span> Highly
            reliable customers (score ≥80, no voids in 90 days)
          </p>
          <p>
            <span className="font-medium">Neutral tier:</span> Default tier for
            most customers (mid-range reliability)
          </p>
          <p>
            <span className="font-medium text-red-800">Risk tier:</span> Low
            reliability (score &lt;40 or multiple voids in 90 days)
          </p>
          <p className="mt-2">
            Scores are updated nightly based on booking outcomes over the last
            180 days.
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

### Step 5: Add Navigation Link

**File:** `src/app/app/layout.tsx` (or existing navigation component)

Add link to customers page in the dashboard navigation:

```typescript
// Example navigation structure (adapt to your existing nav)
<nav>
  <Link href="/app/appointments">Appointments</Link>
  <Link href="/app/customers">Customers</Link>
  <Link href="/app/settings">Settings</Link>
</nav>
```

---

## Testing Checklist

### Manual Testing

1. **Setup test data:**
   ```bash
   # Run V1 recompute job to populate scores
   curl -X POST http://localhost:3000/api/jobs/recompute-scores \
     -H "x-cron-secret: $CRON_SECRET"
   ```

2. **Navigate to page:**
   - Log in as shop owner
   - Click "Customers" in navigation
   - Verify page loads

3. **Verify customer list:**
   - Table shows all customers
   - Scored customers appear first
   - Sorted by score descending within scored customers
   - Unscored customers at bottom

4. **Verify tier badges:**
   - Top tier: green badge
   - Neutral tier: grey badge
   - Risk tier: red badge
   - No tier: dashed border, grey "—"

5. **Verify score display:**
   - Customers with scores show number (0-100)
   - Customers without scores show "—"
   - Scores match database values

6. **Verify reliability stats:**
   - Stats show concrete counts: "Settled: 6, Voided: 0, Late cancels: 1"
   - Only non-zero counts displayed
   - No stats → "Insufficient history"
   - Stats match customer_scores.stats JSON

7. **Verify last updated:**
   - Shows computedAt date
   - Null → "—"
   - Format is human-readable

8. **Test empty states:**
   - Shop with no customers → "No customers yet" message
   - Shop with customers but no scores → "Insufficient history" for each

9. **Test responsive layout:**
   - Desktop: full table visible
   - Mobile: table scrolls horizontally
   - No layout breaks

### Visual Testing

- **Tier badge colors:**
  - Top: `bg-green-100 text-green-800`
  - Neutral: `bg-muted text-muted-foreground`
  - Risk: `bg-red-100 text-red-800`

- **Table styling:**
  - Header: `bg-muted/50`
  - Rows: border between rows
  - Proper padding and spacing

- **Info box:**
  - "Understanding Tiers" section at bottom
  - Clear explanations for each tier
  - Mentions nightly update schedule

---

## Acceptance Criteria

- ✅ `/app/app/customers/page.tsx` page exists and renders
- ✅ `listCustomersForShop()` query returns all customers with scores
- ✅ LEFT JOIN handles customers without scores (null values)
- ✅ Customers sorted by: scored first, then score desc, then name
- ✅ TierBadge component displays correct colors
- ✅ Score displays 0-100 for scored customers, "—" for unscored
- ✅ ReliabilityStats shows concrete counts, not vague language
- ✅ "Insufficient history" shown when stats is null or total=0
- ✅ Last updated column shows computedAt date or "—"
- ✅ Empty state shown when no customers exist
- ✅ "Understanding Tiers" info box explains tier criteria
- ✅ Table is responsive and scrollable on mobile
- ✅ Navigation link added to dashboard menu
- ✅ Page requires authentication (uses requireAuth)
- ✅ Shop ownership verified (uses getShopByOwnerId)

---

## Dependencies

**Required:**
- V1: customer_scores table populated with data
- V1: Recompute job has run at least once
- Existing: requireAuth(), getShopByOwnerId() functions
- Existing: customers table with name, email, phone

**Provides to:**
- V3: Visibility into current tier distribution before configuring overrides
- V4: Business owners can see which customers will be affected by tier pricing
- V5: Understanding of customer base for offer loop prioritization

---

## Cut Strategy

If time runs short:

**Must have:**
- ✅ Customer list page with tier badges and scores
- ✅ Basic query and display logic
- ✅ TierBadge component with correct colors

**Nice to have:**
- ReliabilityStats component (can show raw JSON temporarily)
- "Understanding Tiers" info box (can add later)
- Responsive mobile styling (desktop-first acceptable)

**Can cut entirely:**
- Navigation link (users can type URL directly)
- Last updated column (not critical for MVP)

Page functionality is more important than polish. Business owners need to see the data.

---

## Design Principles

### Transparency First

- **NO vague language:** Avoid "AI decided" or "algorithm determined"
- **Show concrete data:** "Settled: 6, Voided: 0" instead of "Good reliability"
- **Explain tiers clearly:** Exact score thresholds and void count rules
- **No mystery:** Formula is documented in "Understanding Tiers" section

### Data-Driven Decisions

- Scores are deterministic (same data → same score)
- Tier rules are transparent (score ≥80 + no voids = top)
- Stats show ground truth (actual appointment outcomes)
- Business owners can verify the math

### User-Friendly Display

- Color coding for quick scanning (green=good, red=risk)
- Sorted by most reliable first
- "—" for missing data (better than "N/A" or "null")
- Human-readable dates and numbers

---

## UI Polish Notes

**Current implementation:**
- Clean, minimal table design
- Consistent with existing appointments page
- Uses existing design system (muted colors, borders, spacing)

**Future enhancements:**
- Customer detail page (click row to see full history)
- Search and filters (by tier, score range, name)
- Export to CSV for analysis
- Score trend indicators (↑↓ since last week)
- Inline actions (adjust tier, view bookings)

---

## Rollback Plan

If V2 causes issues:

1. **Remove navigation link** (users can't access page)
2. **Keep page** (harmless, just not linked)
3. **Keep query** (no side effects, read-only)

V2 is purely read-only. No writes to database, no side effects. Safe to deploy.

---

## Notes

### Performance Considerations

- Query is efficient (single JOIN, indexed columns)
- Pagination not needed yet (most shops have <1000 customers)
- Future: Add pagination when customer count grows

### Security Notes

- Requires authentication via `requireAuth()`
- Shop ownership verified via `getShopByOwnerId()`
- Scores are scoped per-shop (no cross-shop data leakage)
- No customer phone/email exposed in URL (privacy)

### Accessibility Notes

- Table has proper semantic markup (`<thead>`, `<tbody>`, `<th>`)
- Color is not the only indicator (tier name also shown)
- Text contrast meets WCAG AA standards
- Keyboard navigation supported (native table behavior)

### Future Enhancements (Out of Scope)

- Click customer name → detail page with full booking history
- Inline tier override (manual tier assignment)
- Score history chart (trend over time)
- Bulk actions (export selected, message group)
- Filters (show only risk tier, score <50, etc.)
- Search by name, email, or phone

---

## Next Steps

After V2 ships:

1. Gather feedback from business owners
2. Verify tier badge colors are intuitive
3. Check if reliability stats are clear enough
4. Monitor query performance with real data
5. Begin V3: Tier Policy Settings (configure deposit overrides)
6. Begin V4: Booking Tier Pricing (apply overrides to payment intents)
