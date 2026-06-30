# Spike: `availabilityConfigured` Source of Truth

## Context
Spec 17 gates Connect prompts on `shop.availabilityConfigured === true`. Need to verify if this field exists and how to derive it.

## Findings

### S1-Q1: Does `availabilityConfigured` exist on `shops`?
**No.** The `shops` table (`src/lib/schema.ts:177-201`) has: `id`, `ownerUserId`, `name`, `slug`, `businessType`, `status`, `createdAt`, `updatedAt`. No availability boolean.

Grep for `availabilityConfigured` / `availability_configured` returned zero results across the entire codebase.

### S1-Q2: How is "availability configured" determined today?
`shopHours` are **auto-seeded** on shop creation. `createShop()` in `src/lib/queries/shops.ts` calls `ensureDefaults()` which always seeds 7 `shopHours` rows (all 7 days, 09:00-17:00) and a `bookingSettings` row.

The owner CAN mark days as "closed" via availability settings (`src/app/app/settings/availability/actions.ts:64-91`), which deletes and re-inserts `shopHours` rows. A shop could theoretically have zero rows if all days are closed.

**Services (`eventTypes`) are NOT auto-seeded.** A new shop has zero event types. This is the meaningful prerequisite — the thing the owner must actively create.

### S1-Q3: Simplest gate condition?

```ts
const [hours, services] = await Promise.all([
  db.query.shopHours.findFirst({
    where: (t, { eq }) => eq(t.shopId, shop.id),
  }),
  db.query.eventTypes.findFirst({
    where: (t, { and, eq }) => and(eq(t.shopId, shop.id), eq(t.isActive, true)),
  }),
]);

const hasAvailability = !!hours;    // almost always true (auto-seeded)
const hasServices = !!services;     // the real gate
const readyForPayments = hasAvailability && hasServices;
```

`findFirst` is an EXISTS-equivalent — no full row scan.

## Decision
No new column needed. Gate uses two cheap queries. `hasServices` is the meaningful gate; `hasAvailability` is technically always true post-creation but kept for correctness per spec 17's intent.
