# Spike A6: Dashboard Structure

## Context

Shape A parts A6.1 and A6.2 require adding customer scoring UI to the dashboard:
- A6.1: `/app/customers` page with list view (tier badge, score, explanation)
- A6.2: Policy settings for tier overrides (risk deposit, top waived)

We need to understand the existing dashboard structure and UI patterns to maintain consistency.

## Goal

Understand the dashboard structure so we can:
1. Determine where to add the customer list page
2. Follow existing UI patterns for tables, badges, and forms
3. Understand navigation and authentication patterns
4. Know what query functions to create

## Questions

| # | Question |
|---|----------|
| **A6-Q1** | What is the dashboard page structure and navigation pattern? |
| **A6-Q2** | What UI patterns are used for tables, badges, and summary cards? |
| **A6-Q3** | Does a customer list page already exist, or do we need to create it? |
| **A6-Q4** | What is the settings page pattern for policy configuration? |
| **A6-Q5** | What authentication and shop loading pattern should be followed? |

## Investigation

### A6-Q1: Dashboard Page Structure

**Answer:** The dashboard uses Next.js App Router with a simple flat structure under `/app/app/`.

**Existing pages:**
```
/app/app/
  ├── page.tsx                         # Shop setup (home)
  ├── appointments/
  │   ├── page.tsx                     # Appointments list
  │   └── [id]/page.tsx                # Appointment detail
  ├── customers/
  │   └── [id]/page.tsx                # Customer detail (payment history)
  ├── slot-openings/
  │   └── [id]/page.tsx                # Slot opening detail
  └── settings/
      └── payment-policy/page.tsx      # Policy settings
```

**Pattern:**
- No shared layout (each page has its own auth + shop loading)
- No navigation menu visible (users must know URLs or use links)
- Container-based pages: `<div className="container mx-auto px-4 py-10 space-y-6">`

**Missing:** `/app/app/customers/page.tsx` (list view) — **needs to be created**

### A6-Q2: UI Patterns

**Answer:** Consistent patterns across the dashboard:

#### Table Pattern (appointments/page.tsx:90-152)
```tsx
<div className="overflow-hidden rounded-lg border">
  <table className="w-full text-sm">
    <thead className="bg-muted/50 text-left">
      <tr>
        <th className="px-4 py-2 font-medium">Column</th>
        {/* ... */}
      </tr>
    </thead>
    <tbody>
      {items.map((item) => (
        <tr key={item.id} className="border-t">
          <td className="px-4 py-3">{/* content */}</td>
          {/* ... */}
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**Key classes:**
- Container: `overflow-hidden rounded-lg border`
- Table: `w-full text-sm`
- Header: `bg-muted/50 text-left`
- Header cells: `px-4 py-2 font-medium`
- Body cells: `px-4 py-3`
- Row divider: `border-t`

#### Summary Cards Pattern (appointments/page.tsx:64-83)
```tsx
<div className="grid gap-3 sm:grid-cols-3">
  <div className="rounded-lg border p-4">
    <p className="text-xs font-medium uppercase text-muted-foreground">
      Label (7d)
    </p>
    <p className="text-2xl font-semibold">{count}</p>
  </div>
  {/* ... more cards */}
</div>
```

**Pattern:** Grid of cards showing key metrics.

#### Badge Pattern (appointments/page.tsx:225-239)
```tsx
function SlotStatusBadge({ status }: { status: "open" | "filled" | "expired" }) {
  const classes = {
    open: "bg-blue-100 text-blue-800",
    filled: "bg-green-100 text-green-800",
    expired: "bg-muted text-muted-foreground",
  };

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${classes[status]}`}>
      {status}
    </span>
  );
}
```

**For tier badges:**
- `top`: `bg-green-100 text-green-800`
- `neutral`: `bg-muted text-muted-foreground`
- `risk`: `bg-red-100 text-red-800`

#### Header Pattern (appointments/page.tsx:54-62)
```tsx
<header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
  <div className="space-y-2">
    <h1 className="text-3xl font-semibold">Page Title</h1>
    <p className="text-sm text-muted-foreground">Description...</p>
  </div>
  {/* Optional action button */}
</header>
```

#### Link Pattern (appointments/page.tsx:140-145)
```tsx
<Link
  href={`/app/appointments/${id}`}
  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
>
  View
</Link>
```

### A6-Q3: Customer List Page Exists?

**Answer:** ❌ **No customer list page exists.**

**What exists:**
- `/app/app/customers/[id]/page.tsx` — Customer detail (payment history)

**What's missing:**
- `/app/app/customers/page.tsx` — Customer list with scores/tiers

**Implementation needed:**
- Create `/app/app/customers/page.tsx`
- Create `listCustomersForShop()` query function
- Join to `customer_scores` for tier/score data

### A6-Q4: Settings Page Pattern

**Answer:** Server actions with form submission and revalidation.

**Pattern** (settings/payment-policy/page.tsx:61-104):
```tsx
export default async function SettingsPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  // Load current policy
  const policy = await db.query.shopPolicies.findFirst({
    where: (table, { eq }) => eq(table.shopId, shop.id),
  });

  // Server action for updates
  const updatePolicy = async (formData: FormData) => {
    "use server";
    // ... validation ...
    await db.insert(shopPolicies).values({...}).onConflictDoUpdate({...});
    revalidatePath("/app/settings/payment-policy");
  };

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Payment policy</h1>
        <p className="text-sm text-muted-foreground">Description...</p>
      </header>

      <FormComponent action={updatePolicy} initial={policy} />
    </div>
  );
}
```

**For tier overrides:**
- Extend existing `/app/app/settings/payment-policy` page
- Add fields for `risk_deposit_amount_cents`, `top_deposit_waived`
- Update `shopPolicies` schema with new columns
- OR create separate `/app/app/settings/tier-policy` page

**Recommendation:** Extend existing payment policy page to include tier overrides (keeps all payment config in one place).

### A6-Q5: Authentication Pattern

**Answer:** Every page follows the same auth + shop loading pattern.

**Pattern** (appointments/page.tsx:12-25):
```tsx
export default async function DashboardPage() {
  const session = await requireAuth();  // Redirects to /login if not authenticated
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return (
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold">Page Title</h1>
        <p className="text-sm text-muted-foreground">
          Create your shop to access this feature.
        </p>
      </div>
    );
  }

  // ... page content with shop data ...
}
```

**Key points:**
- Use `requireAuth()` helper (redirects if not authenticated)
- Load shop via `getShopByOwnerId(session.user.id)`
- Handle missing shop with friendly message
- Shop ID is always available for queries

## Findings

### What We Learned

1. **No customer list page exists** — Must be created from scratch
2. **Consistent UI patterns** — Tables, badges, headers, links all follow same style
3. **Simple auth pattern** — `requireAuth()` + `getShopByOwnerId()` every page
4. **Server action pattern** — For forms, use server actions with revalidation
5. **No navigation menu** — Pages are accessed via direct links (table View links)

### Customer List Page Structure

Based on existing patterns, the customer list page should be:

**File:** `/src/app/app/customers/page.tsx`

**Structure:**
```tsx
export default async function CustomersPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return <div>Create shop message</div>;
  }

  const customers = await listCustomersForShop(shop.id);

  return (
    <div className="container mx-auto px-4 py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Customers</h1>
        <p className="text-sm text-muted-foreground">
          Customer payment reliability scores and tiers.
        </p>
      </header>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Customer</th>
              <th className="px-4 py-2 font-medium">Tier</th>
              <th className="px-4 py-2 font-medium">Score</th>
              <th className="px-4 py-2 font-medium">Reliability</th>
              <th className="px-4 py-2 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="font-medium">{customer.fullName}</div>
                  <div className="text-xs text-muted-foreground">
                    {customer.email ?? customer.phone}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <TierBadge tier={customer.tier ?? "neutral"} />
                </td>
                <td className="px-4 py-3 font-medium">
                  {customer.score ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {customer.stats
                    ? `Settled: ${customer.stats.settled}, Voided: ${customer.stats.voided}, Late cancels: ${customer.stats.lateCancels}`
                    : "Insufficient history"}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/app/customers/${customer.id}`}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### Query Function Needed

**File:** `/src/lib/queries/customers.ts` (new file)

```typescript
export async function listCustomersForShop(shopId: string) {
  return await db
    .select({
      id: customers.id,
      fullName: customers.fullName,
      email: customers.email,
      phone: customers.phone,
      tier: customerScores.tier,
      score: customerScores.score,
      stats: customerScores.stats,
      computedAt: customerScores.computedAt,
    })
    .from(customers)
    .leftJoin(customerScores, eq(customerScores.customerId, customers.id))
    .where(eq(customers.shopId, shopId))
    .orderBy(
      // Show scored customers first, then by score desc
      sql`CASE WHEN ${customerScores.score} IS NULL THEN 1 ELSE 0 END`,
      desc(customerScores.score)
    );
}
```

### Tier Override UI

**Option 1:** Extend existing payment policy page:
```tsx
// Add to /app/app/settings/payment-policy/page.tsx
<section className="space-y-4">
  <h2 className="text-xl font-semibold">Tier-based overrides</h2>
  <p className="text-sm text-muted-foreground">
    Adjust deposit requirements based on customer payment reliability.
  </p>

  {/* Risk tier */}
  <div className="space-y-2">
    <label className="text-sm font-medium">Risk tier deposit</label>
    <input name="riskDepositAmountCents" type="number" step="0.01" />
  </div>

  {/* Top tier */}
  <div className="flex items-center gap-2">
    <input name="topDepositWaived" type="checkbox" />
    <label className="text-sm font-medium">Waive deposit for top tier</label>
  </div>
</section>
```

**Option 2:** Create separate page `/app/app/settings/tier-policy/page.tsx`

**Recommendation:** Option 1 (extend existing) — keeps all payment config together.

## Acceptance

✅ **Complete** — We can describe:
- The dashboard page structure (flat under /app/app/)
- The UI patterns for tables, badges, headers, and links
- That the customer list page doesn't exist and must be created
- The settings page pattern (server actions with revalidation)
- The authentication pattern (requireAuth + getShopByOwnerId)
- The exact structure for the customer list page
- The query function needed (listCustomersForShop with scores join)
- Two options for tier override UI (recommend extending payment policy page)
