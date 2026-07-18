# Spec 03 — Replace service editor duration dropdown with number input

**Priority**: P1 (UI reflects the new validation freedom)
**Type**: UI change — settings
**Risk**: Low
**Design**: [`designs/Service Editor Duration Input 1a (standalone).html`](../designs/Service%20Editor%20Duration%20Input%201a%20(standalone).html)

## Change

`src/app/app/settings/services/service-editor-form.tsx` lines 294-297 and 356-370.

### Remove generated dropdown options (lines 294-297)

```diff
- const durationOptions = Array.from(
-   { length: Math.max(1, Math.floor(MAX_SERVICE_DURATION_MINUTES / shopContext.slotMinutes)) },
-   (_, index) => (index + 1) * shopContext.slotMinutes,
- );
```

The `shopContext.slotMinutes` dependency for duration options is eliminated. The `shopContext` prop may still be needed for other fields — verify before removing.

### Replace `<select>` with number input + custom stepper (lines 356-370)

Replace the `<select>` with a composite input containing:

1. **`<input type="number">`** — `min={5}`, `max={MAX_SERVICE_DURATION_MINUTES}` (480), `step={5}`
2. **Inline "min" suffix** — static text inside the input wrapper, right-aligned before the stepper
3. **Custom stepper arrows** — two stacked buttons (Increase / Decrease) using Material Icons `keyboard_arrow_up` and `keyboard_arrow_down`, positioned at the right edge of the input
4. **Helper text below** — "In 5-minute steps, up to 8 hours (480 min)."

```diff
- <select
-   className={cn(
-     getFieldClassName(Boolean(fieldErrors.durationMinutes)),
-     "appearance-none pr-12",
-   )}
-   id="service-duration"
-   onChange={(event) => onFieldChange("durationMinutes", Number(event.target.value))}
-   value={String(draft.durationMinutes)}
- >
-   {durationOptions.map((minutes) => (
-     <option key={minutes} value={minutes}>
-       {minutes} mins
-     </option>
-   ))}
- </select>
+ {/* Duration input wrapper: number input + "min" suffix + stepper buttons */}
+ <div className={/* input wrapper — flex row, items-center */}>
+   <input
+     type="number"
+     className={getFieldClassName(Boolean(fieldErrors.durationMinutes))}
+     id="service-duration"
+     min={5}
+     max={MAX_SERVICE_DURATION_MINUTES}
+     step={5}
+     aria-label="Time Commitment"
+     onChange={(event) => onFieldChange("durationMinutes", Number(event.target.value))}
+     value={draft.durationMinutes}
+   />
+   <span className={/* suffix — "min" text, right-aligned */}>min</span>
+   <div className={/* stepper — two stacked buttons */}>
+     <button type="button" aria-label="Increase" onClick={/* increment by step */}>
+       <span className="material-symbols-outlined">keyboard_arrow_up</span>
+     </button>
+     <button type="button" aria-label="Decrease" onClick={/* decrement by step */}>
+       <span className="material-symbols-outlined">keyboard_arrow_down</span>
+     </button>
+   </div>
+ </div>
+ <p className={/* helper text */}>In 5-minute steps, up to 8 hours (480 min).</p>
```

Remove the chevron icon span below the old `<select>` (approx lines 371-374) — replaced by custom stepper arrows.

### Visual details (from design prototype)

| Element | Detail |
|---------|--------|
| Input wrapper | Flex row, border-radius matching existing fields, border on focus |
| Number input | Hide native browser stepper (`appearance: textfield` / `::-webkit-inner-spin-button { display: none }`) |
| "min" suffix | Static text, right of the value, muted color, inside the input border |
| Stepper buttons | Two vertically-stacked icon buttons at the right edge, inside the input border |
| Helper text | Below input — same style as existing helper text patterns |

### Import

Ensure `MAX_SERVICE_DURATION_MINUTES` is imported from `./constants` (may already be imported for the dropdown generation).

## Dependencies

- Spec 01 (MAX raised to 480) — so `max={MAX_SERVICE_DURATION_MINUTES}` shows 480.
- Spec 02 (validation removed) — so the backend accepts non-multiple values the input now allows.

## Acceptance Criteria

1. Service editor shows a number input for "Time Commitment", not a dropdown.
2. Input has `min=5`, `max=480`, `step=5`.
3. "min" suffix is displayed inline, right of the value, inside the input border.
4. Custom stepper arrows (up/down) are rendered — native browser stepper is hidden.
5. Helper text below: "In 5-minute steps, up to 8 hours (480 min)."
6. Stepper buttons have accessible labels ("Increase" / "Decrease").
7. Existing services with values like 60, 120, 180 pre-populate correctly in the input.
8. Typing a value like 75 and saving succeeds (backend accepts it per Spec 02).
9. The chevron dropdown icon is removed.
10. `pnpm check` clean.
