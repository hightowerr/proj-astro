# Regression Report: Services Management Page

**Project:** Booking/Appointment Management System  
**Date:** Tuesday, April 14, 2026  
**Status:** ✅ All original functional requirements verified

---

## Executive Summary

The Services Management page (`/app/settings/services`) has been audited against the original functional requirements defined in `docs/shaping/services-page/shaping.md`. The current implementation faithfully reproduces the "Split-Pane Service Management" shape (Shape A) with all defined draft semantics, navigation gates, and visual styles. No regressions were found in event handling, responsive behavior, or accessibility.

---

## 1. Functional Requirements Verification (R0–R8)

| ID | Requirement | Result | Evidence |
|----|-------------|:---:|----------|
| **R1** | Split-pane layout with 3 modes (empty, edit, create) | ✅ | `ServicesEditorShell` manages `mode` state and renders `EmptyPane`, `ServiceEditorForm`, or list based on state. |
| **R2** | Scannable list with state badges & Copy link | ✅ | `ServiceListRow` renders Hidden/Inactive badges and provides a Copy link only for active services. |
| **R3** | Edit flow with Save/Cancel & 7 editable fields | ✅ | `ServiceEditorForm` supports all fields; `updateEventType` action persists changes. |
| **R4** | Create flow with defaults & success redirection | ✅ | `getCreateDefaults` provides initial values; success selects the new row and enters edit mode. |
| **R5** | Dirty navigation gate & Discard confirmation | ✅ | `handleNavIntent` intercepts transitions; `DiscardConfirmationDialog` gates unsaved changes. |
| **R6** | Restore action (returns to Public/Bookable) | ✅ | `restoreEventType` sets `isHidden=false` and `isActive=true` as required. |
| **R7** | Inline validation & non-destructive errors | ✅ | `fieldErrors` from Server Actions are rendered inline; draft state is preserved. |
| **R8** | Server-rendered initial load & Server Actions | ✅ | `ServicesPage` (RSC) loads data; `actions.ts` provides typed `ActionResult` mutations. |

---

## 2. Event Handlers & Interaction Audit

### Navigation & Draft Management
- **Row Switching:** Correctly gated by `dirty` flag. Pristine switches immediately; dirty triggers `confirmState.open = true`.
- **Add New:** Correctly gated. Resets `selectedId` and initializes `create` mode defaults.
- **Cancel Behavior:** 
    - Edit mode: Reverts to `baseline`.
    - Create mode: Pristine exits to `empty`; dirty triggers confirmation.
- **Restore Logic:** Implementation follows "Full Restore" mandate (sets both `isHidden: false` and `isActive: true`).

### Mutation Feedback
- **Save Pending:** `savePending` state disables nav controls and Add New button (Save-pending nav lock).
- **Success State:** "Created" or "Refined" labels appear briefly with `done_all` icon before clearing.
- **Error State:** Field-level errors (e.g., "Name is required") render inline; form-level errors render in a top banner.

---

## 3. Responsive Behavior

### Desktop (xl+)
- **Layout:** Horizontal split-pane (`flex-row`).
- **Persistence:** Left pane (list) is scrollable; right pane (editor) is sticky (`xl:sticky xl:top-24`).

### Mobile (< xl)
- **Layout:** Stacked view. The list and editor use `max-xl:hidden` conditionally based on whether a service is selected or create mode is active.
- **Back Navigation:** The "All services" button on mobile correctly triggers the `handleNavIntent({ kind: "empty" })` gate, ensuring dirty drafts are not lost when returning to the list.

---

## 4. Accessibility & Design Compliance

### Contrast Ratios (Atelier Light)
Verified against the "Modern Atelier" design system tokens:
- **Primary Text:** `--al-primary` (`#001e40`) on `--al-surface` (`#f9f9f7`) → **16.0:1** (Passes AAA)
- **Secondary Text:** `--al-on-surface-variant` (`#43474f`) on `--al-surface` (`#f9f9f7`) → **9.2:1** (Passes AAA)
- **Error Text:** `--al-error` (`#ba1a1a`) on `--al-error-container` (`#ffdad6`) → **4.9:1** (Passes AA)

### Interactive Elements
- **Focus Rings:** All buttons and inputs use `focus-visible:ring-2 focus-visible:ring-primary` for clear keyboard navigation.
- **ARIA:**
    - `aria-invalid` correctly reflects validation state.
    - `aria-expanded` and `aria-controls` applied to the "More options" accordion.
    - `aria-hidden="true"` applied to decorative Material Symbols icons.
    - `role="group"` and `aria-labelledby` used for the Operational Buffer selection.

### Motion
- `useReducedMotion` hook from `framer-motion` is used to disable spring animations for users with motion sensitivity.

---

## 5. Identified Potential Improvements (Non-Regressions)
- **Deep Linking:** The shaping doc mentions `?serviceId=` for deep-linking as a "valid future addition". This is currently not implemented, consistent with the original scope.
- **List Search:** As the service catalog grows, a search filter in the left pane might be beneficial, though not required by the current PRD.

---
**Verified By:** Gemini CLI (Regression Tester)  
**Conclusion:** **PASS**
