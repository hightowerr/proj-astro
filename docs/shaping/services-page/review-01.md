# Review 01 — Services Page

## Verdict: REQUEST CHANGES

Three issues must be resolved before merge: the nested-button accessibility violation (B7), the incomplete state badges (B1), and the hidden copy-link for hidden+active services (B2). One additional issue -- list state divergence (B4) -- should be addressed but is lower urgency given the single-user context.

---

## Spec Compliance (R-by-R)

| R# | Requirement | Status | Notes |
|----|-------------|--------|-------|
| R0 | Browse, create, edit, restore from single split-pane page without silent data loss | PASS | All four operations functional; dirty guard prevents silent loss |
| R1 | Split-pane layout; 3 pane modes; mobile stacks with identical draft semantics | PASS | Desktop side-by-side (`xl:flex-row`), mobile stacked (`max-xl:hidden` toggling). Mobile Back button wired through dirty gate as `{ kind: "empty" }` |
| R1.1 | Left pane: compact service list | PASS | |
| R1.2 | Right pane supports 3 modes: empty, edit, create | PASS | `EmptyPane`, `ServiceEditorForm` with `mode` prop |
| R1.3 | No temporary list row during create mode | PASS | Create mode does not inject a placeholder row; new row only appears after successful save |
| R1.4 | Mobile stacked layout with dirty-gated Back | PASS | Back button at `services-editor-shell.tsx:527` calls `handleNavIntent({ kind: "empty" })` which routes through the dirty gate |
| R2 | Service list scannable; state combinations labeled; Copy link accessible for active services | FAIL | Two sub-requirement failures (R2.2, R2.3) |
| R2.1 | Each row shows name, duration, deposit, default badge | PARTIAL | Dimmed rows (`isHidden \|\| !isActive`) hide duration and deposit info (`service-list-row.tsx:112`). Spec does not exempt dimmed rows. Minor gap. |
| R2.2 | State badges: hidden-only -> Hidden; inactive-only -> Inactive; hidden+inactive -> both | FAIL | When `isHidden=true && isActive=false`, only "Hidden" badge renders. The "Inactive" badge condition at `service-list-row.tsx:103` is `!service.isActive && !service.isHidden`, which excludes the both-true case. See B1. |
| R2.3 | Copy link shown only for `isActive=true` services | FAIL | Condition at `service-list-row.tsx:166` is `showCopyLink && !isDimmed` where `isDimmed = isHidden \|\| !isActive`. A service that is `isActive=true, isHidden=true` (hidden but link-bookable) will not show the copy link. See B2. |
| R2.4 | Currently selected row visually distinct | PASS | Selected row gets white bg + shadow + ring at `service-list-row.tsx:64` |
| R3 | Edit flow with all 7 fields, state semantics, Save/Cancel, feedback | PARTIAL | Fields present; Save/Cancel work; state semantics hint missing (R3.2) |
| R3.1 | All 7 fields editable | PASS | name, description, durationMinutes, bufferMinutes, depositAmountCents, isHidden, isActive all present in `ServiceEditorForm` |
| R3.2 | UI makes state meaning explicit: hidden+active = link-bookable; inactive = unbookable | FAIL | Toggle labels are "Availability Status" and "Private Listing Only" with no descriptive helper text. The `ToggleField` type defines a `description` prop but the component signature omits it. See B5. |
| R3.3 | Save persists and refreshes baseline; shows pending/success/error | PASS | Pending spinner inline with Save; success shows "Refined" indicator; error banner + field errors render inline |
| R3.4 | Cancel in edit mode reverts draft to baseline; stays on same service | PASS | `handleCancel` resets draft, clears errors, preserves selectedId and mode |
| R4 | Create flow in right pane with defaults; no temp row; cancel/post-save defined | PASS | |
| R4.1 | Defaults: name/description empty, first valid duration, Shop Default buffer, blank deposit, isHidden=false, isActive=true | PASS | `getCreateDefaults()` at `services-editor-shell.tsx:98-108` matches spec |
| R4.2 | Cancel in create: pristine -> exit; dirty -> confirm | PASS | `handleCancel` for non-edit calls `handleNavIntent({ kind: "empty" })` which checks dirty state |
| R4.3 | On success: id returned, new row selected, mode=edit | PASS | `handleSave` create path at lines 280-301 sets selectedId, mode="edit", updates list |
| R5 | One active draft, dirty gates, beforeunload, save-pending lock, no draft overwrite | PASS | |
| R5.1 | One draft at a time; no per-row draft preservation | PASS | Single `draft` state variable; switching rows replaces it |
| R5.2 | Dirty = any editable field differs from baseline | PASS | `isDirtyValues` compares all 7 fields at `services-editor-shell.tsx:37-47` |
| R5.3 | Pristine: proceed immediately | PASS | `handleNavIntent` calls `applyTarget` directly when `!dirty` |
| R5.4 | Dirty: blocked behind confirmation | PASS | Opens `DiscardConfirmationDialog` with correct copy |
| R5.5 | Restore on currently open dirty row uses restore-specific copy | PASS | Variant check at `services-editor-shell.tsx:171` compares `target.id === selectedId` |
| R5.6 | Native beforeunload when dirty | PASS | `useEffect` at lines 72-84 attaches/detaches listener based on `dirty` |
| R5.7 | Save-pending disables navigation | PASS | `handleNavIntent` returns early when `savePending \|\| restorePendingId !== null`; Add New disabled; mobile Back disabled; Restore disabled |
| R5.8 | External data refresh must not overwrite dirty draft | PASS (by accident) | `useState(services)` ignores prop updates entirely, so dirty draft is never overwritten. Correct outcome but via a broken mechanism (see B4). |
| R6 | Restore: dedicated action, available when non-normal, always full restore, feedback | PARTIAL | |
| R6.1 | Restore available when isHidden=true OR isActive=false | PASS | `isDimmed` condition controls Restore button visibility |
| R6.2 | Restore always sets isHidden=false AND isActive=true | PASS | Server action at `actions.ts:277-284` and client state update both set these values |
| R6.3 | After restore: restored row selected, pane shows fresh committed values | PASS | `handleRestore` sets selectedId, mode=edit, baseline and draft from restored values. Minor concern about reading stale `serviceRows` (B6) but output is correct. |
| R6.4 | Restore shows pending/success/error states | PASS | Pending: "Restoring..." text on button; Error: banner with auto-dismiss; Success: row transitions to edit mode |
| R7 | Validation inline and non-destructive; matches backend rules | PARTIAL | |
| R7.1 | name required; duration multiple of slot and <= max; deposit blank or positive; default deactivation error | PASS | Zod schema + `validateDuration` + default-service guard all present. `.positive()` for deposit matches "blank or positive" literally. |
| R7.2 | Errors render inline; pane stays open; draft preserved | PASS | Field errors render below each field; form error renders as banner; draft untouched on error |
| R8 | Server-rendered, Server Actions, no client-fetch, no schema changes | PARTIAL | |
| R8.1 | Route server-renders initial services data | PASS | `page.tsx` loads via `Promise.all` and passes to shell |
| R8.2 | Client shell owns required state | PASS | All specified state variables present |
| R8.3 | Mutations via Server Actions; create returns id | PASS | `createEventType` returns `ActionResult<{ id: string }>` |
| R8.4 | No new client-side data-fetching layer or optimistic cache | FAIL | `useState(services)` with manual `setServiceRows` patches is effectively a client-side optimistic cache. The `services` prop from revalidation is ignored after mount. See B4. |
| R8.5 | No schema changes required | PASS | No modifications to `src/lib/schema.ts` |

---

## Boundary Violations

1. **R8.4 violation -- client-side state cache**: `useState(services)` in `services-editor-shell.tsx:50` creates a local copy of the service list that is manually patched after mutations. `revalidatePath` pushes fresh data via the `services` prop, but `useState` ignores prop changes after initialization. The shaping doc's revalidation strategy (shaping.md lines 385-398) explicitly states the list should update via `revalidatePath` re-rendering, not via a client cache. The correct approach is to derive the list from props (using the prop directly or syncing with a `useEffect` that respects `dirty` state per R5.8).

2. **Duration dropdown exceeds Zod max**: The client-side duration dropdown at `service-editor-form.tsx:83-86` generates options up to `480 / slotMinutes` slots (e.g., 480 minutes for 60-minute slots), but the Zod schema at `actions.ts:38` caps duration at 240 minutes. Options above 240 will pass client validation but fail server validation. The dropdown should be capped to match the backend limit or the backend limit should be raised. This is a functional mismatch, not gold-plating.

3. **No other boundary violations found**: No schema changes (R8.5 satisfied). No temporary list row during create (R1.3 satisfied). No auto-select on load. No `localStorage` or URL params. No `deleteEventType`. No client-fetch layer beyond the `useState` cache noted above.

---

## Bug Report Validation

| # | Report | Verdict | Evidence |
|---|--------|---------|----------|
| B1 | Incomplete State Badges (Hidden + Inactive) | TRUE POSITIVE | `service-list-row.tsx:103` -- condition `!service.isActive && !service.isHidden` means "Inactive" badge only renders when NOT hidden. When both flags are set, only "Hidden" appears. R2.2 requires both badges. |
| B2 | Incorrect Copy Link Visibility (Hidden + Active) | TRUE POSITIVE | `service-list-row.tsx:166` -- render condition `showCopyLink && !isDimmed` evaluates to `false` when `isActive=true, isHidden=true` because `isDimmed` is `true`. R2.3 requires copy link for all `isActive=true` services regardless of `isHidden`. |
| B3 | $0 Deposit Override Blocked by Validation | FALSE POSITIVE | R7.1 states "depositAmountCents blank or positive". `$0` is neither blank (null) nor positive (>0). The Zod `.positive()` at `actions.ts:43` correctly enforces the spec. The bug report argues for a business intent not captured in the requirements. If $0 waiver is desired, it should be a new requirement, not a bug fix. |
| B4 | List State Divergence (useState vs props) | TRUE POSITIVE | `services-editor-shell.tsx:50` -- `useState(services)` ignores subsequent prop updates from `revalidatePath`. Manual patches in `handleSave` and `handleRestore` keep the list in sync for the current session's own mutations, but the architecture contradicts R8.4 ("no client-side data-fetching layer or optimistic cache") and the shaping doc's revalidation strategy. After a successful mutation, the server-revalidated `services` prop is silently discarded. |
| B5 | Lack of State Semantics Clarity in Editor | TRUE POSITIVE | `service-editor-form.tsx:282-293` -- toggle labels "Availability Status" and "Private Listing Only" do not explain consequences. R3.2 requires: "hidden+active = publicly hidden but link-bookable; inactive = unbookable". The `ToggleField` type defines a `description` prop but the component omits it from its signature (`service-editor-form.tsx:46`). Low severity but a spec gap. |
| B6 | Incomplete Restore State Sync | TRUE POSITIVE (low impact) | `services-editor-shell.tsx:332` reads `serviceRows` before the batched `setServiceRows` update at line 320 takes effect. However, the code overrides `isHidden` and `isActive` explicitly (lines 339-340), and the restore action only modifies those two fields on the server. Other field values are inherently current. The stale-read is a code smell but does not produce incorrect output in practice. If B4 is fixed (list syncs from props), this issue resolves naturally. |
| B7 | Nested Buttons Accessibility Blocker | TRUE POSITIVE | `service-list-row.tsx:71+149` -- a `<button>` (Restore, line 149) is nested inside a `<motion.button>` (row, line 71) which renders as `<button>`. This is invalid HTML per the spec (interactive content cannot nest). Screen readers cannot reliably expose the inner button. `event.stopPropagation()` prevents the double-click at runtime but does not fix the DOM invalidity. |

---

## Appetite Assessment

The feature is scoped for a 2-week appetite across 5 slices. Based on the current implementation:

**Completed work**: All 5 slices are substantially implemented. The split-pane layout (V1), selection and forms (V2), mutations with ActionResult envelope (V3), dirty guard with confirmation dialog and beforeunload (V4), and restore action (V5) are all functional. The server payload contract, typed actions, and client state machine are fully wired.

**Remaining work**: The required changes below are scoped fixes, not new feature slices. Estimated effort:

- B7 (nested buttons): Restructure `ServiceListRow` to use `<article>` with `<div role="button">` or split into two sibling elements. ~30 minutes.
- B1 (state badges): Change the "Inactive" badge condition from `!isActive && !isHidden` to `!isActive`. ~5 minutes.
- B2 (copy link): Change render condition from `showCopyLink && !isDimmed` to `showCopyLink` (i.e., just `service.isActive`). ~5 minutes.
- B4 (list state divergence): Replace `useState(services)` with direct prop usage or add a `useEffect` that syncs props to state when `!dirty`. ~30 minutes.
- B5 (state semantics): Add helper text below toggles explaining hidden+active and inactive meanings. ~15 minutes.
- Duration dropdown cap: Clamp options to `Math.min(option, 240)` or derive max from backend. ~10 minutes.

**Total remaining**: Approximately 1.5-2 hours of targeted fixes. The feature is well within its appetite and can ship after these changes.

---

## Required Changes

1. **Fix nested button accessibility (B7, HIGH)**: Restructure `service-list-row.tsx` so the Restore button is not nested inside the `<motion.button>`. Options: (a) change the outer element from `<motion.button>` to `<motion.div role="button" tabIndex={0} onKeyDown={...}>` so that the inner `<button>` is no longer nested in an interactive element, or (b) move the Restore button outside the row button as a sibling element within the `<article>`.

2. **Fix incomplete state badges (B1, MEDIUM)**: In `service-list-row.tsx:103`, change `{!service.isActive && !service.isHidden ? (` to `{!service.isActive ? (` so the "Inactive" badge renders regardless of `isHidden`. When both are true, both badges will show.

3. **Fix copy link visibility for hidden+active services (B2, MEDIUM)**: In `service-list-row.tsx:166`, change the condition from `{showCopyLink && !isDimmed ? (` to `{showCopyLink ? (` so that `isActive=true, isHidden=true` services show the copy link.

4. **Fix list state divergence (B4, MEDIUM)**: Remove `useState(services)` and use the `services` prop directly for rendering the list. If local patching is needed for optimistic UI during the current request, use a `useEffect` to sync `serviceRows` from `services` whenever the prop changes AND `dirty` is false (respecting R5.8). Alternatively, remove all manual `setServiceRows` calls and rely entirely on `revalidatePath` to refresh the list.

5. **Add state semantics helper text (B5, LOW)**: Restore the `description` parameter to the `ToggleField` component and pass descriptive text: `isActive` toggle should show "When inactive, this service cannot be booked via any channel"; `isHidden` toggle should show "When hidden, this service is removed from public listings but remains bookable via direct link".

6. **Cap duration dropdown to match Zod max (LOW)**: In `service-editor-form.tsx:83-86`, filter the generated duration options to exclude values exceeding 240 minutes (or derive the max from a shared constant). Currently the dropdown offers options up to 480 minutes but the backend rejects anything over 240.
