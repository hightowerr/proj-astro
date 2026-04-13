---
title: "Services Page: Split-Pane Service Management — Slices"
type: slices
feature: Services Page split-pane
shaping-doc: ./shaping.md
---

# Services Page: Slices

**Feature:** [Services Page: Split-Pane Service Management](./shaping.md)
**Selected shape:** A (Client editor shell with single active draft)
**Slices:** 5

---

## Sliced Breadboard

```mermaid
flowchart TB
    subgraph slice1["V1: STATIC LIST PAGE"]
        N8["N8: services query"]
        U2["U2: service row"]
        U5["U5: Copy link"]
        U6["U6: empty pane"]
    end

    subgraph slice2["V2: SELECTION + FORMS"]
        N1["N1: editor state"]
        U1["U1: Add New button"]
        U7["U7: edit form"]
        U8["U8: create form"]
        U10["U10: Cancel button"]
    end

    subgraph slice3["V3: MUTATIONS"]
        N5["N5: updateEventType"]
        N6["N6: createEventType"]
        N7["N7: restoreEventType"]
        U9["U9: Save button"]
        U11["U11: mutation feedback"]
    end

    subgraph slice4["V4: DIRTY GUARD"]
        N2["N2: dirty tracker"]
        N3["N3: dirty-nav gate"]
        N4["N4: beforeunload"]
        U12["U12: confirmation dialog"]
    end

    subgraph slice5["V5: RESTORE"]
        U4["U4: Restore button"]
    end

    %% Force slice ordering
    slice1 ~~~ slice2
    slice2 ~~~ slice3
    slice3 ~~~ slice4
    slice4 ~~~ slice5

    %% Navigation intents → gate
    U1 -->|click| N3
    U2 -->|row click| N3
    U4 -->|click| N3
    U5 -->|click| clipboard(["clipboard"])

    %% Gate routes
    N3 -->|pristine → select/create/empty| N1
    N3 -->|pristine → restore| N7
    N3 -->|dirty| U12

    %% Confirmation dialog
    U12 -->|Keep editing| N1
    U12 -->|Confirm select/create/empty| N1
    U12 -->|Confirm restore| N7

    %% Field changes → dirty tracker
    U7 -->|field change| N2
    U8 -->|field change| N2
    N2 --> N1
    N2 --> N4

    %% Save
    U9 -->|edit mode| N5
    U9 -->|create mode| N6

    %% Cancel
    U10 -->|edit: revert draft| N1
    U10 -->|create pristine: exit| N1
    U10 -->|create dirty| N3

    %% Server Action outcomes
    N5 -->|success: update baseline| N1
    N5 -->|error| U11
    N6 -->|success: id returned, mode→edit| N1
    N6 -->|error| U11
    N7 -->|success: selectedId←restored| N1
    N7 -->|error| U11

    %% Revalidation
    N5 --> N8
    N6 --> N8
    N7 --> N8

    %% Returns To
    N8 -.->|populate list| U2
    N1 -.->|mode=empty| U6
    N1 -.->|mode=edit, baseline→fields| U7
    N1 -.->|mode=create, defaults→fields| U8
    N1 -.->|pendingNavLock| U9

    %% Slice boundary styling
    style slice1 fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style slice2 fill:#e3f2fd,stroke:#2196f3,stroke-width:2px
    style slice3 fill:#fff3e0,stroke:#ff9800,stroke-width:2px
    style slice4 fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px
    style slice5 fill:#fff8e1,stroke:#ffc107,stroke-width:2px

    %% Node styling
    classDef ui fill:#ffb6c1,stroke:#d87093,color:#000
    classDef nonui fill:#d3d3d3,stroke:#808080,color:#000
    class U1,U2,U4,U5,U6,U7,U8,U9,U10,U11,U12 ui
    class N1,N2,N3,N4,N5,N6,N7,N8 nonui
```

**Legend:**
- **Pink nodes (U)** = UI affordances
- **Grey nodes (N)** = Code affordances
- **Solid lines** = Wires Out (calls, triggers)
- **Dashed lines** = Returns To (data flowing back to UI)

---

## Slices Grid

|  |  |  |
|:--|:--|:--|
| **[V1: STATIC LIST PAGE](./v1-plan.md)**<br>⏳ PENDING<br><br>• Update page.tsx payload<br>• Split-pane layout scaffold<br>• Service rows with all badges<br>• Copy link functional<br><br>*Demo: Browse services; correct badges/labels; Copy link copies URL* | **[V2: SELECTION + FORMS](./v2-plan.md)**<br>⏳ PENDING<br><br>• Editor state (selectedId, mode, baseline, draft)<br>• Row click → edit form<br>• Add New → create form with defaults<br>• Cancel (edit revert / create exit)<br><br>*Demo: Click row → form populates; Add New → blank form; Cancel works* | **[V3: MUTATIONS](./v3-plan.md)**<br>⏳ PENDING<br><br>• Refactor actions.ts to ActionResult<br>• Save in edit mode (updateEventType)<br>• Save in create mode (createEventType → id)<br>• Mutation feedback (pending/success/error/fieldErrors)<br><br>*Demo: Edit + Save → list updates; Create → new service in list* |
| **[V4: DIRTY GUARD](./v4-plan.md)**<br>⏳ PENDING<br><br>• Dirty tracker (draft vs baseline)<br>• Dirty-navigation gate (all intents)<br>• Discard confirmation dialog<br>• beforeunload hook + nav lock<br><br>*Demo: Edit field, switch rows → dialog; browser close → native prompt* | **[V5: RESTORE](./v5-plan.md)**<br>⏳ PENDING<br><br>• Restore button wired (U4 → N3 → N7)<br>• Restore-current dialog variant<br>• Post-restore: row selected, edit mode<br>• • &nbsp;<br><br>*Demo: Restore hidden/inactive service → becomes public, editor shows fresh values* | |

---

## V1: Static list page

### UI Affordances

| ID | Name | Place | Description | Wires Out |
|----|------|-------|-------------|-----------|
| U2 | Service row | Service List | Name, duration, deposit (override or "Policy default"), Default badge, Hidden/Inactive state badges; selected-row highlight; Add New and Restore buttons render but are not yet functional | → N3 (wired in V2/V5) |
| U5 | Copy link button | Service List | Visible only when `isActive=true`; copies `${bookingBaseUrl}?service=${id}` to clipboard | → clipboard (bypasses gate) |
| U6 | Empty pane | Editor Pane | Static text: "Select a service to edit, or click Add New" (or no-services variant) | — |

### Non-UI Affordances

| ID | Name | Place | Description | Wires Out |
|----|------|-------|-------------|-----------|
| N8 | Services query | Server | `page.tsx` updated: adds `shopPolicies` to `Promise.all`; builds `ShopContext` (`slotMinutes`, `defaultBufferMinutes`, `defaultDepositCents`, `bookingBaseUrl`); passes `ServicesPagePayload` to shell | → U2 (populate list) |

**Scope note:** Split-pane shell layout is scaffolded as a client component. U1 (Add New) and U4 (Restore) render visually but trigger no action. Editor pane always shows U6.

---

## V2: Selection + editor forms

### UI Affordances

| ID | Name | Place | Description | Wires Out |
|----|------|-------|-------------|-----------|
| U1 | Add New button | Services Page | Click enters create mode | → N3 (wired in V4; direct to N1 for now) |
| U7 | Edit form | Editor Pane | 7 editable fields pre-filled from baseline on row selection | → N2 (field change; wired in V4) |
| U8 | Create form | Editor Pane | Blank form initialised with R4.1 defaults | → N2 (field change; wired in V4) |
| U10 | Cancel button | Editor Pane | Edit: revert draft to baseline, stay on row. Create (pristine): exit to empty pane. Create (dirty): gated in V4 | → N1 |

### Non-UI Affordances

| ID | Name | Place | Description | Wires Out |
|----|------|-------|-------------|-----------|
| N1 | Editor state | Client State | `selectedId`, `mode` (`empty\|edit\|create`), `baseline`, `draft` — drives pane render; `dirty` / `pendingTarget` / `confirmState` added in V4 | → U6 / U7 / U8 (mode drives pane render) |

**Scope note:** No dirty tracking yet. Cancel in create mode always exits immediately in this slice (dirty path wired in V4). No Save wired.

---

## V3: Mutations

### UI Affordances

| ID | Name | Place | Description | Wires Out |
|----|------|-------|-------------|-----------|
| U9 | Save button | Editor Pane | Submits mutation; shows pending spinner; disabled during save | → N5 (edit mode) / N6 (create mode) |
| U11 | Mutation feedback | Editor Pane | Pending spinner inline with Save; per-field error messages; form-level error banner; brief success indicator | — |

### Non-UI Affordances

| ID | Name | Place | Description | Wires Out |
|----|------|-------|-------------|-----------|
| N5 | updateEventType | Server Actions | Refactored: typed `ServiceEditorValues` param; returns `ActionResult`; on success: `revalidatePath`, baseline updated | → N1 (success) / U11 (error) / N8 (revalidate) |
| N6 | createEventType | Server Actions | Refactored: returns `ActionResult<{ id: string }>`; on success: `revalidatePath`, `selectedId←id`, `mode=edit` | → N1 (success) / U11 (error) / N8 (revalidate) |
| N7 | restoreEventType | Server Actions | New action: `isHidden=false` + `isActive=true`; returns `ActionResult`; `revalidatePath` — client-wired in V5 | → N8 (revalidate) |

**Scope note:** `actions.ts` fully refactored to `ActionResult` envelope. Inline validation (fieldErrors) wired to form fields. N7 exists but has no client trigger until V5.

---

## V4: Dirty guard + confirmation

### UI Affordances

| ID | Name | Place | Description | Wires Out |
|----|------|-------|-------------|-----------|
| U12 | Confirmation dialog | Overlay | Generic variant: "Discard unsaved changes?" / "Keep editing" / "Discard changes". Restore-current variant added in V5 | → N1 (Keep editing or Confirm) / N7 (Confirm restore, V5) |

### Non-UI Affordances

| ID | Name | Place | Description | Wires Out |
|----|------|-------|-------------|-----------|
| N2 | Dirty tracker | Client State | Compares all 7 draft fields against baseline; sets `dirty` flag after every field change | → N1 (update dirty) / N4 (sync beforeunload) |
| N3 | Dirty-navigation gate | Client State | Intercepts row click / Add New / Cancel-create / mobile Back; if pristine → proceed; if dirty → store `pendingTarget`, open U12 | → U12 (dirty) / N1 (pristine) |
| N4 | beforeunload hook | Client State | Attaches native `beforeunload` listener when `dirty=true`; detaches when `dirty=false` | → browser |

**Scope note:** `pendingTarget` and `confirmState` added to N1 state. Save-pending nav lock (A12) disables all navigation during mutations. U10 create+dirty path now routes through N3. Mobile Back treated as `{ kind: "empty" }` target.

---

## V5: Restore action

### UI Affordances

| ID | Name | Place | Description | Wires Out |
|----|------|-------|-------------|-----------|
| U4 | Restore button | Service List | Now wired; visible when `isHidden=true` OR `isActive=false`; routes through N3; shows pending state | → N3 |
| U12 | Confirmation dialog (restore-current variant) | Overlay | "Restore service and discard edits?" / "Keep editing" / "Restore service" — used when dirty and restoring the currently open row | → N7 (Confirm) / N1 (Keep editing) |

### Non-UI Affordances

| ID | Name | Place | Description | Wires Out |
|----|------|-------|-------------|-----------|
| N7 | restoreEventType | Server Actions | Now client-wired; on success: `selectedId←id`, `mode=edit`, baseline = restored service values from refreshed list | → N1 (success) / U11 (error) / N8 (revalidate) |

**Scope note:** After restore, the list revalidates via `revalidatePath`. The client finds the restored service in the refreshed list and sets it as the new baseline.
