# Spec 07 — Grid cadence guidance hint in service editor

**Priority**: P3 (UX polish — not blocking, but improves experience)
**Type**: UI change — settings
**Risk**: None
**Design**: [`designs/Service Editor Grid Cadence Hint (standalone).html`](../designs/Service%20Editor%20Grid%20Cadence%20Hint%20(standalone).html)

## Change

`src/app/app/settings/services/service-editor-form.tsx` — below the duration number input, add a contextual hint when the entered duration greatly exceeds the grid cadence.

### Logic

```ts
const showGridHint =
  draft.durationMinutes > 0 &&
  shopContext.slotMinutes > 0 &&
  draft.durationMinutes >= shopContext.slotMinutes * 4;
```

### Rendering

If `showGridHint` is true, render a `<p>` between the helper text ("In 5-minute steps...") and the next field (Price):

```tsx
<p className="text-xs" style={{ color: "var(--al-on-surface-variant)", opacity: 0.7 }}>
  Your calendar grid is set to {shopContext.slotMinutes}-minute slots.
  For longer services, consider adjusting your slot length in{" "}
  <a href="/app/settings/availability" className="underline">
    Availability settings
  </a>.
</p>
```

### Visual details (from design prototype)

| Element | Detail |
|---------|--------|
| Position | Below the helper text line ("In 5-minute steps..."), above the Price field |
| Copy | "Your calendar grid is set to {N}-minute slots. For longer services, consider adjusting your slot length in Availability settings." |
| Link text | "Availability settings" — underlined, links to `/app/settings/availability` |
| Style | Muted, low-contrast, non-blocking — `color: var(--al-on-surface-variant)`, `opacity: 0.7` |
| Behavior | Never uses a status/warning color — reads as guidance, not an error |
| Size | `text-xs` — same size tier as helper text |

### Threshold rationale

`4×` means: a 60-minute service on 15-minute grid → no hint. A 120-minute service on 15-minute grid → hint. A 180-minute service on 60-minute grid → no hint (only 3×). A 480-minute service on 60-minute grid → hint (8×). This surfaces the hint when the mismatch is large enough to matter but doesn't nag for normal cases. Threshold is inclusive (`duration >= slot * 4`).

## Dependencies

- Spec 03 (number input exists) — the hint goes below the number input.

## Acceptance Criteria

1. Hint does NOT appear when `durationMinutes < slotMinutes * 4`.
2. Hint appears when `durationMinutes >= slotMinutes * 4`.
3. Hint is positioned between the helper text and the Price field.
4. Hint copy: "Your calendar grid is set to {N}-minute slots. For longer services, consider adjusting your slot length in Availability settings."
5. "Availability settings" is a link to `/app/settings/availability`.
6. Hint uses `--al-on-surface-variant` with `opacity: 0.7` (informational, not alarming).
7. No warning/status color — guidance tone only.
8. `pnpm check` clean.
