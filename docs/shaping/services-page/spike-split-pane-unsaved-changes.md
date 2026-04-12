---
shaping: true
---

# Spike: Services Page Split-Pane Unsaved Changes Behavior

## Context

`requirements-05.md` proposes a split list/detail editor for services, but the current UI does not yet have shared selection state or cross-row draft handling:

- `src/components/services/event-type-list.tsx` expands one row at a time and renders an inline form for that row.
- `src/components/services/event-type-form.tsx` owns local field state only for the currently rendered form instance.
- The current page has no `Cancel` action, no dirty tracking, and no rule for what should happen when the user switches rows mid-edit.

The `Add New` spike in `docs/shaping/services-page/spike-add-new-flow.md` already recommends a single right-pane editor with one active draft at a time. This spike resolves the remaining question: how that draft behaves when the user navigates around the split-pane UI.

## Goal

Choose one unsaved-changes policy for the split-pane editor and define the exact behavior for:

- switching selected rows
- `Add New`
- `Cancel`
- `Restore`
- save success/error
- leaving the page entirely

---

## Questions

| # | Question |
|---|----------|
| Q1 | Should unsaved changes be auto-discarded, blocked by confirmation, or preserved per selection? |
| Q2 | What counts as a dirty form in this screen? |
| Q3 | What should `Cancel` do in edit mode and create mode? |
| Q4 | What should happen if the user triggers `Restore` while another form is dirty? |
| Q5 | Should browser/page navigation get the same protection as in-app row switching? |

---

## Findings

### Q1 — Which policy fits this screen

There are three realistic models:

| Model | Pros | Problems |
|------|------|----------|
| Auto-discard on navigation | simplest code | too risky; easy to lose edits by misclicking another row |
| Preserve drafts per selection | user never loses work | much more stateful; requires draft cache per row and clear reconciliation rules after save/restore/revalidation |
| Single active draft with discard confirmation | predictable, moderate complexity | one extra confirmation step when leaving dirty state |

For this page, the third option is the best fit.

Reasons:

- The current data model and server actions are simple CRUD, not collaborative editing.
- The proposed split-pane layout implies frequent row switching, so silent discard is too dangerous.
- Preserving separate drafts per service would add substantial state-management complexity that the current UI does not need.
- The repo already uses straightforward confirmation patterns elsewhere, for example `window.confirm` in calendar settings.

**Decision:** use one active draft only. Any in-app navigation away from a dirty editor is blocked behind explicit discard confirmation.

### Q2 — What counts as dirty

The screen should use value comparison against the current committed baseline.

Dirty means any field in the active pane differs from its starting value:

- `name`
- `description`
- `durationMinutes`
- `bufferMinutes`
- `depositAmountCents`
- `isHidden`
- `isActive`

Rules:

- In `edit` mode, the baseline is the selected service as last loaded or last successfully saved.
- In `create` mode, the baseline is the default create values defined in `spike-add-new-flow.md`.
- Validation errors alone do not make the form dirty; field changes do.
- A successful save resets dirty back to `false` using the newly committed values as baseline.

### Q3 — `Cancel` behavior

`Cancel` should never navigate unpredictably or mutate persisted data. It only resolves local editor state.

Recommended behavior:

- In `edit` mode:
  - pristine: no-op except closing any inline error or returning the fields to their committed values
  - dirty: revert all fields to baseline and stay on the same selected service
- In `create` mode:
  - pristine: exit create mode
  - dirty: ask for discard confirmation; if confirmed, exit create mode

This keeps `Cancel` consistent:

- edit mode means `revert`
- create mode means `abandon draft`

### Q4 — How `Restore` should interact with dirty state

`Restore` is navigation plus mutation. In the split-pane design, it can be triggered from a row in the left pane while another service is open on the right.

If the current editor is dirty, the app should not silently discard just because the user clicked `Restore` elsewhere.

Recommended behavior:

1. User clicks `Restore` on a different row.
2. If current editor is pristine, run restore immediately.
3. If current editor is dirty, show discard-confirmation first.
4. On confirm:
   - discard current local edits
   - run restore action
   - select the restored row in the right pane using fresh committed data

This treats restore similarly to row switching, but with an added server mutation after confirmation.

If the user clicks `Restore` for the row already open in the pane:

- pristine: run restore in place and update the same pane with committed values
- dirty: show a more specific confirmation:
  - `Restore this service and discard your unsaved edits?`

### Q5 — Leaving the page entirely

The screen should protect against accidental browser-level navigation too:

- refresh
- closing the tab
- typing a new URL
- browser back/forward that unloads the page

Recommended behavior:

- If editor is pristine: no prompt.
- If editor is dirty: attach a native `beforeunload` warning.

For in-app actions inside the React screen, use a custom confirmation flow.
For browser/tab unload, use the native browser prompt because custom modals are not reliable there.

---

## Recommended Interaction Spec

### One-draft rule

At all times, the screen owns only one draft:

- selected existing service in `edit` mode, or
- unsaved new service in `create` mode

There is no cached unsaved draft for non-selected rows.

### Dirty-navigation rule

If the editor is pristine:

- allow selection change immediately
- allow `Add New` immediately
- allow `Restore` immediately
- allow pane close / empty-state transition immediately

If the editor is dirty:

- block the action
- open discard-confirmation
- store the intended destination as a pending target
- if confirmed, discard and continue
- if cancelled, keep editing

### Confirmation copy

Default prompt:

- Title: `Discard unsaved changes?`
- Body: `You have unsaved changes in this service. Discard them and continue?`
- Actions: `Keep editing` / `Discard changes`

Restore-specific variant when acting on the currently open row:

- Title: `Restore service and discard edits?`
- Body: `Restore will replace your current draft with the saved service state.`
- Actions: `Keep editing` / `Restore service`

### Pending targets

The screen needs to remember what the user was trying to do before the confirmation interrupted it.

```ts
type PendingTarget =
  | { kind: "select"; id: string }
  | { kind: "create" }
  | { kind: "restore"; id: string }
  | { kind: "empty" }
  | null;
```

On confirm:

- `select`: open that service
- `create`: switch to create mode
- `restore`: run restore, then select restored row
- `empty`: clear pane / exit create mode

### Save behavior

Save should always win over dirty prompts:

- while save is pending, navigation controls should be disabled
- on success, clear dirty state and update baseline
- on error, keep the pane open with dirty state intact

This avoids races where the user can click away during a pending mutation.

### Copy-link behavior

`Copy link` is not destructive and should not be blocked by dirty state. It does not change selection or editor data.

### External updates / revalidation

If the selected service changes due to a successful save or restore initiated by this screen, update the baseline and continue.

If the selected service is changed externally while the pane is dirty, do not hot-swap the form underneath the user. Keep the local draft visible until the user either saves, cancels, or discards. After discard, reload from latest server data.

This avoids surprising field jumps.

---

## Prototype State Model

```ts
type EditorState =
  | {
      mode: "empty";
    }
  | {
      mode: "edit";
      selectedId: string;
      baseline: ServiceEditorValues;
      draft: ServiceEditorValues;
      dirty: boolean;
    }
  | {
      mode: "create";
      previousSelectedId: string | null;
      baseline: ServiceEditorValues;
      draft: ServiceEditorValues;
      dirty: boolean;
    };
```

```ts
type ConfirmState = {
  open: boolean;
  pendingTarget: PendingTarget;
  variant: "discard" | "restore-current";
};
```

This is enough to support the whole interaction without maintaining a draft map keyed by service id.

---

## Event Matrix

| Current state | User action | Result |
|---|---|---|
| pristine edit | click another row | switch rows immediately |
| dirty edit | click another row | confirm discard, then switch if confirmed |
| pristine edit | click `Add New` | switch to create mode |
| dirty edit | click `Add New` | confirm discard, then switch to create if confirmed |
| pristine edit | click `Cancel` | revert/no-op, stay on same row |
| dirty edit | click `Cancel` | revert draft to baseline, stay on same row |
| pristine create | click `Cancel` | exit create mode |
| dirty create | click `Cancel` | confirm discard, then exit create if confirmed |
| pristine any | click `Restore` on another row | restore immediately, then select restored row |
| dirty any | click `Restore` on another row | confirm discard, then restore/select if confirmed |
| dirty open restored row | click `Restore` on current row | restore-specific confirmation |
| dirty any | browser reload/close | native beforeunload prompt |

---

## Why This Shape Is Preferred

- It prevents accidental data loss.
- It stays much simpler than per-row draft preservation.
- It uses one mental model across row switching, create, cancel, and restore.
- It matches the current server-action architecture, where changes are only durable after explicit save.
- It is implementable with ordinary client state and a lightweight confirmation modal.

---

## Answers

| # | Answer |
|---|--------|
| Q1 | Use one active draft and explicit discard confirmation for any in-app navigation away from dirty state |
| Q2 | Dirty means any editable field differs from the current committed baseline |
| Q3 | `Cancel` reverts edits in edit mode; in create mode it abandons the draft, with confirmation if dirty |
| Q4 | `Restore` should follow the same discard-confirmation gate when another draft is dirty, then restore and select the restored row |
| Q5 | Yes for browser unload: use native `beforeunload` only when dirty |

---

## Impact On `requirements-05.md`

The `Split-pane unsaved changes behavior` spike can be considered resolved with these product rules:

- The split-pane editor keeps only one local draft at a time.
- Unsaved changes are never auto-preserved per row.
- Dirty in-app navigation is blocked behind discard confirmation.
- `Cancel` is local-state only: revert in edit mode, abandon in create mode.
- `Restore` participates in the same dirty-state gate.
- Browser unload gets a native warning only when the editor is dirty.

This also confirms the unsaved-change assumptions used by `spike-add-new-flow.md`. The remaining open interaction question in `requirements-05.md` is now primarily `Restore semantics`, not draft handling.
