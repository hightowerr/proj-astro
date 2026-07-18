# Slice 7 — Grid cadence guidance hint

**Spec**: 07
**Wave**: 3 (polish)
**Effort**: Small
**Design prototype**: `docs/shaping/configurable-durations/designs/Service Editor Grid Cadence Hint (standalone).html`

## Change

`src/app/app/settings/services/service-editor-form.tsx` — add a conditional hint below the duration helper text.

### 1. Compute `showGridHint`

Inside the `ServiceEditorForm` component body, after the existing duration-related code:

```ts
const showGridHint =
  draft.durationMinutes > 0 &&
  shopContext.slotMinutes > 0 &&
  draft.durationMinutes >= shopContext.slotMinutes * 4;
```

### 2. Render the hint

Between the helper text ("In 5-minute steps...") and the error message / next field, conditionally render:

```tsx
{showGridHint ? (
  <p className="text-xs pl-1" style={{ color: "var(--al-on-surface-variant)", opacity: 0.7 }}>
    Your calendar grid is set to {shopContext.slotMinutes}-minute slots.
    For longer services, consider adjusting your slot length in{" "}
    <a href="/app/settings/availability" className="underline">
      Availability settings
    </a>.
  </p>
) : null}
```

### Visual reference (from design prototype)

| Element | Value |
|---------|-------|
| Position | Below helper text, above Price field |
| Font size | `text-xs` (12px) |
| Color | `var(--al-on-surface-variant)` = `#43474f` |
| Opacity | `0.7` |
| Font weight | Regular (400) — guidance tone, no emphasis |
| Text transform | None (sentence case) |
| Link text | "Availability settings" — underlined |
| Link color | Inherits parent (not `text-primary`) |
| Link href | `/app/settings/availability` |

### Threshold rationale

`4×` means:
- 60-min service on 15-min grid → no hint (4× exactly = show)
- 120-min service on 15-min grid → hint (8×)
- 180-min service on 60-min grid → no hint (3×)
- 480-min service on 60-min grid → hint (8×)

The threshold is inclusive (`>=`).

## Files to modify

| File | Change |
|------|--------|
| `src/app/app/settings/services/service-editor-form.tsx` | Add `showGridHint` variable + conditional `<p>` element |

## Acceptance criteria

1. Hint does NOT appear when `durationMinutes < slotMinutes * 4`
2. Hint appears when `durationMinutes >= slotMinutes * 4`
3. Hint is positioned between the helper text and the Price field
4. Hint copy: "Your calendar grid is set to {N}-minute slots. For longer services, consider adjusting your slot length in Availability settings."
5. "Availability settings" is a link to `/app/settings/availability`
6. Hint uses `--al-on-surface-variant` with `opacity: 0.7` (informational, not alarming)
7. No warning/status color — guidance tone only
8. `pnpm check` clean

## Dependencies

- Slice 4 (number input exists — hint goes below it)
