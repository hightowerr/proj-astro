---
title: "V2: Selection + Editor Forms — Implementation Plan"
slice: V2
feature: Services Page split-pane
status: pending
---

# V2: Selection + Editor Forms

**Feature:** [Services Page: Split-Pane Service Management](./shaping.md)
**Slice:** V2 of 5 | [Slices overview](./slices.md)

---

## Goal

Clicking a service row opens a pre-filled edit form in the right pane. Add New opens a blank create form. Cancel reverts or exits. No mutations yet.

## Affordances in scope

### UI Affordances

| ID | Name | Place | Description |
|----|------|-------|-------------|
| U1 | Add New button | Services Page | Click sets mode to `create`, opens blank form with R4.1 defaults |
| U7 | Edit form | Editor Pane | 7 editable fields bound to draft; pre-filled from baseline on row selection |
| U8 | Create form | Editor Pane | Same form component, initialised with create defaults |
| U10 | Cancel button | Editor Pane | Edit: reverts draft to baseline, stays on row. Create (pristine): exits to empty pane |

### Non-UI Affordances

| ID | Name | Place | Description |
|----|------|-------|-------------|
| N1 | Editor state | Client State | `selectedId`, `mode`, `baseline`, `draft` — drives pane render; `dirty`/`pendingTarget`/`confirmState` added in V4 |

## Out of scope

- Save/create/restore mutations (V3)
- Dirty tracking — Cancel in create always exits immediately in this slice; dirty path wired in V4
- Confirmation dialog (V4)
- Restore button wiring (V5)

---

## Implementation steps

### 1. Add editor state to the shell

**File:** `src/app/app/settings/services/services-editor-shell.tsx`

Add state at the top of the component:

```ts
import { useState } from "react";
import type { ServiceEditorValues } from "./types";

const [selectedId, setSelectedId] = useState<string | null>(null);
const [mode, setMode] = useState<"empty" | "edit" | "create">("empty");
const [baseline, setBaseline] = useState<ServiceEditorValues | null>(null);
const [draft, setDraft] = useState<ServiceEditorValues | null>(null);
```

Helper to convert a `ServiceRow` to `ServiceEditorValues`:

```ts
function rowToValues(row: ServiceRow): ServiceEditorValues {
  return {
    name: row.name,
    description: row.description ?? "",
    durationMinutes: row.durationMinutes,
    bufferMinutes: row.bufferMinutes,
    depositAmountCents: row.depositAmountCents,
    isHidden: row.isHidden,
    isActive: row.isActive,
  };
}
```

### 2. Implement row select handler

```ts
function handleRowSelect(id: string) {
  const service = services.find((s) => s.id === id);
  if (!service) return;
  const values = rowToValues(service);
  setSelectedId(id);
  setBaseline(values);
  setDraft(values);
  setMode("edit");
}
```

Pass `onSelect={handleRowSelect}` and `isSelected={service.id === selectedId}` to each `ServiceListRow`.

### 3. Implement Add New handler

R4.1 defaults: name/description empty, first valid duration (`slotMinutes`), buffer null (Shop Default), deposit null, isHidden=false, isActive=true.

```ts
function handleAddNew() {
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
}
```

Wire the Add New button (enable it, remove the `disabled` attribute, add `onClick={handleAddNew}`).

### 4. Create `ServiceEditorForm` component

**File:** `src/app/app/settings/services/service-editor-form.tsx` (new)

This is a single form component used for both edit and create modes. It is a controlled component — the shell owns draft state.

Props:

```ts
type Props = {
  mode: "edit" | "create";
  draft: ServiceEditorValues;
  shopContext: ShopContext;
  onFieldChange: (field: ServiceField, value: ServiceEditorValues[ServiceField]) => void;
  onSave: () => void;    // wired in V3
  onCancel: () => void;
  savePending?: boolean; // wired in V3
};
```

**Duration picker:** multiples of `slotMinutes` from `slotMinutes` up to 480 (8h) or a reasonable cap.

```ts
const durationOptions = Array.from(
  { length: Math.floor(480 / shopContext.slotMinutes) },
  (_, i) => (i + 1) * shopContext.slotMinutes
);
```

**Buffer picker:**
```ts
const bufferOptions = [
  { value: null, label: `Shop Default (${shopContext.defaultBufferMinutes}m)` },
  { value: 0,    label: "None (0m)" },
  { value: 5,    label: "5 min" },
  { value: 10,   label: "10 min" },
];
```

**Deposit input:** numeric input in dollars; convert to/from cents in `onFieldChange` / display value.

**State semantics hint** (below isHidden / isActive toggles):
- `isHidden=true, isActive=true`: "Publicly hidden — bookable via direct link only"
- `isActive=false`: "Inactive — cannot be booked"

**Input style:**
- Background: `--al-surface-container-low`, no box border, `--al-radius-md` (6px) corners
- Focus: background shifts to `--al-surface-container-high` + `--al-ghost-border`

**Save button:** primary style — `--al-primary` background, `--al-on-primary` text, `--al-radius-xl` (12px). Disabled in this slice (wired in V3).

**Cancel button:** tertiary style — no background, `--al-on-surface` text, underline on hover.

### 5. Implement Cancel handler

```ts
function handleCancel() {
  if (mode === "edit") {
    // Revert draft to baseline, stay on row
    setDraft(baseline);
  } else {
    // Create mode — in this slice, always exit (dirty path gated in V4)
    setMode("empty");
    setSelectedId(null);
    setBaseline(null);
    setDraft(null);
  }
}
```

### 6. Update right-pane rendering in shell

Replace the always-`<EmptyPane />` right pane with conditional rendering:

```tsx
<div className="flex-1 overflow-y-auto" style={{ background: "var(--al-surface-container-lowest)" }}>
  {mode === "empty" && <EmptyPane hasServices={services.length > 0} />}
  {(mode === "edit" || mode === "create") && draft && (
    <div className="p-6">
      <h2 className="text-base font-semibold mb-4" style={{ color: "var(--al-primary)" }}>
        {mode === "create" ? "New service" : "Edit service"}
      </h2>
      <ServiceEditorForm
        mode={mode}
        draft={draft}
        shopContext={shopContext}
        onFieldChange={(field, value) => setDraft((prev) => prev ? { ...prev, [field]: value } : prev)}
        onSave={() => {}} // wired in V3
        onCancel={handleCancel}
      />
    </div>
  )}
</div>
```

---

## Acceptance

- [ ] Clicking a service row opens the edit form pre-filled with that service's values
- [ ] Selected row has a visually distinct background (`--al-surface-container-high`)
- [ ] Clicking a different row replaces the form with the new service's values
- [ ] All 7 fields render correctly: name, description, duration (select), buffer (select with Shop Default label), deposit (dollar input), isHidden toggle, isActive toggle
- [ ] Add New button opens create form with correct defaults: empty name, first valid duration, Shop Default buffer, blank deposit, isHidden=false, isActive=true
- [ ] Cancel in edit mode reverts all fields to the last committed values; form stays open on same service
- [ ] Cancel in create mode exits to empty pane (in this slice, no dirty check yet)
- [ ] State semantics hints render correctly below the toggle fields
- [ ] `pnpm lint && pnpm typecheck` passes
