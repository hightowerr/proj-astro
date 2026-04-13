---
title: "V4: Dirty Guard — Implementation Plan"
slice: V4
feature: Services Page split-pane
status: pending
---

# V4: Dirty Guard

**Feature:** [Services Page: Split-Pane Service Management](./shaping.md)
**Slice:** V4 of 5 | [Slices overview](./slices.md)

---

## Goal

Unsaved changes are never silently discarded. Any navigation intent while the form is dirty is intercepted by a confirmation dialog. The browser's native tab-close prompt is also active while dirty.

## Affordances in scope

### UI Affordances

| ID | Name | Place | Description |
|----|------|-------|-------------|
| U12 | Confirmation dialog | Overlay | Generic "Discard unsaved changes?" variant. Restore-current variant added in V5 |

### Non-UI Affordances

| ID | Name | Place | Description |
|----|------|-------|-------------|
| N2 | Dirty tracker | Client State | Compares all 7 draft fields against baseline after every field change |
| N3 | Dirty-navigation gate | Client State | Intercepts all navigation intents; if dirty → opens dialog |
| N4 | beforeunload hook | Client State | Native browser prompt when `dirty=true` |

## Out of scope

- Restore button wiring (V5)
- Restore-current dialog variant (V5)

---

## Implementation steps

### 1. Add dirty-tracking state to the shell

**File:** `src/app/app/settings/services/services-editor-shell.tsx`

```ts
import type { PendingTarget, ConfirmState } from "./types";

const [dirty, setDirty]               = useState(false);
const [pendingTarget, setPendingTarget] = useState<PendingTarget>(null);
const [confirmState, setConfirmState]   = useState<ConfirmState>({
  open: false,
  pendingTarget: null,
  variant: "discard",
});
```

Add to `types.ts`:

```ts
export type PendingTarget =
  | { kind: "select";  id: string }
  | { kind: "create" }
  | { kind: "restore"; id: string }
  | { kind: "empty" }
  | null;

export type ConfirmState = {
  open: boolean;
  pendingTarget: PendingTarget;
  variant: "discard" | "restore-current";
};
```

### 2. Implement N2: dirty tracker

After every `onFieldChange` call, compute whether the draft differs from the baseline. Add a helper:

```ts
function isDirty(draft: ServiceEditorValues, baseline: ServiceEditorValues): boolean {
  return (
    draft.name              !== baseline.name              ||
    draft.description       !== baseline.description       ||
    draft.durationMinutes   !== baseline.durationMinutes   ||
    draft.bufferMinutes     !== baseline.bufferMinutes     ||
    draft.depositAmountCents !== baseline.depositAmountCents ||
    draft.isHidden          !== baseline.isHidden          ||
    draft.isActive          !== baseline.isActive
  );
}
```

Update `onFieldChange` handler in the shell:

```ts
function handleFieldChange(field: ServiceField, value: ServiceEditorValues[ServiceField]) {
  setDraft((prev) => {
    if (!prev) return prev;
    const next = { ...prev, [field]: value };
    setDirty(baseline ? isDirty(next, baseline) : false);
    return next;
  });
}
```

Also reset `dirty = false` in `handleSave` on success (after `setBaseline(draft)`).

### 3. Implement N3: dirty-navigation gate

Replace all direct state transitions (handleRowSelect, handleAddNew, Cancel-create, mobile Back) with a single gate function:

```ts
function handleNavIntent(target: PendingTarget) {
  if (!dirty) {
    applyTarget(target);
    return;
  }
  // Determine dialog variant
  const variant =
    target?.kind === "restore" && target.id === selectedId
      ? "restore-current"  // wired in V5; generic for now
      : "discard";
  setConfirmState({ open: true, pendingTarget: target, variant });
}

function applyTarget(target: PendingTarget) {
  if (!target) return;
  switch (target.kind) {
    case "select": {
      const service = services.find((s) => s.id === target.id);
      if (!service) return;
      const values = rowToValues(service);
      setSelectedId(target.id);
      setBaseline(values);
      setDraft(values);
      setMode("edit");
      setDirty(false);
      break;
    }
    case "create": {
      const defaults: ServiceEditorValues = {
        name: "",
        description: "",
        durationMinutes: shopContext.slotMinutes,
        bufferMinutes: null,
        depositAmountCents: null,
        isHidden: false,
        isActive: true,
      };
      setSelectedId(null);
      setBaseline(defaults);
      setDraft(defaults);
      setMode("create");
      setDirty(false);
      break;
    }
    case "empty": {
      setSelectedId(null);
      setBaseline(null);
      setDraft(null);
      setMode("empty");
      setDirty(false);
      break;
    }
    case "restore": {
      // Wired in V5 — calls restoreEventType
      break;
    }
  }
}
```

Update existing handlers to use the gate:

```ts
// Row click (was: call handleRowSelect directly)
function handleRowSelect(id: string) {
  handleNavIntent({ kind: "select", id });
}

// Add New button
function handleAddNew() {
  handleNavIntent({ kind: "create" });
}

// Cancel in create mode (was: always exit immediately)
function handleCancel() {
  if (mode === "edit") {
    // Edit cancel: always revert, no gate needed
    setDraft(baseline);
    setDirty(false);
  } else {
    // Create cancel: route through gate
    handleNavIntent({ kind: "empty" });
  }
}

// Mobile Back (pass this handler to mobile back button when added)
function handleMobileBack() {
  handleNavIntent({ kind: "empty" });
}
```

### 4. Wire confirmation dialog

```ts
function handleKeepEditing() {
  setConfirmState((prev) => ({ ...prev, open: false }));
}

function handleConfirmDiscard() {
  const target = confirmState.pendingTarget;
  setConfirmState({ open: false, pendingTarget: null, variant: "discard" });
  applyTarget(target);
}
```

Render the dialog in the shell JSX:

```tsx
<DiscardConfirmationDialog
  open={confirmState.open}
  variant={confirmState.variant}
  onKeepEditing={handleKeepEditing}
  onConfirm={handleConfirmDiscard}
/>
```

### 5. Create `DiscardConfirmationDialog` component

**File:** `src/app/app/settings/services/discard-confirmation-dialog.tsx` (new)

```tsx
"use client";

type Props = {
  open: boolean;
  variant: "discard" | "restore-current";
  onKeepEditing: () => void;
  onConfirm: () => void;
};

export function DiscardConfirmationDialog({ open, variant, onKeepEditing, onConfirm }: Props) {
  if (!open) return null;

  const title =
    variant === "restore-current"
      ? "Restore service and discard edits?"
      : "Discard unsaved changes?";
  const confirmLabel =
    variant === "restore-current" ? "Restore service" : "Discard changes";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.2)", backdropFilter: "blur(4px)" }}
        onClick={onKeepEditing}
      />
      {/* Dialog */}
      <div
        className="relative z-10 rounded-2xl p-6 w-full max-w-sm mx-4"
        style={{
          background: "rgba(249,249,247,0.85)",
          backdropFilter: "blur(20px)",
          boxShadow: "var(--al-shadow-float, 0px 20px 40px rgba(26,28,27,0.06))",
        }}
      >
        <h2 className="text-base font-semibold mb-2" style={{ color: "var(--al-primary)" }}>
          {title}
        </h2>
        <p className="text-sm mb-5" style={{ color: "var(--al-on-surface-variant)" }}>
          {variant === "restore-current"
            ? "Your unsaved edits will be replaced with the restored values."
            : "Your unsaved changes will be lost."}
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{
              background: "var(--al-secondary-container, #fdd8cb)",
              color: "var(--al-on-secondary-container)",
            }}
            onClick={onKeepEditing}
          >
            Keep editing
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: "var(--al-primary)", color: "var(--al-on-primary)" }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 6. Implement N4: beforeunload hook

Add a `useEffect` in the shell:

```ts
import { useEffect } from "react";

useEffect(() => {
  if (!dirty) return;
  const handler = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = "";
  };
  window.addEventListener("beforeunload", handler);
  return () => window.removeEventListener("beforeunload", handler);
}, [dirty]);
```

### 7. Add A12: save-pending nav lock

When `savePending = true`, guard `handleNavIntent` to do nothing:

```ts
function handleNavIntent(target: PendingTarget) {
  if (savePending) return; // nav locked during mutations
  // ... rest of gate logic
}
```

Also disable the Add New button when `savePending`:

```tsx
<button
  type="button"
  onClick={handleAddNew}
  disabled={savePending}
  ...
>
  Add New
</button>
```

---

## Acceptance

- [ ] Edit any field, then click a different row → confirmation dialog appears: "Discard unsaved changes?"
- [ ] "Keep editing" closes dialog; form retains all edits
- [ ] "Discard changes" closes dialog and switches to the target row; form shows that row's values
- [ ] Edit a field, click Add New → same confirmation dialog
- [ ] Edit a field in create mode, click Cancel → same confirmation dialog
- [ ] Navigate away with browser reload or tab close while dirty → native browser confirmation prompt
- [ ] Clicking a row while save is in-flight does nothing (nav lock active)
- [ ] Add New button is disabled while save is in-flight
- [ ] Pristine state: switching rows, Add New, Cancel-create all proceed immediately with no dialog
- [ ] `pnpm lint && pnpm typecheck` passes
