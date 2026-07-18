# Shape — Configurable Service Durations

## Requirements

| ID | Requirement | Source |
|----|-------------|--------|
| R0 | Max service duration raised from 240 to 480 minutes (8 hours) | Spec 01 |
| R1 | Duration decoupled from calendar grid cadence — arbitrary values 5–480, not grid multiples | Spec 02 |
| R2 | Service editor: replace `<select>` dropdown with `<input type="number">` + custom stepper + inline "min" suffix | Spec 03 |
| R3 | Onboarding: replace 4-option radio/button group with same number input pattern as R2 | Spec 04 |
| R4 | DB defense-in-depth: CHECK constraint `duration_minutes <= 480` on `event_types` table | Spec 05 |
| R5 | 10 unit tests covering new validation boundaries (floor=5, ceiling=480, non-multiples accepted) | Spec 06 |
| R6 | Contextual grid cadence guidance hint when duration ≥ 4× slot cadence | Spec 07 |

## Shape A — Direct implementation (SELECTED)

Single viable shape. The requirements are precise, the existing codebase patterns dictate the solution, and the backend changes are minimal.

### Approach

1. **Foundation**: Change one constant, eliminate one validation function's grid coupling, add one DB constraint
2. **UI**: Replace two duration selectors (service editor + onboarding) with a composite number input component following the design prototypes
3. **Polish**: Add a conditional guidance hint for long-service/short-grid mismatches

### Why only one shape?

- R0–R1 have exactly one solution (change constant, remove validation)
- R2–R3 are dictated by design prototypes — the composite input pattern is specified
- R4–R5 are mechanical (migration + tests)
- R6 is a simple conditional render with specified copy and tokens

### Fit check

| R | Shape A |
|---|---------|
| R0 | ✓ Single constant change, Zod schema auto-inherits |
| R1 | ✓ Replace `validateDuration` body — remove `slotMinutes` dependency, add `< 5` floor check |
| R2 | ✓ Prototype-aligned implementation, design tokens extracted |
| R3 | ✓ Same composite input, onboarding context styling |
| R4 | ✓ `check()` pattern already used twice in `eventTypes` table — copy pattern |
| R5 | ✓ Logic-only tests (no RTL needed — per `no-component-test-infra` friction signal) |
| R6 | ✓ `shopContext.slotMinutes` already available in service editor form |

## Signals applied

| Signal | Impact |
|--------|--------|
| `design-prototype-as-source-of-truth` | 3 prototypes loaded, tokens extracted pre-shaping. Specs 03, 04, 07 reference prototypes. Implementation agents must load prototypes for exact values. |
| `agent-skips-visual-polish` | Mitigated by prototype token extraction in slice plans — concrete CSS values, not prose descriptions |
| `no-component-test-infra` | Spec 06 tests are validation logic only (Zod + `validateDuration`). No rendering tests. |
| `foundation-first-slicing` | Wave 1 is all foundation (constant + validation + DB). UI slices in Wave 2 depend on foundation. |
| `single-file-sweep` | Not applicable — changes span 6+ files. Standard parallel-wave approach. |

## Spikes needed

None. Technical assessment:

1. **Drizzle `check()` constraint**: Already used twice in `eventTypes` table (`buffer_minutes_valid`, `duration_minutes_positive`). Pattern is known.
2. **`getBookingSettingsForShop` import in actions.ts**: Still needed in `createDefaultEventType()` — import CANNOT be removed after Spec 02 changes `validateDuration`. Note in slice plan.
3. **Design prototype token `#e2f0ea` (stepper button bg)**: Not a named AL token. Implementation agent should load prototype to confirm exact color. May need a custom class.
4. **Migration numbering**: Standard — check latest file in `drizzle/` and increment.

## Architecture context updates (deferred to RETRO)

See `_build-order.md` § Architecture Context Updates Needed.

## Design prototype token summary

### Service editor (Spec 03)
- Input wrapper: `bg-al-surface-low`, `border-none`, `rounded-xl`, `px-5 py-4`
- Number input: hide native stepper (`appearance: textfield`), `text-foreground`
- "min" suffix: `text-on-surface-variant`, muted
- Stepper buttons: Material Symbols `keyboard_arrow_up`/`keyboard_arrow_down`, bg `#e2f0ea`, `rounded`
- Label: `text-[10px] font-extrabold uppercase tracking-[0.2em] opacity-50` (existing `labelClassName`)
- Helper text: `text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant/70`

### Onboarding (Spec 04)
- Same composite input pattern
- Label: `text-sm font-bold text-primary uppercase tracking-wider` (existing onboarding label style)
- Helper text: `mt-1 text-xs font-medium text-muted-foreground/60` (existing onboarding helper style)
- Placeholder: `"e.g. 60"`
- Border: `border-2`, active: `border-primary bg-primary/5`

### Grid hint (Spec 07)
- `text-xs`, `color: var(--al-on-surface-variant)`, `opacity: 0.7`
- Link: underlined, inherits color (not `text-primary`)
- Threshold: `durationMinutes >= slotMinutes * 4`
