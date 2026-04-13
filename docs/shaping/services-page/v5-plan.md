---
title: "V5: Restore — Implementation Plan"
slice: V5
feature: Services Page split-pane
status: pending
---

# V5: Restore

**Feature:** [Services Page: Split-Pane Service Management](./shaping.md)
**Slice:** V5 of 5 | [Slices overview](./slices.md)

---

## Goal

The Restore button is fully wired. Clicking Restore on a hidden or inactive service returns it to the standard public/bookable state. Dirty state is guarded by the confirmation dialog, with a restore-specific variant when the currently open service is the one being restored.

## Affordances in scope

### UI Affordances

| ID | Name | Place | Description |
|----|------|-------|-------------|
| U4 | Restore button | Service List | Now wired: routes through N3 (dirty-navigation gate); shows pending state while action is in-flight |
| U12 (restore-current variant) | Confirmation dialog | Overlay | "Restore service and discard edits?" variant — used when dirty and restoring the currently open service |

### Non-UI Affordances

| ID | Name | Place | Description |
|----|------|-------|-------------|
| N7 | restoreEventType | Server Actions | Now client-wired; on success: `selectedId←id`, `mode=edit`, baseline = restored service values |

## Out of scope

Nothing — this is the final slice. The feature is complete.

---

## Implementation steps

### 1. Wire the Restore button to the dirty-navigation gate

**File:** `src/app/app/settings/services/services-editor-shell.tsx`

Add `onRestore` prop pass-through and implement the handler:

```ts
function handleRestoreIntent(id: string) {
  handleNavIntent({ kind: "restore", id });
}
```

Pass `onRestore={handleRestoreIntent}` to each `ServiceListRow` (replacing the no-op stub from V1).

The `handleNavIntent` function already stores `{ kind: "restore", id }` as `pendingTarget` and sets `variant: "restore-current"` when `target.id === selectedId && dirty`. The dialog's "Restore service" confirm button will now route to the restore flow.

### 2. Implement the restore flow in `applyTarget`

Update the `"restore"` case (currently a stub):

```ts
case "restore": {
  handleRestore(target.id);
  break;
}
```

Add `handleRestore`:

```ts
const [restorePending, setRestorePending] = useState(false);
const [restoreError, setRestoreError] = useState<string | null>(null);

async function handleRestore(id: string) {
  setRestorePending(true);
  setRestoreError(null);

  const result = await restoreEventType(id);

  setRestorePending(false);

  if (!result.ok) {
    setRestoreError("error" in result ? result.error : "Restore failed");
    return;
  }

  // Post-restore: select the restored row, switch to edit mode
  // The list has been revalidated by the server action — find the updated service
  // Services prop will reflect the revalidated list on next render.
  // For now, optimistically set state; the form will reflect the committed
  // restore values (isHidden=false, isActive=true) once the revalidation lands.
  setSelectedId(id);
  setMode("edit");
  setDirty(false);

  // Build an optimistic baseline from the current service + applied restore
  const service = services.find((s) => s.id === id);
  if (service) {
    const restoredValues = rowToValues({ ...service, isHidden: false, isActive: true });
    setBaseline(restoredValues);
    setDraft(restoredValues);
  }
}
```

**Why optimistic baseline:** `revalidatePath` refreshes the RSC list, but the client shell needs a baseline immediately for the form to render correctly while the revalidation round-trip completes. Setting `isHidden=false, isActive=true` on the known service data is safe because that is exactly what the server action applies.

### 3. Pass restore-pending state to `ServiceListRow`

The Restore button should show a disabled/loading state while restore is in-flight:

```tsx
<ServiceListRow
  key={service.id}
  service={service}
  shopContext={shopContext}
  isSelected={service.id === selectedId}
  onSelect={() => handleNavIntent({ kind: "select", id: service.id })}
  onRestore={() => handleRestoreIntent(service.id)}
  restorePending={restorePending && service.id === selectedId}
/>
```

In `ServiceListRow`, use `restorePending` to disable the button and show a subtle loading state:

```tsx
{showRestore && (
  <button
    type="button"
    className="text-xs hover:underline disabled:opacity-50"
    style={{ color: "var(--al-on-surface)" }}
    onClick={() => onRestore(service.id)}
    disabled={restorePending || savePending}
  >
    {restorePending ? "Restoring…" : "Restore"}
  </button>
)}
```

### 4. Show restore error inline

If `restoreError` is set, render a small error message near the Restore button or as a banner in the editor pane. The simplest approach is a transient banner at the top of the left pane or near the affected row:

```ts
// In shell — clear restore error after a few seconds
useEffect(() => {
  if (!restoreError) return;
  const timer = setTimeout(() => setRestoreError(null), 4000);
  return () => clearTimeout(timer);
}, [restoreError]);
```

### 5. Ensure restore-current dialog variant works

The `DiscardConfirmationDialog` already accepts `variant: "restore-current"` from V4. The `handleNavIntent` gate already sets this variant when `target.id === selectedId && dirty`. Verify the confirm button in that variant routes through `handleConfirmDiscard` → `applyTarget({ kind: "restore", id })` → `handleRestore(id)`.

No changes needed to the dialog component itself.

### 6. Disable Restore button during save-pending nav lock

The save-pending nav lock (`savePending`) already guards `handleNavIntent`, which means Restore clicks are silently ignored while a mutation is in-flight. Ensure the Restore button is also visually disabled when `savePending`:

```tsx
disabled={restorePending || savePending}
```

---

## Acceptance

- [ ] Restore button is visible only for services where `isHidden=true` OR `isActive=false`
- [ ] Clicking Restore on a service when the editor is pristine (or a different service is open): restore proceeds immediately without a dialog; the restored service becomes selected in the editor with `isHidden=false, isActive=true`
- [ ] Clicking Restore on a service when a different service is open and dirty: the generic "Discard unsaved changes?" dialog appears; confirming discards edits and restores the target service
- [ ] Clicking Restore on the currently open service when its form is dirty: the "Restore service and discard edits?" dialog appears; confirming restores and refreshes the form
- [ ] "Keep editing" in either dialog cancels the restore and returns to the form with edits intact
- [ ] Restore button shows "Restoring…" and is disabled while the action is in-flight
- [ ] After a successful restore, the service row's badges update (Hidden/Inactive badges disappear)
- [ ] Restore error renders as a transient message and clears automatically
- [ ] Restore button is disabled when save is in-flight (A12 nav lock)
- [ ] `pnpm lint && pnpm typecheck` passes
