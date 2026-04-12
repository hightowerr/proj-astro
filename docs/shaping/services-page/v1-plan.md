---
title: "V1: Static List Page — Implementation Plan"
slice: V1
feature: Services Page split-pane
status: pending
---

# V1: Static List Page

**Feature:** [Services Page: Split-Pane Service Management](./shaping.md)
**Slice:** V1 of 5 | [Slices overview](./slices.md)

---

## Goal

The services settings page renders a split-pane layout with the full service list on the left and a static empty pane on the right — no interactivity yet, but all visual elements are correct.

## Affordances in scope

### UI Affordances

| ID | Name | Place | Description |
|----|------|-------|-------------|
| U2 | Service row | Service List | Name, duration, deposit (override or "Policy default"), Default badge, Hidden/Inactive state badges |
| U5 | Copy link button | Service List | Visible only when `isActive=true`; copies booking URL to clipboard; no dirty gate |
| U6 | Empty pane | Editor Pane | Static message: "Select a service to edit…" or no-services variant |

### Non-UI Affordances

| ID | Name | Place | Description |
|----|------|-------|-------------|
| N8 | Services query | Server | `page.tsx` updated to load full `ServicesPagePayload`; builds `ShopContext` |

## Out of scope

- Row selection and editor state (V2)
- Add New and Restore button functionality — they render but do nothing (V2, V5)
- Save/create/restore mutations (V3)
- Dirty tracking and confirmation dialog (V4)

---

## Implementation steps

### 1. Update `page.tsx` — load full payload

**File:** `src/app/app/settings/services/page.tsx`

Add `shopPolicies` to the existing `Promise.all` and build `ShopContext`:

```ts
const [eventTypeRows, settings, policy] = await Promise.all([
  getEventTypesForShop(shop.id),
  getBookingSettingsForShop(shop.id),
  db.query.shopPolicies.findFirst({
    where: (t, { eq }) => eq(t.shopId, shop.id),
    columns: { depositAmountCents: true },
  }),
]);

const shopContext: ShopContext = {
  slotMinutes:          settings?.slotMinutes ?? 60,
  defaultBufferMinutes: (settings?.defaultBufferMinutes ?? 0) as 0 | 5 | 10,
  defaultDepositCents:  policy?.depositAmountCents ?? null,
  bookingBaseUrl:       `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/book/${shop.slug}`,
};
```

Map event types to `ServiceRow[]` and pass both to the shell component:

```ts
const services: ServiceRow[] = eventTypeRows.map((e) => ({
  id: e.id,
  name: e.name,
  description: e.description,
  durationMinutes: e.durationMinutes,
  bufferMinutes: e.bufferMinutes as 0 | 5 | 10 | null,
  depositAmountCents: e.depositAmountCents,
  isHidden: e.isHidden,
  isActive: e.isActive,
  isDefault: e.isDefault,
}));

return <ServicesEditorShell services={services} shopContext={shopContext} />;
```

### 2. Define shared types

**File:** `src/app/app/settings/services/types.ts` (new)

```ts
export type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  bufferMinutes: 0 | 5 | 10 | null;
  depositAmountCents: number | null;
  isHidden: boolean;
  isActive: boolean;
  isDefault: boolean;
};

export type ShopContext = {
  slotMinutes: number;
  defaultBufferMinutes: 0 | 5 | 10;
  defaultDepositCents: number | null;
  bookingBaseUrl: string;
};

export type ServiceEditorValues = {
  name: string;
  description: string;
  durationMinutes: number;
  bufferMinutes: number | null;
  depositAmountCents: number | null;
  isHidden: boolean;
  isActive: boolean;
};

export type ServiceField = keyof ServiceEditorValues;
```

### 3. Create the split-pane shell component

**File:** `src/app/app/settings/services/services-editor-shell.tsx` (new)

```tsx
"use client";

import type { ServiceRow, ShopContext } from "./types";
import { ServiceListRow } from "./service-list-row";
import { EmptyPane } from "./empty-pane";

type Props = {
  services: ServiceRow[];
  shopContext: ShopContext;
};

export function ServicesEditorShell({ services, shopContext }: Props) {
  return (
    <div className="flex h-full min-h-0">
      {/* Left pane — service list */}
      <div
        className="w-72 shrink-0 overflow-y-auto"
        style={{ background: "var(--al-surface-container-low)" }}
      >
        <div className="p-4 pb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: "var(--al-on-surface-variant)" }}>
            Services
          </h2>
          {/* Add New — wired in V2 */}
          <button
            type="button"
            className="text-sm px-3 py-1 rounded-lg"
            style={{ background: "var(--al-primary)", color: "var(--al-on-primary)" }}
            disabled
          >
            Add New
          </button>
        </div>
        <div className="flex flex-col gap-1 p-2">
          {services.map((service) => (
            <ServiceListRow
              key={service.id}
              service={service}
              shopContext={shopContext}
              isSelected={false}
              onSelect={() => {}}
              onRestore={() => {}}
            />
          ))}
        </div>
      </div>

      {/* Right pane — editor */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ background: "var(--al-surface-container-lowest)" }}
      >
        <EmptyPane hasServices={services.length > 0} />
      </div>
    </div>
  );
}
```

### 4. Create `ServiceListRow` component

**File:** `src/app/app/settings/services/service-list-row.tsx` (new)

Key rendering rules (from design system and R2):
- Row background: inherits left pane; hover → `--al-surface-container`; selected → `--al-surface-container-high`
- Row separation: spacing only (`gap-1`), never divider lines
- Deposit label: if `depositAmountCents` is not null → format as currency; if null → `"Policy default"` (using `shopContext.defaultDepositCents` for the value display)
- State badges (chip style: `--al-secondary-fixed` bg, `--al-on-secondary-fixed` text, pill):
  - `isHidden && isActive` → "Hidden"
  - `!isActive && !isHidden` → "Inactive"
  - `isHidden && !isActive` → both "Hidden" and "Inactive"
- Default badge: shown when `isDefault`
- Restore button: visible when `isHidden || !isActive`; tertiary style (no bg, underline on hover); disabled/no-op in this slice
- Copy link button: visible only when `isActive`; uses `navigator.clipboard.writeText`

```tsx
"use client";

import type { ServiceRow, ShopContext } from "./types";

type Props = {
  service: ServiceRow;
  shopContext: ShopContext;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRestore: (id: string) => void;
};

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function StateBadge({ label }: { label: string }) {
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: "var(--al-secondary-fixed)", color: "var(--al-on-secondary-fixed)" }}
    >
      {label}
    </span>
  );
}

export function ServiceListRow({ service, shopContext, isSelected, onSelect, onRestore }: Props) {
  const depositLabel =
    service.depositAmountCents != null
      ? formatCents(service.depositAmountCents)
      : shopContext.defaultDepositCents != null
        ? `Policy default (${formatCents(shopContext.defaultDepositCents)})`
        : "Policy default";

  const showRestore = service.isHidden || !service.isActive;
  const showCopyLink = service.isActive;

  return (
    <div
      className="rounded-lg px-3 py-2.5 cursor-pointer transition-colors"
      style={{
        background: isSelected ? "var(--al-surface-container-high)" : undefined,
      }}
      onClick={() => onSelect(service.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="text-sm font-medium truncate"
              style={{ color: "var(--al-primary)" }}
            >
              {service.name}
            </span>
            {service.isDefault && (
              <span
                className="px-1.5 py-0.5 rounded text-xs"
                style={{ background: "var(--al-surface-container-high)", color: "var(--al-on-surface-variant)" }}
              >
                Default
              </span>
            )}
          </div>
          <div
            className="text-xs mt-0.5"
            style={{ color: "var(--al-on-surface-variant)" }}
          >
            {service.durationMinutes}m · {depositLabel}
          </div>
          {(service.isHidden || !service.isActive) && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {service.isHidden && <StateBadge label="Hidden" />}
              {!service.isActive && <StateBadge label="Inactive" />}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {showCopyLink && (
            <button
              type="button"
              className="text-xs underline"
              style={{ color: "var(--al-on-surface-variant)" }}
              onClick={() => {
                navigator.clipboard.writeText(
                  `${shopContext.bookingBaseUrl}?service=${service.id}`
                );
              }}
            >
              Copy link
            </button>
          )}
          {showRestore && (
            <button
              type="button"
              className="text-xs hover:underline"
              style={{ color: "var(--al-on-surface)" }}
              onClick={() => onRestore(service.id)}
              disabled
            >
              Restore
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 5. Create `EmptyPane` component

**File:** `src/app/app/settings/services/empty-pane.tsx` (new)

```tsx
type Props = { hasServices: boolean };

export function EmptyPane({ hasServices }: Props) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <p
        className="text-sm text-center max-w-xs"
        style={{ color: "var(--al-on-surface-variant)" }}
      >
        {hasServices
          ? "Select a service to edit, or click Add New to create one."
          : "You don't have any services yet. Click Add New to create your first."}
      </p>
    </div>
  );
}
```

---

## Acceptance

- [ ] Page loads without errors; split-pane layout renders (left list / right empty pane)
- [ ] Each service row shows name, duration, and deposit (formatted dollars or "Policy default")
- [ ] Default badge shown for the default service
- [ ] Hidden badge shown when `isHidden=true` and `isActive=true`
- [ ] Inactive badge shown when `isActive=false` and `isHidden=false`
- [ ] Both badges shown when `isHidden=true` and `isActive=false`
- [ ] Copy link button visible only for active services; copies correct URL to clipboard
- [ ] Restore button visible only when service is hidden or inactive; currently no-ops
- [ ] Right pane shows correct empty-state message (services exist vs no services)
- [ ] `pnpm lint && pnpm typecheck` passes
