# Email/SMS Template Management — Frame

## Source

> Email/SMS template management — Reminders settings page exists but there is no UI for editing email/SMS templates
>
> — docs/app-breadboard.md, Dead Ends & Gaps

---

## Problem

- Shop owners cannot see what their email and SMS reminders say; templates are seeded from code defaults with no visibility in the app
- There is no way to personalise reminder content — shop name, tone, and call-to-action wording are all fixed
- The `/app/settings/reminders` page only exposes timing configuration (when to send), not content configuration (what to send)
- Debugging failed or wrong-content reminders requires direct database inspection

## Outcome

- Shop owners can view and edit email and SMS reminder templates from the reminders settings page
- Template variables (e.g. `{{shopName}}`, `{{appointmentTime}}`) are documented so owners cannot accidentally break them
- Owners can preview rendered output with sample data before committing a save
- Saved templates are picked up on the next reminder send without disrupting message logs or in-flight dedup
