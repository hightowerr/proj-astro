# Time Slot Grid Reskin — Shaping Document

**Scope:** Restyle the time slot grid in `booking-form.tsx` to match Atelier Light spec
**Appetite:** Now
**Constraint:** Design change only — no new functionality

---

## Frame

### Problem

- The time slot grid uses `--color-*` (Deep Ledger) tokens: teal selected state, dark surface unselected, `--color-border-default` borders
- It uses Tailwind CSS Grid (`grid-cols-2 gap-3 sm:grid-cols-3`) instead of the spec's flex-wrap layout
- The label/meta use Tailwind utility classes (`text-sm font-semibold`, `opacity-90`) rather than AL inline styles
- Loading/empty/error states use `--color-*` tokens
- Visually inconsistent with the already-restyled service card and date picker above it

### Outcome

- Time slot grid matches Atelier Light spec: navy selected, white unselected, mono font, flex-wrap grid
- All `--color-*` tokens replaced with `--al-*` equivalents in this section
- `data-slot` and `data-booking-slot` attributes preserved for E2E tests
- `<fieldset>/<legend>` semantic structure preserved for accessibility

---

## Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| R0 | Restyle the time slot grid section to match the Atelier Light feature spec | Core goal |
| R1 | Label: 13px/800 navy with 6px navy required dot, meta with middle dot separator | Must-have |
| R2 | Grid: flex-wrap layout with 10px gap (replace CSS Grid) | Must-have |
| R3 | Slot default: white bg, `rgba(195,198,209,0.50)` border, 12px radius, 12px 20px padding, mono font 13px/600 tabular-nums | Must-have |
| R4 | Slot selected: navy bg, white text, navy border, 700 weight, ring shadow `0 0 0 4px rgba(0,30,64,0.08)` | Must-have |
| R5 | Preserve `data-slot`, `data-booking-slot`, `aria-pressed` attributes on slot buttons | Must-have |
| R6 | Preserve `<fieldset>/<legend>` semantic structure | Must-have |
| R7 | Loading, empty, and error states use `--al-*` tokens instead of `--color-*` | Must-have |

---

## Token Availability Check

| Spec token | Exists in `globals.css`? | Resolution |
|------------|:------------------------:|------------|
| `--al-primary` | Yes | `#001e40` |
| `--al-on-primary` | Yes | `#ffffff` |
| `--al-on-surface-variant` | Yes | `#43474f` |
| `--al-surface-container-lowest` | Yes | `#ffffff` |
| `--al-surface-container` | Yes | `#eeeeec` |
| `--al-outline-variant` | Yes | `#c3c6d1` |
| `--al-hairline-strong` | **No** | Use inline: `rgba(195,198,209,0.50)` |
| `--al-shadow-ring` | **No** | Use inline: `0 0 0 4px rgba(0,30,64,0.08)` |
| `--al-font-mono` (JetBrains Mono) | **No** | JetBrains Mono is not loaded. Project uses Fira Code via `--font-mono: var(--font-fira-code)`. Use `var(--font-mono)` instead — it resolves to Fira Code, which is a perfectly acceptable monospace for tabular time values. |
| `--al-radius-xl` | Yes | `12px` |

---

## Shape

Only one shape — this is a contained styling swap.

### A: Inline restyle of slot grid section

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **A1** | Restyle `<legend>` label: 13px/800 navy + required dot, meta line with middle dot separator | |
| **A2** | Replace CSS Grid container with flex-wrap + 10px gap | |
| **A3** | Restyle slot buttons: mono font, white bg, hairline border, 12px 20px padding. Selected: navy bg, white text, ring shadow | |
| **A4** | Restyle loading/empty/error text: swap `--color-text-secondary` → `--al-on-surface-variant`, `--color-error` → `--al-error` | |

### Fit Check (R × A)

| Req | Requirement | Status | A |
|-----|-------------|--------|---|
| R0 | Restyle the time slot grid section to match the Atelier Light feature spec | Core goal | ✅ |
| R1 | Label: 13px/800 navy with 6px navy required dot, meta with middle dot separator | Must-have | ✅ |
| R2 | Grid: flex-wrap layout with 10px gap (replace CSS Grid) | Must-have | ✅ |
| R3 | Slot default: white bg, hairline border, 12px radius, 12px 20px padding, mono font 13px/600 tabular-nums | Must-have | ✅ |
| R4 | Slot selected: navy bg, white text, navy border, 700 weight, ring shadow | Must-have | ✅ |
| R5 | Preserve data-slot, data-booking-slot, aria-pressed attributes | Must-have | ✅ |
| R6 | Preserve fieldset/legend semantic structure | Must-have | ✅ |
| R7 | Loading, empty, and error states use --al-* tokens | Must-have | ✅ |

**Selected shape: A** — no alternatives needed for a contained restyle.

---

## Detail A: Breadboard

### UI Affordances

| ID | Place | Affordance | Spec | Wires Out |
|----|-------|-----------|------|-----------|
| U1 | BookingForm | Slot label | `<legend>` "Available slots", 13px/800/navy + 6px navy required dot | — |
| U2 | BookingForm | Slot meta | "[duration] · [timezone]", 13px, `--al-on-surface-variant` | Reads `availabilityDurationMinutes` + `timezone` |
| U3 | BookingForm | Slot grid container | `display: flex, flexWrap: wrap, gap: 10px` | — |
| U4 | BookingForm | Slot button (default) | White bg, `rgba(195,198,209,0.50)` border, 12px radius, 12px 20px padding, mono font 13px/600/tabular-nums, muted text | → N1 (sets selectedSlot) |
| U5 | BookingForm | Slot button (selected) | Navy bg, white text, navy border, 700 weight, ring shadow | Visual state of U4 when selected |
| U6 | BookingForm | Loading text | "Loading slots…", 13px, `--al-on-surface-variant` | — |
| U7 | BookingForm | Empty text | "No slots available for this day.", 13px, `--al-on-surface-variant` | — |
| U8 | BookingForm | Error text | `{availabilityError}`, 13px, `--al-error` | — |

### Non-UI Affordances

| ID | Place | Affordance | Notes |
|----|-------|-----------|-------|
| N1 | BookingForm | `selectedSlot` state | Existing `useState`. Wired from U4 click. Unchanged. |
| N2 | BookingForm | `slots` array | Existing state populated by availability fetch. Unchanged. |
| N3 | BookingForm | `loading` state | Existing. Controls U6 visibility. Unchanged. |
| N4 | BookingForm | `availabilityError` state | Existing. Controls U8 visibility. Unchanged. |
