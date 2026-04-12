# requirements-05

## Summary
- This proposal is broadly compatible with the current app. The remaining mismatches are mostly interaction-level rather than schema-level: the `Add New` flow is not defined, the split-pane editor still needs unsaved-change handling, and the compact service list does not fully represent all current service state combinations.

## Supported now
- A split list/detail layout for selecting and editing services is compatible with the current `event_types` model.
- Listing services with summary fields such as duration, deposit override, and inherited `Shop Default` buffer is supported now.
- Showing a `Default` badge for the default service fits the current services model.
- Editing service name, duration, description, buffer selection, active status, hidden status, and optional deposit override is supported by the current services settings action.
- Supporting `None`, `5m`, `10m`, and `Shop Default` as buffer choices matches the current schema and scheduling logic.
- Leaving the deposit override blank to mean `same as policy` fits the current backend validation.
- A `Restore` action is implementable with the current booleans by setting `isHidden=false` and `isActive=true`.

## Needs spike

### Add New flow
- Assumption: `Add New` opens a valid create flow that works within the split-pane layout.
- Uncertainty: The current app supports creating services, but this screen does not define where the blank create form appears, how it differs from edit mode, or what happens if the user starts creating a service and then selects another row.
- Spike needed: Prototype the create flow inside the split-pane interaction, including default values, cancel behavior, validation, and how unsaved draft state is handled when switching selection.

### Split-pane unsaved changes behavior
- Assumption: The user can safely move between rows in the left pane while editing on the right.
- Uncertainty: The current implementation is form-per-row and does not define cross-row editing state. This design introduces a new navigation/editing model, but it does not specify whether unsaved changes are auto-discarded, blocked behind confirmation, or preserved per selection.
- Spike needed: Build a local interaction prototype that covers row switching with dirty form state, `Cancel`, restore, and add-new transitions.

### Restore semantics
- Assumption: `Restore` always means the same thing for a service that has been removed from normal use.
- Uncertainty: The current model has two booleans, `isHidden` and `isActive`. The compact list only shows `Hidden` on the restored row, so it is unclear whether restore should only unhide, fully reactivate, or depend on which state caused the service to disappear.
- Spike needed: Define restore rules for hidden-only, inactive-only, and hidden-plus-inactive services, then wire the action to those rules consistently.

## Not feasible now
- None.

## Functional gaps
- Missing state representation: The compact list does not clearly represent all existing service state combinations, especially active-but-hidden versus inactive-but-visible versus hidden-and-inactive.
- Missing validation: Duration still needs explicit validation and messaging for values that are not multiples of the shop slot size or exceed current limits.
- Missing validation: There is no visible error state for invalid duration, invalid deposit input, or attempting to deactivate the default service.
- Missing state handling: The design does not show pending, success, or error states for save, restore, copy-link, or add-new actions.
- Missing state handling: `Cancel` is present, but the screen does not define whether it reverts form state, clears selection, or exits edit mode.
- Missing state handling: The screen does not define what happens when the selected service is restored, hidden, or deactivated from another action while it is open in the right pane.
- Missing edge-case handling: Hidden services remain directly bookable if someone has a copied service link; the design does not clarify whether that is intended.
- Missing edge-case handling: Inactive services are not directly bookable, so copied links to inactive services fail.
- Missing edge-case handling: If the shop has exactly one active visible service, the public booking page skips the service picker and goes straight into booking.
- Missing operational handling: The design no longer exposes `Copy link` in the list/detail layout, so the intended place for that existing action is unclear.
- Missing permissions handling: The page still assumes a single owner-managed settings surface; there is no separate service-level permissions model.

## Recommended scope cuts
- Keep the split-pane layout if desired, but treat `Add New` as in scope only after the create-mode interaction is fully defined.
- Keep the editor limited to current service CRUD fields and existing semantics.
- Preserve a clear way to represent and edit both `Active` and `Hide from public`, since both are part of the current service model.
- Keep restore narrowly defined until the team agrees whether it unhides, reactivates, or does both.
