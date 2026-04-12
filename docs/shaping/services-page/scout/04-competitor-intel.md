# Competitor Intel

Reviewed on 2026-04-10.

## Screenshots

- Square Support flow: `output/playwright/square-services-help.png`
- Calendly event type setup: `output/playwright/calendly-event-type-help.png`
- Cal.com first event type flow: `output/playwright/calcom-event-type-help.png`

## 1. Square Appointments

Source:

- https://squareup.com/help/us/en/article/6487-create-and-manage-services

What it shows:

- Square treats services as a broad service-library object, not a lightweight booking preset.
- Create flow includes image, location availability, taxes, pricing mode, cost tracking, duration, processing time, blocking extra time, online booking, resources, variations, and advanced settings.
- “Bookable by customers online” is managed partly through staff/team settings, not just the service record.

Implementation observation:

- This is a warning against scope creep. Once service metadata, staff assignment, booking visibility, and advanced options are mixed together, the page stops being a simple service editor.

Performance note:

- Public help shell loaded about 37 resources and completed around 2.8s on this run. Not a product benchmark, but it reinforces the cost of broad support-site shells and multi-purpose product models.

Takeaway for us:

- Do not copy the service-library model.
- Keep this bet focused on service metadata plus visibility and activity.
- Keep team/staff mapping elsewhere.

## 2. Calendly

Sources:

- https://help.calendly.com/hc/en-us/articles/14048303578391-How-to-set-up-an-event-type
- https://help.calendly.com/hc/en-us/articles/25514735112215-Event-type-editor-overview
- https://help.calendly.com/hc/en-us/articles/1500004754122-How-to-fine-tune-your-availability-settings
- https://help.calendly.com/hc/en-us/articles/16707065387031-Event-type-permissions

What it shows:

- Calendly’s common create flow is:
  1. Go to Scheduling
  2. Click `+ Create`
  3. Choose an event type
  4. Edit details in a right-hand editor
- That validates the split-pane/editor-on-right pattern.
- Secret/public behavior is not in the main editor. Their help docs say users hide an event from the Scheduling page via a three-dot menu, and invitees can still book it with a direct link.
- Permissions and shared/team variants add another layer of complexity around who can edit what.

Implementation observation:

- Calendly proves the right-hand editor is a familiar pattern.
- It also shows the downside of burying state changes like secret/public inside card menus instead of keeping them legible in the editor.

Performance note:

- Public help shell loaded about 89 resources and finished around 2.5s on this run. Again, this is directional, not an authenticated-app benchmark.

Takeaway for us:

- Keep `Hidden` or equivalent visibility state explicit in the editor.
- Avoid three-dot-menu dependency for the most important service states.
- Avoid permission complexity in this bet.

## 3. Cal.com

Sources:

- GitHub reference surfaced: `calcom/cal.com`
- https://cal.com/help/event-types/create-first-event
- https://cal.com/help/event-types/secret-events
- https://cal.com/docs/atoms/event-type
- https://cal.com/docs/atoms/list-event-types

What it shows:

- Cal.com starts with a small create dialog: title, URL, description, and length.
- Public docs then point toward a much larger settings surface for event types.
- Their docs expose dedicated atoms for:
  - list event types
  - create event type
  - event type settings
- Their event-type settings atom exposes tabs like `setup`, `limits`, `recurring`, `advanced`, `availability`, `team`, and `payments`, plus `onFormStateChange` for dirty tracking.
- Secret events are first-class. Hidden events are bookable only by private link and don’t appear on the public page.

Implementation observation:

- Cal.com is the clearest signal that event-type editors naturally sprawl. They needed dedicated abstractions just to manage settings and dirty form state.
- That does not mean we should copy the scope. It means we should hold the line hard.

Performance note:

- Public help shell loaded about 139 resources and finished around 2.35s on this run. The volume reinforces the value of keeping our settings page narrow and mostly server-rendered.

Takeaway for us:

- Hidden/direct-link-only is a normal product pattern, so our current hidden-service semantics are defensible.
- The real shaping question is naming and restore behavior, not whether the state itself is valid.
- Do not let this bet turn into a multi-tab event settings system.

## Gaps competitors missed or over-complicated

- Square splits core service editing from bookability and staff assignment.
- Calendly makes “secret/public” a secondary menu action.
- Cal.com exposes enough advanced settings to require dedicated atoms and form-state hooks.

## Our advantage

- We already have the core service model and booking semantics.
- We can keep the entire common path in one place:
  - scan rows
  - select row
  - edit in place
  - save or restore
- We do not need a second system for teams, hosts, permissions, or scheduling variants to ship this feature.

## Stitch opportunities

- Turn state chips into a clear language system: `Default`, `Hidden`, `Inactive`.
- Make the selected row and current editor feel tightly connected.
- Use a strong empty state for `create` mode so “new service” feels intentional, not like an inline hack.
- Make the discard-confirmation UI feel confident and lightweight, since that interaction is central to the bet.
