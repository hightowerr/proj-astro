# Marketing & Content Edit Guide: Reminders

## How to talk about this feature
When marketing the "Customizable Reminders" feature, emphasize:
- **Reduced No-Shows**: Shops can set up multiple touchpoints (e.g., 24h before AND 1h before).
- **Industry Specificity**: Different business types (Hairstylists vs. Therapists) have different needs.
- **Set it and Forget it**: Once configured, the system automatically handles the timing per appointment.

## Editing the Settings UI
If you need to change the labels or "Personas" in the settings screen:
1. Open `src/components/settings/reminder-timings-form.tsx`.
2. Locate the `PRESETS` array.
3. Edit the `badge` (short label), `fullLabel` (detailed description), or `persona` (the small tag like "Hairstylists").

*Example*:
```typescript
{ value: "24h", badge: "24 hr", fullLabel: "24 hours before", persona: "Most common" }
```

## Adding New Intervals
Adding a new interval (e.g., "3 days") requires a developer, as it involves:
- Updating the database schema constraint.
- Adding the logic to `src/lib/reminders.ts`.
- Adding the preset to the UI.

## Default Behavior
- All new shops default to a single **24-hour** reminder.
- All existing appointments from before this feature was launched were backfilled to the **24-hour** reminder.
