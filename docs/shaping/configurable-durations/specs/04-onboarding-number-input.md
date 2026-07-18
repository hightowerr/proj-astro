# Spec 04 — Replace onboarding duration presets with number input

**Priority**: P1 (onboarding parity with settings editor)
**Type**: UI change — onboarding
**Risk**: Low
**Design**: [`designs/Onboarding Duration Input (standalone).html`](../designs/Onboarding%20Duration%20Input%20(standalone).html)

## Change

`src/components/onboarding/add-service-step.tsx`.

### Remove hardcoded DURATION_OPTIONS (lines 14-19)

```diff
- const DURATION_OPTIONS = [
-   { value: 60, label: "60 min" },
-   { value: 120, label: "120 min" },
-   { value: 180, label: "180 min" },
-   { value: 240, label: "240 min" },
- ] as const;
```

### Replace the duration radio/select with number input + custom stepper

Same composite input pattern as Spec 03 (service editor). Replace the existing duration selector with:

1. **Label**: "Duration *" (required)
2. **`<input type="number">`** — `min={5}`, `max={480}`, `step={5}`, `placeholder="e.g. 60"`
3. **Inline "min" suffix** — static text inside the input wrapper, right-aligned before the stepper
4. **Custom stepper arrows** — two stacked buttons (Increase / Decrease) using Material Icons `keyboard_arrow_up` and `keyboard_arrow_down`
5. **Helper text below** — "In 5-minute steps, up to 8 hours (480 min)."

```tsx
{/* Duration input wrapper: number input + "min" suffix + stepper buttons */}
<div className={/* input wrapper — flex row, items-center */}>
  <input
    type="number"
    id="duration"
    min={5}
    max={MAX_SERVICE_DURATION_MINUTES}
    step={5}
    placeholder="e.g. 60"
    aria-label="Duration"
    value={durationMinutes}
    onChange={(e) => setDurationMinutes(Number(e.target.value))}
    className={/* match existing field styling, hide native stepper */}
  />
  <span className={/* suffix — "min" text */}>min</span>
  <div className={/* stepper — two stacked buttons */}>
    <button type="button" aria-label="Increase" onClick={/* increment by step */}>
      <span className="material-symbols-outlined">keyboard_arrow_up</span>
    </button>
    <button type="button" aria-label="Decrease" onClick={/* decrement by step */}>
      <span className="material-symbols-outlined">keyboard_arrow_down</span>
    </button>
  </div>
</div>
<p className={/* helper text */}>In 5-minute steps, up to 8 hours (480 min).</p>
```

### Visual details (from design prototype)

| Element | Detail |
|---------|--------|
| Label | "DURATION *" — uppercase, same label style as "SERVICE NAME *" |
| Input wrapper | Same composite pattern as Spec 03 — flex row, input + suffix + stepper |
| Placeholder | `"e.g. 60"` — shown when input is empty |
| "min" suffix | Static text, right of the value, muted color, inside the input border |
| Stepper buttons | Two vertically-stacked icon buttons at the right edge, inside the input border |
| Helper text | "In 5-minute steps, up to 8 hours (480 min)." — below input |

### Default value

Keep `useState<number>(60)` (line 38) — 60 is a reasonable universal default. Business-type-specific defaults are deferred.

### Import

Add `import { MAX_SERVICE_DURATION_MINUTES } from "@/app/app/settings/services/constants"` and use it for `max` instead of hardcoding 480.

## Dependencies

- Spec 01 (MAX raised to 480) — so the imported constant is correct.
- Spec 02 (validation removed) — so `createEventType(formData)` at line 72 accepts non-multiple values.

## Acceptance Criteria

1. Onboarding "Add a service" step shows a number input for "Duration", not a dropdown or radio buttons.
2. Input has `min=5`, `max=480`, `step=5`.
3. Placeholder text: `"e.g. 60"`.
4. "min" suffix is displayed inline, right of the value, inside the input border.
5. Custom stepper arrows (up/down) are rendered — native browser stepper is hidden.
6. Helper text below: "In 5-minute steps, up to 8 hours (480 min)."
7. Stepper buttons have accessible labels ("Increase" / "Decrease").
8. Default value is 60.
9. Submitting with value 75 succeeds (backend accepts per Spec 02).
10. `pnpm check` clean.
