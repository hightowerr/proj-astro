---
title: "Services Page: Split-pane service management"
type: "requirements"
status: "draft"
owner: "PM/Tech Lead"
appetite: "3 days"
dependencies:
  - "Existing services CRUD on event_types"
  - "Current service settings actions"
tech_stack:
  frontend:
    - "Next.js (App Router) + TypeScript"
    - "Tailwind"
  backend:
    - "Next.js Server Actions"
    - "Postgres"
    - "Drizzle ORM"
  testing:
    - "Vitest"
    - "Playwright"
success_criteria:
  - "A shop owner can browse, create, edit, and restore services from a split list/detail page."
  - "Dirty edits are never lost silently when switching rows, creating a new service, restoring, or leaving the page."
  - "Restore always returns a service to the normal public and bookable state."
  - "The UI clearly represents hidden and inactive service states and preserves current booking semantics."
principles:
  - "Keep the common path in one place: select, edit, save, restore."
  - "Use one active draft only."
  - "Make service visibility semantics explicit rather than burying them in menus."
  - "Do not turn this page into a general service-library or event-type settings system."
---

# Requirements: Services Page Split-pane Management

## Problem

The current services settings flow supports service CRUD, but it uses separate patterns for creating and editing services. The proposed feature is a single split-pane services page where the owner can scan services on the left and manage the selected service on the right.

The feature must fit the current `event_types` model without introducing schema changes, while resolving four gaps:

- `Add New` is not yet defined inside a split-pane interaction.
- Unsaved changes behavior is not defined when switching rows or actions.
- `Restore` is ambiguous because services can be hidden, inactive, or both.
- The service list must represent current service state combinations and existing booking behavior clearly.

## Goal

Deliver a simple, owner-facing services management page that:

- uses a split list/detail layout
- supports edit and create flows in the right pane
- protects against accidental loss of unsaved changes
- makes hidden and inactive states understandable
- keeps existing service CRUD semantics intact

This is an interaction-heavy authenticated dashboard feature, not a content page.

## Existing product rules to preserve

- Services are backed by the current `event_types` model.
- Editable fields remain:
  - `name`
  - `description`
  - `durationMinutes`
  - `bufferMinutes`
  - `depositAmountCents`
  - `isHidden`
  - `isActive`
- Supported buffer choices remain:
  - `Shop Default`
  - `None`
  - `5m`
  - `10m`
- Blank deposit override means `same as policy`.
- The default service can be shown with a `Default` badge.
- Hidden services are not shown in the public picker, but may still be directly bookable by link if they remain active.
- Inactive services are not bookable.
- If the shop has exactly one active visible service, the public booking flow skips the service picker and goes straight into booking.

## Functional requirements

### 1. Page layout

- The page must use a split-pane layout:
  - left pane: compact service list
  - right pane: detail editor
- The right pane must support three modes:
  - `empty`
  - `edit`
  - `create`
- The left pane must not show an unsaved temporary row during create mode.
- On narrow screens, the same feature may collapse into a stacked list-and-editor flow rather than forcing a desktop split pane. The draft model and confirmation behavior must stay the same.

### 2. Service list

- The left pane must show each service with enough summary information to support scanning:
  - name
  - duration
  - deposit override or inherited default
  - default badge when applicable
- The list must clearly represent service state combinations:
  - hidden-only: `Hidden`
  - inactive-only: `Inactive`
  - hidden-and-inactive: `Hidden` and `Inactive`
- The list must retain access to `Copy link`, because this exists in the current product.
- `Copy link` must not be blocked by dirty-state confirmation, because it does not mutate persisted data.
- The currently selected service must be visually distinct.
- The list should avoid three-dot-menu dependency for core actions like edit, restore, and visibility understanding.

### 3. Edit flow

- Selecting a service row opens that service in the right pane in `edit` mode.
- The editor must allow updating all currently supported service fields.
- The editor must make service state meaning explicit:
  - hidden + active means not shown publicly but still directly bookable by link
  - inactive means not bookable
- `Save` must persist changes and refresh the current service baseline.
- `Cancel` in edit mode must revert local changes to the last committed values and remain on the same service.
- The UI must show pending, success, and error states for save.

### 4. Add New flow

- `Add New` must switch the right pane into `create` mode.
- The create form must appear in the same right-hand detail pane used for editing.
- Default values for a new service must be:
  - `name`: empty
  - `description`: empty
  - `durationMinutes`: first valid slot option
  - `bufferMinutes`: `Shop Default`
  - `depositAmountCents`: blank
  - `isHidden`: `false`
  - `isActive`: `true`
- `Cancel` in create mode must abandon the local draft:
  - if pristine, exit create mode immediately
  - if dirty, require discard confirmation first
- On successful create:
  - the new service must be persisted
  - the new service id must be returned to the client
  - the new service becomes the selected row
  - the right pane remains open in `edit` mode for that service

### 5. Unsaved changes behavior

- The page must maintain one active draft only.
- The page must not preserve separate unsaved drafts per service row.
- Dirty means any editable field differs from the current committed baseline.
- If the editor is pristine, these actions may proceed immediately:
  - selecting another row
  - clicking `Add New`
  - clicking `Restore`
  - clearing the pane
- If the editor is dirty, those actions must be blocked behind discard confirmation.
- Confirmation copy should be simple and explicit:
  - title: `Discard unsaved changes?`
  - body: `You have unsaved changes in this service. Discard them and continue?`
  - actions: `Keep editing` and `Discard changes`
- If the user triggers `Restore` for the currently open dirty row, the UI should use a restore-specific confirmation.
- Browser-level navigation away from the page must use a native `beforeunload` warning when the editor is dirty.
- While save is pending, navigation controls should be disabled to avoid race conditions.
- External data refresh must not hot-swap a dirty form underneath the user. The local draft remains visible until the user saves, cancels, or discards.

### 6. Restore behavior

- `Restore` must be available for any service that is not already normal:
  - `isHidden === true`, or
  - `isActive === false`
- `Restore` must always mean:
  - set `isHidden = false`
  - set `isActive = true`
- `Restore` must not depend on how the service previously became hidden or inactive.
- After restore succeeds:
  - the restored row becomes selected
  - the editor shows the fresh committed values
- If the currently open row is dirty and the user triggers restore on that same row, the UI should use a restore-specific confirmation.
- The UI must show pending, success, and error states for restore.
- `Restore` should be implemented as a dedicated action, not inferred inside the standard save path.

### 7. Validation and constraints

- Validation rules must match current backend rules:
  - `name` is required
  - `durationMinutes` must be a multiple of the shop slot size
  - `durationMinutes` must be less than or equal to the current max limit
  - `depositAmountCents` must be blank or positive
  - deactivating the default service must be handled with a clear error state if disallowed by current logic
- Validation errors must render inline in the right pane.
- Validation errors must not close the pane or clear the draft.

## Non-functional requirements

### Design direction

The page should follow the design direction already captured in the stitched design artifact:

- warm, editorial visual style rather than default SaaS styling
- Manrope typography
- tonal layering and background shifts instead of heavy divider lines
- soft, premium surfaces with restrained shadow use
- clear, spacious hierarchy for list and editor content

### Technical approach

- The route should stay server-rendered for initial data loading.
- One client editor shell should own:
  - selected row state
  - `empty | edit | create` pane mode
  - dirty tracking
  - discard confirmation
  - pending navigation target
- Mutations should use Server Actions for create, update, and restore.
- `createEventType` must return the created id so the UI can select the new row deterministically after save.
- The feature should not add a client-side data fetching layer or optimistic cache system for this bet.

### Implementation constraints

- The feature should reuse the current service model and server validation.
- No schema changes are required for this feature.
- A dedicated restore action is preferred over overloading general save behavior.
- The create action should return the new service id so the UI can select it deterministically.
- The page should remain mostly server-rendered and move only the interaction shell client-side.

## Out of scope

- schema redesign for services
- per-row draft preservation
- auto-save
- modal or separate-page create flow
- service-level permissions changes
- changing public booking semantics for hidden direct-link services
- redesigning service pricing or policy logic
- service variations
- resources, staff assignment, or location-availability mapping
- advanced tabs such as limits, recurring, payments, hosts, or team settings
- import flows, migration helpers, or CSV onboarding

## Acceptance criteria

1. A shop owner can open the services page and see a left-hand list plus right-hand detail pane.
2. Selecting a service loads its editable data into the right pane.
3. Clicking `Add New` opens a create form in the right pane without adding a temporary list row.
4. Saving a new service selects it in the list and keeps the pane open in edit mode.
5. Dirty changes are never discarded without explicit confirmation.
6. `Cancel` reverts edits in edit mode and abandons drafts in create mode.
7. `Restore` always returns a service to `isHidden=false` and `isActive=true`.
8. The service list clearly distinguishes hidden, inactive, and hidden-plus-inactive states.
9. Existing service actions and validations continue to work with the split-pane UI.
10. Hidden services remain directly bookable by copied link unless they are also inactive.
11. The page works on mobile with the same create/edit/dirty-state rules, even if the layout stacks instead of splitting.

## QA expectations

- Unit tests for:
  - create result returning new service id
  - restore action semantics
  - validation for duration and deposit override
  - dirty-state transitions for edit and create modes
- Playwright coverage for:
  - switching rows with dirty edits
  - add-new create flow
  - restore flow
  - browser warning on dirty unload
