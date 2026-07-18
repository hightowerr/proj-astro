# Slice 4 — Service editor number input

**Spec**: 03
**Wave**: 2 (UI)
**Effort**: Medium
**Design prototype**: `docs/shaping/configurable-durations/designs/Service Editor Duration Input 1a (standalone).html`

## Changes

`src/app/app/settings/services/service-editor-form.tsx`:

### 1. Remove `durationOptions` generation (lines ~294-297)

Delete:
```ts
const durationOptions = Array.from(
  { length: Math.max(1, Math.floor(MAX_SERVICE_DURATION_MINUTES / shopContext.slotMinutes)) },
  (_, index) => (index + 1) * shopContext.slotMinutes,
);
```

**Note**: `shopContext.slotMinutes` is still needed for Spec 07 (grid hint) — do not remove the `shopContext` prop.

### 2. Replace `<select>` with composite number input (lines ~356-376)

Replace the `<select>` + chevron icon span with:

```tsx
<div className="relative flex items-center">
  <input
    type="number"
    className={cn(
      getFieldClassName(Boolean(fieldErrors.durationMinutes)),
      "[appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden pr-24",
    )}
    id="service-duration"
    min={5}
    max={MAX_SERVICE_DURATION_MINUTES}
    step={5}
    aria-label="Time Commitment"
    onChange={(event) => onFieldChange("durationMinutes", Number(event.target.value))}
    value={draft.durationMinutes}
  />
  <span
    className="absolute right-14 text-sm text-al-on-surface-variant/50 pointer-events-none select-none"
  >
    min
  </span>
  <div className="absolute right-2 flex flex-col gap-0.5">
    <button
      type="button"
      aria-label="Increase"
      className="flex items-center justify-center w-6 h-5 rounded bg-[#e2f0ea] hover:bg-[#d0e6dc] transition-colors"
      onClick={() => {
        const next = Math.min(draft.durationMinutes + 5, MAX_SERVICE_DURATION_MINUTES);
        onFieldChange("durationMinutes", next);
      }}
    >
      <span className="material-symbols-outlined text-sm" aria-hidden="true">keyboard_arrow_up</span>
    </button>
    <button
      type="button"
      aria-label="Decrease"
      className="flex items-center justify-center w-6 h-5 rounded bg-[#e2f0ea] hover:bg-[#d0e6dc] transition-colors"
      onClick={() => {
        const next = Math.max(draft.durationMinutes - 5, 5);
        onFieldChange("durationMinutes", next);
      }}
    >
      <span className="material-symbols-outlined text-sm" aria-hidden="true">keyboard_arrow_down</span>
    </button>
  </div>
</div>
```

### 3. Add helper text below the input (after the error message)

```tsx
<p className="text-[10px] font-extrabold uppercase tracking-widest pl-1 text-al-on-surface-variant/70">
  In 5-minute steps, up to 8 hours (480 min).
</p>
```

### 4. Remove the chevron icon span

Delete the `<span>` with `expand_more` icon (lines ~371-374).

### Visual reference (from design prototype)

| Element | Tailwind/CSS |
|---------|-------------|
| Input wrapper | `relative flex items-center` |
| Number input | existing `getFieldClassName()` + `[appearance:textfield]` + hide webkit spinners + `pr-24` for suffix/stepper space |
| "min" suffix | `absolute right-14 text-sm text-al-on-surface-variant/50 pointer-events-none` |
| Stepper container | `absolute right-2 flex flex-col gap-0.5` |
| Stepper button | `w-6 h-5 rounded bg-[#e2f0ea] hover:bg-[#d0e6dc]` |
| Stepper icon | `material-symbols-outlined text-sm` |
| Helper text | `text-[10px] font-extrabold uppercase tracking-widest pl-1 text-al-on-surface-variant/70` |

**Note on stepper bg color**: `#e2f0ea` comes from the design prototype. If the implementing agent finds a closer AL token, use that instead. Load the prototype to confirm.

## Files to modify

| File | Change |
|------|--------|
| `src/app/app/settings/services/service-editor-form.tsx` | Remove `durationOptions`, replace `<select>` with number input + stepper, add helper text, remove chevron icon |

## Acceptance criteria

1. Service editor shows a number input for "Time Commitment", not a dropdown
2. Input has `min=5`, `max=480`, `step=5`
3. "min" suffix is displayed inline, right of the value, inside the input border
4. Custom stepper arrows (up/down) are rendered — native browser stepper is hidden
5. Helper text below: "In 5-minute steps, up to 8 hours (480 min)."
6. Stepper buttons have accessible labels ("Increase" / "Decrease")
7. Existing services with values like 60, 120, 180 pre-populate correctly in the input
8. Typing a value like 75 and saving succeeds (backend accepts it per Spec 02)
9. The chevron dropdown icon is removed
10. `pnpm check` clean

## Dependencies

- Slice 1 (MAX = 480)
- Slice 2 (validation accepts non-multiples)
