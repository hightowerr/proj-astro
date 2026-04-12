---
shaping: true
---

# Spike: Services Page Add New Flow

## Context

`requirements-05.md` leaves the split-pane `Add New` interaction undefined. The current app can already create and edit services, but it does so with two separate patterns:

- `src/app/app/settings/services/page.tsx` renders a standalone create form below the list.
- `src/components/services/event-type-list.tsx` renders inline per-row edit forms.

That means the current codebase does not yet define a single selected-row model, a create mode inside the detail pane, or any cross-selection dirty-state behavior.

## Goal

Define a concrete `Add New` flow that fits the proposed split-pane layout, stays compatible with the current `event_types` model and server validation, and is simple enough to implement without introducing per-row draft persistence.

---

## Questions

| # | Question |
|---|----------|
| Q1 | Where should the blank create form appear in the split-pane layout? |
| Q2 | What defaults should a new service draft use? |
| Q3 | What should `Cancel` do in create mode? |
| Q4 | What should happen if the user has unsaved changes and clicks another row or `Add New` again? |
| Q5 | What implementation change is needed so a newly created service becomes the selected row after save? |

---

## Findings

### Q1 — Where the create form should appear

The least risky approach is to use the existing right-hand detail pane for both edit and create.

Reasons:

- The proposed design already assumes one persistent detail surface.
- Reusing the same pane keeps create and edit field parity high.
- A modal or separate page would break the point of the split-pane interaction and add more navigation state.
- Adding a temporary unsaved row into the left list before save would misrepresent persistence and complicate restore/copy-link states.

**Decision:** `Add New` switches the right pane into `create` mode. The left list remains unchanged until save succeeds.

### Q2 — Default values for a new service

The defaults can follow the current create form and backend rules:

| Field | Default | Why |
|------|---------|-----|
| `name` | empty | Required input; no safe generated default exists |
| `description` | empty | Current backend accepts `null` / blank |
| `durationMinutes` | first valid slot option | Matches current `EventTypeForm` behavior |
| `bufferMinutes` | `null` (`Shop Default`) | Matches current schema and least-surprising default |
| `depositAmountCents` | blank | Current backend treats blank as `same as policy` |
| `isHidden` | `false` | New services should be public unless explicitly hidden |
| `isActive` | `true` | New services should be bookable unless explicitly deactivated |

These are already aligned with `src/components/services/event-type-form.tsx` and `src/app/app/settings/services/actions.ts`.

### Q3 — Cancel behavior in create mode

`Cancel` should revert local draft state only. It should not create a row, mutate selection, or silently preserve an unsaved draft across later visits.

Recommended behavior:

- If the create draft is pristine: exit create mode immediately.
- If a service row was selected before `Add New`: return to that row in edit/view mode.
- If nothing was selected before `Add New`: show the right-pane empty state.
- If the create draft is dirty: show a discard-confirmation prompt before leaving create mode.

This is simpler than preserving multiple drafts and fits the current server-action model.

### Q4 — Unsaved changes when switching selection

The split-pane should use a single local draft at a time, not one draft per row.

Recommended rule:

- When the current form is pristine, row switches happen immediately.
- When the current form is dirty, any navigation away from the current pane is blocked behind the same confirmation prompt:
  - click another service row
  - click `Add New`
  - click `Cancel`
  - clear selection, if that exists in the design

Prompt copy can stay generic:

- Title: `Discard unsaved changes?`
- Body: `You have unsaved changes in this service. Discard them and continue?`
- Actions: `Keep editing` / `Discard changes`

If the user confirms discard, apply the pending navigation target. If they keep editing, stay on the current pane.

**Decision:** no auto-save and no per-service draft preservation.

### Q5 — What save needs to return

The current `createEventType(formData)` action returns `void`, which is enough for the standalone create form but not enough for a split-pane flow that should select the newly created service after save.

For the split-pane flow, save should resolve with the created row id:

```ts
type CreateEventTypeResult = { id: string };
```

After success:

1. insert the service
2. revalidate `/app/settings/services`
3. select the newly created service in the left list
4. keep the right pane open in edit mode for the new row

Without returning the id, the client would need a secondary lookup or brittle heuristics based on sort order.

---

## Recommended Interaction Spec

### Pane modes

Use three right-pane states:

- `empty`: no row selected, no draft open
- `edit`: existing service selected
- `create`: new unsaved draft

### `Add New` flow

1. User clicks `Add New`.
2. If the current pane is pristine, switch right pane to `create`.
3. If the current pane is dirty, show discard-confirmation first.
4. Render create title and blank form in the right pane:
   - Title: `New Service`
   - Subtitle: `Create a bookable service for your booking page.`
5. Do not add a temporary row to the left list yet.
6. On save success, create the service and switch to `edit` mode with the new row selected.

### Selection switching

1. User clicks a service row in the left pane.
2. If current pane is pristine, switch immediately.
3. If dirty, show discard-confirmation.
4. On confirm, discard local state and open the clicked row.

### Cancel behavior

- In `edit` mode:
  - pristine: revert to last committed values and stay on the selected row
  - dirty: revert local edits and stay on the selected row
- In `create` mode:
  - pristine: exit create mode
  - dirty: confirm discard, then exit create mode

This keeps `Cancel` local and predictable. It never changes persisted data.

### Validation and error states

The create pane should use the same validation rules as edit:

- `name` required
- `durationMinutes` must be a multiple of shop `slotMinutes`
- `durationMinutes` must be `<= 240`
- `depositAmountCents` must be blank or positive
- supported buffers are `Shop Default`, `None`, `5m`, `10m`

Errors should render inline in the pane and must not close it.

### Post-save behavior

On successful create:

- toast or inline success state is optional
- right pane stays open
- new service becomes selected
- form becomes non-dirty with committed values

This is better than returning to an empty create form because the follow-up action is usually another edit, copy-link, or visibility change on the new service.

---

## State Model

Use one client-owned editor state:

```ts
type EditorState =
  | { mode: "empty" }
  | { mode: "edit"; selectedId: string; dirty: boolean }
  | { mode: "create"; previousSelectedId: string | null; dirty: boolean };
```

And one deferred navigation target for confirmation flows:

```ts
type PendingTarget =
  | { kind: "select"; id: string }
  | { kind: "create" }
  | { kind: "empty" }
  | null;
```

This is enough to support:

- add new
- row switching
- cancel
- discard-confirmation

It avoids needing cached drafts per row.

---

## Why This Shape Is Preferred

- It matches the current backend without schema changes.
- It avoids false rows in the left list before persistence.
- It keeps the dirty-state logic uniform across edit and create.
- It avoids per-row draft persistence, which the current page and server actions do not support.
- It gives `Add New` a clear end state: the new row becomes the selected service.

---

## Answers

| # | Answer |
|---|--------|
| Q1 | Open create in the existing right-hand detail pane; do not use a modal or temporary left-list row |
| Q2 | Empty name/description/deposit, first valid duration, `Shop Default` buffer, `isHidden=false`, `isActive=true` |
| Q3 | `Cancel` discards local create state; return to previous selection or empty state |
| Q4 | Use one draft only; dirty navigation always goes through a discard-confirmation prompt |
| Q5 | `createEventType` should return the created service id so the UI can select the new row after save |

---

## Impact On `requirements-05.md`

The `Add New flow` spike can be considered resolved with the following product rules:

- `Add New` uses the split-pane detail area, not a separate section, modal, or page.
- Create mode shares the same field set and validation rules as edit mode.
- Unsaved changes are not auto-saved or preserved per row.
- Dirty navigation requires explicit discard confirmation.
- Successful create lands the user on the newly created service in edit mode.

That leaves the separate `Split-pane unsaved changes behavior` spike mostly reduced to confirming this same discard policy across edit, create, and restore transitions.
