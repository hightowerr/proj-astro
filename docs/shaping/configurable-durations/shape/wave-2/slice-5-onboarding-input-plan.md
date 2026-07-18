# Slice 5 — Onboarding number input

**Spec**: 04
**Wave**: 2 (UI)
**Effort**: Medium
**Design prototype**: `docs/shaping/configurable-durations/designs/Onboarding Duration Input (standalone).html`

## Changes

`src/components/onboarding/add-service-step.tsx`:

### 1. Remove `DURATION_OPTIONS` constant (lines 15-20)

Delete:
```ts
const DURATION_OPTIONS = [
  { value: 60, label: "60 min" },
  { value: 120, label: "120 min" },
  { value: 180, label: "180 min" },
  { value: 240, label: "240 min" },
] as const;
```

### 2. Add import for MAX constant

```ts
import { MAX_SERVICE_DURATION_MINUTES } from "@/app/app/settings/services/constants";
```

### 3. Replace the duration button group (lines ~125-142)

Replace the entire duration `<div className="space-y-4">` block (label + grid of 4 buttons) with:

```tsx
<div className="space-y-4">
  <label className="text-sm font-bold text-primary uppercase tracking-wider">
    Duration <span className="text-destructive">*</span>
  </label>
  <div className="relative flex items-center">
    <input
      type="number"
      id="duration"
      min={5}
      max={MAX_SERVICE_DURATION_MINUTES}
      step={5}
      placeholder="e.g. 60"
      aria-label="Duration"
      value={durationMinutes || ""}
      onChange={(e) => {
        const val = Number(e.target.value);
        setDurationMinutes(Number.isNaN(val) ? 0 : val);
      }}
      className={cn(
        "w-full rounded-xl border-2 border-border/40 bg-al-surface-low px-4 py-3.5 text-sm font-bold text-primary transition-all",
        "placeholder:text-muted-foreground/40",
        "focus:border-primary focus:bg-primary/5 focus:outline-none",
        "[appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden",
        "pr-24",
      )}
    />
    <span className="absolute right-14 text-sm text-muted-foreground/60 pointer-events-none select-none">
      min
    </span>
    <div className="absolute right-3 flex flex-col gap-0.5">
      <button
        type="button"
        aria-label="Increase"
        className="flex items-center justify-center w-6 h-5 rounded bg-[#e2f0ea] hover:bg-[#d0e6dc] transition-colors"
        onClick={() => setDurationMinutes((prev) => Math.min(prev + 5, MAX_SERVICE_DURATION_MINUTES))}
      >
        <span className="material-symbols-outlined text-sm" aria-hidden="true">keyboard_arrow_up</span>
      </button>
      <button
        type="button"
        aria-label="Decrease"
        className="flex items-center justify-center w-6 h-5 rounded bg-[#e2f0ea] hover:bg-[#d0e6dc] transition-colors"
        onClick={() => setDurationMinutes((prev) => Math.max(prev - 5, 5))}
      >
        <span className="material-symbols-outlined text-sm" aria-hidden="true">keyboard_arrow_down</span>
      </button>
    </div>
  </div>
  <p className="mt-1 text-xs font-medium text-muted-foreground/60">
    In 5-minute steps, up to 8 hours (480 min).
  </p>
</div>
```

### Default value

Keep `useState<number>(60)` — 60 is a reasonable universal default.

### Value handling for empty state

When the user clears the input, show `""` (empty) instead of `0`. The `value={durationMinutes || ""}` pattern handles this — 0 displays as empty, matching the `placeholder="e.g. 60"` behavior.

### Visual reference (from design prototype)

| Element | Tailwind/CSS |
|---------|-------------|
| Label | `text-sm font-bold text-primary uppercase tracking-wider` (matches existing onboarding label pattern) |
| Input wrapper | `relative flex items-center` |
| Number input | `rounded-xl border-2 border-border/40 bg-al-surface-low px-4 py-3.5 text-sm font-bold` + focus state: `border-primary bg-primary/5` |
| Placeholder | `"e.g. 60"` — `placeholder:text-muted-foreground/40` |
| "min" suffix | `absolute right-14 text-sm text-muted-foreground/60` |
| Stepper | same pattern as Slice 4 — `bg-[#e2f0ea]` buttons |
| Helper text | `mt-1 text-xs font-medium text-muted-foreground/60` (matches existing onboarding helper pattern) |

## Files to modify

| File | Change |
|------|--------|
| `src/components/onboarding/add-service-step.tsx` | Remove `DURATION_OPTIONS`, add MAX import, replace button group with number input + stepper + helper text |

## Acceptance criteria

1. Onboarding "Add a service" step shows a number input for "Duration", not a dropdown or radio buttons
2. Input has `min=5`, `max=480`, `step=5`
3. Placeholder text: `"e.g. 60"`
4. "min" suffix is displayed inline, right of the value, inside the input border
5. Custom stepper arrows (up/down) are rendered — native browser stepper is hidden
6. Helper text below: "In 5-minute steps, up to 8 hours (480 min)."
7. Stepper buttons have accessible labels ("Increase" / "Decrease")
8. Default value is 60
9. Submitting with value 75 succeeds (backend accepts per Spec 02)
10. `pnpm check` clean

## Dependencies

- Slice 1 (MAX = 480)
- Slice 2 (validation accepts non-multiples)
