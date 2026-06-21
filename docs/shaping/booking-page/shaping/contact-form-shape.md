# Contact Form Reskin — Shaping Document

**Scope:** Restyle 3 contact fields in `booking-form.tsx` to match Atelier Light spec
**Appetite:** Now
**Constraint:** Design change only — no new functionality

---

## Frame

### Problem

- Contact fields (full name, phone, email) use shadcn `<Input>/<Label>` with Tailwind classes — inconsistent with the already-restyled date picker and slot grid which use inline-styled native elements
- All three fields stacked vertically — spec calls for phone + email side-by-side in a 2-column grid
- No required dot indicators on labels (date picker has them, contact fields don't)
- No focus ring on any input (date picker's focus ring is also missing — TODO in current-issues.md)

### Outcome

- All 3 contact fields match Atelier Light spec: inline-styled native elements, navy labels with required dots, white input wraps with hairline borders
- Phone + email in 2-column grid layout
- Focus ring (navy border + shadow) works on all 3 contact fields AND retroactively on the date picker
- shadcn `<Input>/<Label>` imports retained (PaymentStep still uses them)

---

## Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| R0 | Restyle 3 contact fields to match Atelier Light spec | Core goal |
| R1 | Labels: 13px/800 navy with 6px navy required dot, 8px margin below | Must-have |
| R2 | Input wrap: white bg, `rgba(195,198,209,0.50)` border, 12px radius, 14px 16px padding | Must-have |
| R3 | Input text: Manrope 16px/700 navy. Placeholder: 16px/400 muted `#737780` | Must-have |
| R4 | Layout: full name full-width, phone + email in 2-column grid with 16px gap, 20px margin between groups | Must-have |
| R5 | Focus ring: navy border + `0 0 0 3px rgba(0,30,64,0.12)` shadow on focus-within — applies to all 3 fields AND retroactively to date picker | Must-have |
| R6 | Preserve existing form state wiring: `fullName`, `phone`, `email` state + onChange handlers unchanged | Must-have |
| R7 | Keep shadcn `Input`/`Label` imports — PaymentStep still uses them | Must-have |

---

## Focus Ring Approach

The spec uses CSS `:focus-within` on the wrapper div. The codebase uses inline styles exclusively — `:focus-within` can't be expressed inline.

**Options:**

| Approach | Mechanism | Pros | Cons |
|----------|-----------|------|------|
| **JS state** | `useState` for each field's focus, toggle on `onFocus`/`onBlur` | Consistent with existing hover patterns | 3 new state variables, verbose |
| **CSS class in globals.css** | Add `.al-input-wrap:focus-within { ... }` class | Clean, one-line per field, reusable | Breaks the "all inline" pattern |
| **Shared wrapper component** | Create `<AlInputWrap>` that handles focus internally | Most reusable | Overkill for 4 fields, adds a file |

**Decision: CSS class.** The date picker already has `transition` properties for border/shadow — it's waiting for a trigger. A single CSS rule in `globals.css` is the smallest change that works for all 4 fields (3 contact + date picker). The "all inline" pattern is a convention, not a constraint — the slot grid already uses `as const` type assertions which are React-specific patterns, and the form uses `className="space-y-7"` at the top level. A CSS class for focus is the right tool.

```css
/* globals.css */
.al-input-wrap:focus-within {
  border-color: var(--al-primary) !important;
  box-shadow: 0 0 0 3px rgba(0, 30, 64, 0.12);
}
```

Then add `className="al-input-wrap"` to each input wrapper div (3 contact fields + date picker retrofix).

---

## Shape

### A: Inline restyle + CSS focus class

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **A1** | Add `.al-input-wrap:focus-within` CSS rule to `globals.css` | |
| **A2** | Replace 3 shadcn `<Label>`/`<Input>` groups with inline-styled native `<label>`/`<input>` elements, matching date picker pattern | |
| **A3** | Change layout from vertical stack to: full-name full-width + phone/email 2-column grid with 16px gap | |
| **A4** | Add `className="al-input-wrap"` to all 3 contact input wrappers + date picker wrapper (retrofix R5) | |

### Fit Check (R × A)

| Req | Requirement | Status | A |
|-----|-------------|--------|---|
| R0 | Restyle 3 contact fields to match Atelier Light spec | Core goal | ✅ |
| R1 | Labels: 13px/800 navy with 6px navy required dot, 8px margin below | Must-have | ✅ |
| R2 | Input wrap: white bg, hairline border, 12px radius, 14px 16px padding | Must-have | ✅ |
| R3 | Input text: Manrope 16px/700 navy. Placeholder: 16px/400 muted | Must-have | ✅ |
| R4 | Layout: full-width name, 2-column phone+email, 20px gap between groups | Must-have | ✅ |
| R5 | Focus ring on all 3 contact fields + date picker retrofix | Must-have | ✅ |
| R6 | Preserve form state wiring unchanged | Must-have | ✅ |
| R7 | Keep shadcn imports for PaymentStep | Must-have | ✅ |

**Selected shape: A**
