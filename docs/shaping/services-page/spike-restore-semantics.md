---
shaping: true
---

# Spike: Services Page Restore Semantics

## Context

`requirements-05.md` leaves `Restore` underdefined because services can leave normal circulation in two different ways:

- `isHidden=true`: the service is removed from the public service picker
- `isActive=false`: the service cannot be booked

Those flags are not equivalent in the current app:

- The public picker loads only `isActive=true` and `isHidden=false` services in [`src/app/book/[slug]/page.tsx`](/home/yunix/learning-agentic/ideas/proj-astro/src/app/book/[slug]/page.tsx).
- Direct-link booking via `?service={eventTypeId}` still works for hidden services, because the booking page and create-booking route reject inactive services but do not reject hidden ones in [`src/app/book/[slug]/page.tsx`](/home/yunix/learning-agentic/ideas/proj-astro/src/app/book/[slug]/page.tsx), [`src/app/api/bookings/create/route.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/app/api/bookings/create/route.ts), and [`src/app/api/availability/route.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/app/api/availability/route.ts).

So the spike is not just UI wording. It changes whether `Restore` means:

- unhide only
- reactivate only
- or return the service to the fully normal public/bookable state

## Goal

Define one restore rule that works for:

- hidden-only services
- inactive-only services
- hidden-and-inactive services

and fits the real booking behavior already implemented in the app.

---

## Questions

| # | Question |
|---|----------|
| Q1 | What does each state combination mean today in the live model? |
| Q2 | Should `Restore` reverse only the specific flag that made the row look removed, or always return the service to a normal public/bookable state? |
| Q3 | Which rows should show a `Restore` action at all? |
| Q4 | What exact field updates should `Restore` perform for hidden-only, inactive-only, and hidden-plus-inactive services? |
| Q5 | What implementation shape best matches the split-pane design and prior spikes? |

---

## Findings

### Q1 — Current meaning of each state combination

The current model allows four combinations:

| `isHidden` | `isActive` | Current meaning |
|---|---|---|
| `false` | `true` | Normal service: visible in public picker and bookable |
| `true` | `true` | Hidden/direct-link-only service: absent from public picker but still bookable by direct link |
| `false` | `false` | Inactive service: absent from normal booking because it fails active checks |
| `true` | `false` | Fully removed from booking surface: absent from picker and also unbookable by direct link |

This matters because hidden-only is not actually “off” in the same sense as inactive-only. It is still a live service with a narrower discovery path.

### Q2 — What `Restore` should mean

There are two viable interpretations:

| Interpretation | Behavior | Problem |
|---|---|---|
| Restore only the flag that seems wrong for that row | hidden-only becomes visible, inactive-only becomes active, hidden+inactive becomes whichever the UI chooses | not actually one semantic; depends on row history or UI context |
| Restore to normal service state | always set `isHidden=false` and `isActive=true` | may be broader than the smallest possible mutation |

The second option is better.

Reasoning:

- The verb `Restore` implies returning something to its default usable state, not performing a context-sensitive partial repair.
- The compact list in the proposed design does not expose enough detail to make a narrower action legible.
- Hidden-only, inactive-only, and hidden-plus-inactive all represent a service that is no longer in the default public/bookable posture.
- A single rule is easier to document, test, and explain than “restore whichever flag caused the problem.”

**Decision:** `Restore` means “make this service normally bookable again.” It always sets:

- `isHidden = false`
- `isActive = true`

### Q3 — Which rows should show `Restore`

If `Restore` always means “return to normal state,” it should only appear for rows that are not already normal.

So the action is available when either condition is true:

- `isHidden === true`
- `isActive === false`

That covers:

- hidden-only
- inactive-only
- hidden-plus-inactive

It should not appear for already-normal rows (`isHidden=false`, `isActive=true`).

### Q4 — Exact field updates by case

With the chosen rule, the behavior is simple and uniform:

| Starting state | `Restore` result | Why |
|---|---|---|
| hidden-only (`true`, `true`) | (`false`, `true`) | restore normal public visibility |
| inactive-only (`false`, `false`) | (`false`, `true`) | restore normal bookability |
| hidden + inactive (`true`, `false`) | (`false`, `true`) | restore both visibility and bookability |

That means the restore mutation does not need to know why the row became non-normal. It only needs to know that it is currently non-normal.

### Q5 — Best implementation shape

The best implementation is a dedicated restore action rather than trying to infer it inside a general update submit.

Recommended server action:

```ts
restoreEventType(id: string)
```

Behavior:

1. authorize shop owner
2. load service by `id` and `shopId`
3. if not found, error
4. set `isHidden=false`
5. set `isActive=true`
6. update `updatedAt`
7. revalidate `/app/settings/services`

This matches the earlier requirements notes and keeps `Restore` distinct from ordinary form save.

---

## Recommended Product Rule

### Definition

`Restore` means:

`Return this service to the standard public/bookable state.`

In data terms:

```ts
isHidden = false;
isActive = true;
```

### User-facing meaning

After restore, the service should:

- appear in the public service picker again
- work for direct-link booking again
- count as a normal active service in any picker-based flow

### Why this rule is preferable

- It gives one meaning across all state combinations.
- It matches what users usually expect from “Restore.”
- It avoids needing hidden historical context about whether a service was “meant” to stay hidden.
- It aligns with the compact-list design, which cannot explain nuanced partial recovery rules well.

---

## Interaction Spec

### Row treatment

The compact list should represent state combinations clearly enough that `Restore` is understandable:

- hidden-only: show `Hidden`
- inactive-only: show `Inactive`
- hidden-plus-inactive: show both `Hidden` and `Inactive`

If the design shows only one label, the user cannot tell what `Restore` is about to change.

### Action availability

- Show `Restore` when `isHidden || !isActive`
- Hide `Restore` when `!isHidden && isActive`

### Post-action selection behavior

This should follow the dirty-state rules from [`spike-split-pane-unsaved-changes.md`](/home/yunix/learning-agentic/ideas/proj-astro/docs/shaping/services-page/spike-split-pane-unsaved-changes.md):

- if current pane is pristine, restore immediately
- if current pane is dirty, confirm discard first
- after restore succeeds, select the restored row and show committed values in the right pane

### Feedback

Restore should have explicit mutation states:

- pending: disable the action and show `Restoring...`
- success: row updates to normal state
- error: keep the row visible and show inline error

---

## Edge Cases

### Hidden-only services

This is the most important case to define explicitly.

A hidden-only service is still bookable by direct link today. `Restore` should still unhide it, because the action is about returning it to normal public visibility, not just “making it usable somehow.”

If the product wants to support direct-link-only services as a first-class intentional state, that should remain the purpose of the explicit `Hide from public` field in the editor, not the `Restore` action.

### Inactive-only services

These are unbookable today. `Restore` should reactivate them.

### Hidden-and-inactive services

These are the clearest “restore both” case. They should become visible and active.

### Default service

The current backend already blocks deactivating the default service in [`src/app/app/settings/services/actions.ts`](/home/yunix/learning-agentic/ideas/proj-astro/src/app/app/settings/services/actions.ts), so restore of a default service mostly matters for hidden-only cases.

No special restore rule is needed. Setting `isHidden=false` and `isActive=true` is still valid.

---

## Alternatives Rejected

### Alternative A — Restore only whichever flag is currently non-normal

Example:

- hidden-only: unhide only
- inactive-only: reactivate only
- hidden+inactive: maybe do both

Why rejected:

- still leaves ambiguity for hidden-plus-inactive
- produces different meanings under one label
- harder to explain in the UI

### Alternative B — Restore only the “last changed” flag

Why rejected:

- requires change history the current model does not store
- impossible to infer reliably
- not inspectable by the user

### Alternative C — No restore action, only explicit toggles

Why rejected:

- works in the full editor, but the compact split-pane list still needs a quick recovery action for non-normal rows
- `Restore` is useful shorthand if it has one clear meaning

---

## Answers

| # | Answer |
|---|--------|
| Q1 | Hidden-only is direct-link-only; inactive-only is unbookable; hidden+inactive is both removed and unbookable |
| Q2 | `Restore` should always return the service to the normal public/bookable state |
| Q3 | Show `Restore` for any row where `isHidden || !isActive` |
| Q4 | In every non-normal case, set `isHidden=false` and `isActive=true` |
| Q5 | Use a dedicated `restoreEventType(id)` action and keep it separate from generic edit save |

---

## Impact On `requirements-05.md`

The `Restore semantics` spike can be considered resolved with these product rules:

- `Restore` has one meaning: return the service to the standard public/bookable state.
- The mutation is always `isHidden=false` and `isActive=true`.
- `Restore` appears for hidden-only, inactive-only, and hidden-plus-inactive rows.
- The compact list must show both `Hidden` and `Inactive` when both apply, otherwise the action is underspecified.

That closes the main remaining product ambiguity in `requirements-05.md`. The split-pane interaction can now treat restore as a dedicated, uniform recovery action instead of a context-sensitive toggle.
