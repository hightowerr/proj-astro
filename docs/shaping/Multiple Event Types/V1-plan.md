---
shaping: true
---

# V1 — Schema + Services Management

**Demo:** Owner navigates to `/app/settings/services`, sees their migrated default service, creates a second one, edits it, copies its booking link, and toggles it hidden.

**Depends on:** nothing — this is the foundation slice.

---

## Steps

### 1. Schema — add `eventTypes` table and `appointments.eventTypeId`

**File:** `src/lib/schema.ts`

Add the `eventTypes` table after the `bookingSettings` table definition:

```typescript
export const eventTypes = pgTable(
  "event_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull(),
    bufferMinutes: integer("buffer_minutes").notNull().default(0),
    depositAmountCents: integer("deposit_amount_cents"),
    isHidden: boolean("is_hidden").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    isDefault: boolean("is_default").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("event_types_shop_id_idx").on(table.shopId),
    check(
      "event_types_buffer_minutes_valid",
      sql`${table.bufferMinutes} IN (0, 5, 10)`
    ),
    check(
      "event_types_duration_minutes_positive",
      sql`${table.durationMinutes} > 0`
    ),
  ]
);
```

Add `eventTypeId` to the `appointments` table (after `policyVersionId`):

```typescript
eventTypeId: uuid("event_type_id").references(() => eventTypes.id, {
  onDelete: "set null",
}),
```

Add index on `appointments` for `eventTypeId`:
```typescript
index("appointments_event_type_id_idx").on(table.eventTypeId),
```

Run:
```bash
pnpm db:generate
```

Review the generated SQL in `drizzle/NNNN_*.sql` — confirm:
- `event_types` table created with check constraints on `buffer_minutes` and `duration_minutes`
- `event_type_id` column added to `appointments` as nullable FK

Then:
```bash
pnpm db:migrate
```

---

### 2. Migration script — seed default event type per shop

**File:** `scripts/migrate-event-types.ts` (new)

```typescript
import { db } from "@/lib/db";
import { bookingSettings, eventTypes, appointments, shops } from "@/lib/schema";
import { eq, isNull } from "drizzle-orm";

const allShops = await db.select({ id: shops.id, name: shops.name }).from(shops);

for (const shop of allShops) {
  const settings = await db.query.bookingSettings.findFirst({
    where: (t, { eq: eqFn }) => eqFn(t.shopId, shop.id),
  });

  const durationMinutes = settings?.slotMinutes ?? 60;

  const [created] = await db
    .insert(eventTypes)
    .values({
      shopId: shop.id,
      name: shop.name,
      durationMinutes,
      bufferMinutes: 0,
      isHidden: false,
      isActive: true,
      isDefault: true,
      sortOrder: 0,
    })
    .onConflictDoNothing()
    .returning({ id: eventTypes.id });

  if (created) {
    await db
      .update(appointments)
      .set({ eventTypeId: created.id })
      .where(eq(appointments.shopId, shop.id));

    console.log(`Shop ${shop.id}: created default event type, backfilled appointments`);
  }
}
```

Run:
```bash
pnpm tsx --env-file=.env scripts/migrate-event-types.ts
```

---

### 3. Query functions

**File:** `src/lib/queries/event-types.ts` (new)

```typescript
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventTypes } from "@/lib/schema";

export async function getEventTypesForShop(
  shopId: string,
  filters?: { isActive?: boolean; isHidden?: boolean }
) {
  return db.query.eventTypes.findMany({
    where: (t, { and: whereAnd, eq: whereEq }) =>
      whereAnd(
        whereEq(t.shopId, shopId),
        filters?.isActive !== undefined
          ? whereEq(t.isActive, filters.isActive)
          : undefined,
        filters?.isHidden !== undefined
          ? whereEq(t.isHidden, filters.isHidden)
          : undefined
      ),
    orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.createdAt)],
  });
}

export async function getEventTypeById(id: string) {
  return db.query.eventTypes.findFirst({
    where: (t, { eq: whereEq }) => whereEq(t.id, id),
  });
}
```

---

### 4. Server actions

**File:** `src/app/app/settings/services/actions.ts` (new)

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { getShopByOwnerId } from "@/lib/queries/shops";
import { eventTypes } from "@/lib/schema";
import { requireAuth } from "@/lib/session";

const VALID_BUFFER_MINUTES = [0, 5, 10] as const;

const eventTypeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().max(500).optional(),
  durationMinutes: z.number().int().positive(),
  bufferMinutes: z.union([z.literal(0), z.literal(5), z.literal(10)]),
  depositAmountCents: z.number().int().positive().nullable(),
  isHidden: z.boolean(),
  isActive: z.boolean(),
});

function parseEventTypeForm(formData: FormData) {
  const durationRaw = Number(formData.get("durationMinutes"));
  const bufferRaw = Number(formData.get("bufferMinutes"));
  const depositRaw = formData.get("depositAmountCents");

  let depositAmountCents: number | null = null;
  if (typeof depositRaw === "string" && depositRaw.trim() !== "") {
    const dollars = parseFloat(depositRaw);
    if (!isNaN(dollars) && dollars > 0) {
      depositAmountCents = Math.round(dollars * 100);
    }
  }

  return eventTypeSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    durationMinutes: durationRaw,
    bufferMinutes: bufferRaw,
    depositAmountCents,
    isHidden: formData.get("isHidden") === "on",
    isActive: formData.get("isActive") !== "off",
  });
}

export async function createEventType(formData: FormData) {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);
  if (!shop) throw new Error("Unauthorized");

  const parsed = parseEventTypeForm(formData);
  if (!parsed.success) throw new Error("Invalid event type data");

  await db.insert(eventTypes).values({
    shopId: shop.id,
    ...parsed.data,
  });

  revalidatePath("/app/settings/services");
}

export async function updateEventType(id: string, formData: FormData) {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);
  if (!shop) throw new Error("Unauthorized");

  const existing = await db.query.eventTypes.findFirst({
    where: (t, { and: whereAnd, eq: whereEq }) =>
      whereAnd(whereEq(t.id, id), whereEq(t.shopId, shop.id)),
  });
  if (!existing) throw new Error("Event type not found");

  const parsed = parseEventTypeForm(formData);
  if (!parsed.success) throw new Error("Invalid event type data");

  await db.update(eventTypes).set(parsed.data).where(eq(eventTypes.id, id));

  revalidatePath("/app/settings/services");
}
```

---

### 5. Services settings page

**File:** `src/app/app/settings/services/page.tsx` (new)

Server component. Loads event types, renders list and inline create form.

```typescript
import { getShopByOwnerId } from "@/lib/queries/shops";
import { getEventTypesForShop } from "@/lib/queries/event-types";
import { getBookingSettingsForShop } from "@/lib/queries/appointments";
import { requireAuth } from "@/lib/session";
import { createEventType, updateEventType } from "./actions";
import { EventTypeList } from "@/components/services/event-type-list";
import { EventTypeForm } from "@/components/services/event-type-form";

export default async function ServicesPage() {
  const session = await requireAuth();
  const shop = await getShopByOwnerId(session.user.id);

  if (!shop) {
    return (
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold">Services</h1>
        <p className="text-sm text-muted-foreground">
          Create your shop to manage services.
        </p>
      </div>
    );
  }

  const [eventTypesList, settings] = await Promise.all([
    getEventTypesForShop(shop.id),
    getBookingSettingsForShop(shop.id),
  ]);

  const slotMinutes = settings?.slotMinutes ?? 60;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const bookingBaseUrl = `${appUrl}/book/${shop.slug}`;

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Services</h1>
        <p className="text-sm text-muted-foreground">
          Define the services customers can book. Each service has its own
          duration, buffer, and optional deposit.
        </p>
      </header>

      <EventTypeList
        eventTypes={eventTypesList}
        bookingBaseUrl={bookingBaseUrl}
        slotMinutes={slotMinutes}
        updateAction={updateEventType}
      />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Add a service</h2>
        <EventTypeForm
          action={createEventType}
          slotMinutes={slotMinutes}
        />
      </section>
    </div>
  );
}
```

---

### 6. Components

**File:** `src/components/services/event-type-list.tsx` (new)

Client component. Renders each event type as a row with an inline edit form (toggle open/close), hidden badge, active status, and copy-link button.

Key behaviours:
- "Copy link" calls `navigator.clipboard.writeText(`${bookingBaseUrl}?service=${id}`)` — no server round-trip
- Hidden types show a `Hidden` badge
- Inactive types show a muted `Inactive` badge
- Each row has an "Edit" button that expands an inline `EventTypeForm` pre-populated with current values

**File:** `src/components/services/event-type-form.tsx` (new)

Client component used for both create and edit. Form fields:

| Field | Input type | Notes |
|-------|-----------|-------|
| Name | text | required |
| Description | textarea | optional |
| Duration | select | options: multiples of `slotMinutes` up to 240 min |
| Buffer | radio | None (0) / 5 min / 10 min |
| Deposit override | number (dollars) | optional; placeholder "Same as shop policy" |
| Hidden | checkbox/toggle | |
| Active | checkbox/toggle | shown in edit mode only |

---

### 7. Nav link

**File:** `src/components/app/app-nav.tsx`

Add "Services" to `appNavLinks`:

```typescript
{ href: "/app/settings/services", label: "Services" },
```

Place it after `{ href: "/app/settings/availability", label: "Availability" }`.

---

## Acceptance

- [ ] `pnpm db:generate` produces correct SQL for `event_types` table and `appointments.event_type_id` column
- [ ] `pnpm db:migrate` applies cleanly
- [ ] Migration script creates one default event type per shop with `isDefault=true` and backfills `appointments.eventTypeId`
- [ ] Owner-created event type (via form) has `isDefault=false`
- [ ] `/app/settings/services` lists event types
- [ ] Owner can create a new event type — appears in list
- [ ] Owner can edit an existing event type — changes persist
- [ ] Owner can deactivate an event type — shows Inactive badge
- [ ] Owner can toggle an event type hidden — shows Hidden badge
- [ ] "Copy link" writes `[appUrl]/book/[shopSlug]?service=<id>` to clipboard
- [ ] `pnpm lint && pnpm typecheck` passes clean
