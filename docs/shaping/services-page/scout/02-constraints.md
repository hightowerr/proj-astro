# Constraints

## Hard boundaries discovered

- No schema change is required. [`event_types`](/home/yunix/learning-agentic/ideas/proj-astro/src/lib/schema.ts#L299) already supports `isHidden`, `isActive`, `isDefault`, `bufferMinutes`, and `depositAmountCents`.
- `createEventType` currently returns `void`, so split-pane create mode cannot deterministically select the new row until that action returns `{ id }`. See [`actions.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/app/app/settings/services/actions.ts#L82).
- The current backend already blocks deactivating the default service. See [`actions.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/app/app/settings/services/actions.ts#L111).
- Hidden active services are still directly bookable by link today. The booking page only rejects inactive services. See [`page.tsx`](/home/yunix/learning-agentic/ideas/proj-astro/src/app/book/[slug]/page.tsx#L35) and [`route.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/app/api/bookings/create/route.ts#L124).
- Public picker behavior is already fixed: only `isActive=true` and `isHidden=false` show in the normal service list. See [`page.tsx`](/home/yunix/learning-agentic/ideas/proj-astro/src/app/book/[slug]/page.tsx#L63).
- Browser unload protection is limited to the native `beforeunload` prompt. Modern browsers ignore custom text, so we cannot shape that copy precisely.
- Clipboard-based `Copy link` remains browser-dependent and needs graceful failure handling. The current implementation already does this. See [`event-type-list.tsx`](/home/yunix/learning-agentic/ideas/proj-astro/src/components/services/event-type-list.tsx#L60).
- Duration rules are hard limits, not UI suggestions:
  - multiple of shop slot size
  - max 240 minutes

## Rabbit holes to avoid

- Per-row draft preservation. It sounds helpful and turns into cache reconciliation, stale baselines, and cross-row conflict handling.
- Pulling in Square-style “service library” scope: variations, colors, resources, imports, staff mapping, and location availability.
- Pulling in Calendly/Cal.com-style event-type sprawl: permissions, hosts, notifications, advanced tabs, secret/public menus, and preview workflows.
- Optimistic local updates for list rows while server actions are still pending.
- Trying to solve mobile, tablet, and desktop with three entirely different editor models in one bet.

## What Stitch can and cannot handle

### Stitch can help with

- Visual hierarchy for the split-pane layout
- Empty state and create-mode presentation
- Status chip treatment for `Default`, `Hidden`, and `Inactive`
- Confirmation modal visual polish
- Responsive stacking behavior and button hierarchy

### Stitch cannot solve

- Restore semantics
- Dirty-state policy
- Server Action return shapes
- Hidden vs inactive business meaning
- Copy-link placement tradeoffs

## Competitor pitfalls to avoid

- Square over-models the service object and separates “bookable” behavior from core service editing, which fragments the mental model.
- Calendly keeps secret/public state and editor settings in different surfaces, which adds menu hunting.
- Cal.com exposes a large event-type surface with tabs like availability, advanced, team, and payments; that is a warning sign, not a template for this bet.

## Implementation recommendation

- Keep a single `EditorState` and `PendingTarget`.
- Prefer a dedicated `restoreEventType(id)` action over folding restore into generic update logic.
- Keep the page mostly server-rendered and move only the editor shell client-side.
