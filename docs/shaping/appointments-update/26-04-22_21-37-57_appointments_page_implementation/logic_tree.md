# Logic Tree — Gap Disaggregation
**Job:** Appointments Page Implementation Analysis
**Date:** 2026-04-22

---

## Root Problem
> "The `/app/appointments` page is functional but does not fully satisfy the implementation spec or design system requirements."

---

## Logic Tree

```
ROOT: Appointments page does not meet full spec
│
├── A. VISUAL PRESENTATION LAYER (highest impact)
│   │
│   ├── A1. Financial Outcome — no badge hierarchy [CRITICAL]
│   │       Current: <span className="capitalize">{financialOutcome}</span>
│   │       Required: FinancialOutcomeBadge with semantic color per severity
│   │       Impact: Spec explicitly calls out "outcome badge hierarchy" as designer focus
│   │       Fix: New inline component FinancialOutcomeBadge in page.tsx
│   │
│   ├── A2. Payment Status — no visual treatment [MEDIUM]
│   │       Current: plain text with capitalize
│   │       Required: Styled badge or tonal indicator for paid/unpaid/pending/failed
│   │       Impact: Column has no visual signal — "failed" looks same as "paid"
│   │       Fix: PaymentStatusBadge (reuse badge pattern from SlotStatusBadge)
│   │
│   └── A3. Outcome Cards — no semantic color differentiation [LOW]
│           Current: settled=success, voided=error, unresolved=primary (reasonable)
│           Assessment: Already uses color vars correctly — acceptable as-is
│           Fix: None required
│
├── B. DESIGN SYSTEM COMPLIANCE (high impact, principled)
│   │
│   ├── B1. Card borders — 1px solid border [VIOLATION]
│   │       Current: border: "1px solid var(--color-border-default)"
│   │       Required: Tonal layering via background shift (DESIGN.md: No-Line Rule)
│   │       Fix: Remove border from outcome cards; use surface-container-lowest
│   │         background on a surface-container-low page background
│   │
│   ├── B2. Table wrapper border — 1px solid [VIOLATION]
│   │       Current: border: "1px solid var(--color-border-default)" on table div
│   │       Required: Background shift to create depth without a line
│   │       Fix: Wrap tables in surface-container-lowest container with tonal
│   │         background; use ambient shadow (0px 20px 40px rgba(26,28,27,0.06))
│   │
│   └── B3. Table row hairline borders [VIOLATION]
│           Current: borderTop: "1px solid var(--color-border-hairline)" per row
│           Required: No line dividers (DESIGN.md: "Strictly forbid horizontal divider lines")
│           Fix: Use spacing (py-3 already present) as the sole row separator;
│             optionally add hover background for interactive feedback
│
├── C. STRUCTURAL / UX HIERARCHY
│   │
│   ├── C1. Appointments table — no section header [GAP]
│   │       Current: Table appears immediately after outcome cards with no h2
│   │       Required: Visual parity with Slot Recovery section (which has h2 + description)
│   │       Cognitive Load: Users need a named zone to orient before scanning the table
│   │       Fix: Add <section> wrapper with h2 "Appointments" + description line
│   │
│   └── C2. Two-table visual separation [GAP]
│           Current: Space-y-6 between sections, no tonal shift
│           Required: Clear boundary between "transaction record" and "recovery log"
│           Fix: Use a background-shift section for Slot Recovery (surface-container-low
│             background on the section) to distinguish it from the main table
│
└── D. EMPTY STATES
    │
    ├── D1. Appointments empty state [GAP]
    │       Current: <p className="text-sm text-secondary">No recent or upcoming...</p>
    │       Required: Designed empty state with icon, heading, and actionable copy
    │       Fix: Centered container with icon (Calendar), heading, and sub-copy
    │         pointing to the booking link or settings
    │
    └── D2. Slot Recovery empty state [GAP]
            Current: <p className="text-sm text-secondary">No slot openings yet.</p>
            Required: Designed empty state explaining what slot recovery is
            Fix: Centered container with icon (RefreshCw or ArrowRightLeft),
              heading "No slots recovered yet", and copy explaining the mechanic
```

---

## Priority Matrix

| ID | Issue | Effort | Impact | Priority |
|---|---|---|---|---|
| A1 | FinancialOutcomeBadge | Low (new inline component) | High (spec requirement) | P0 |
| B1 | Card border violations | Low (remove border, adjust bg) | High (design system) | P0 |
| B2 | Table border violations | Low (remove border, add shadow) | High (design system) | P0 |
| B3 | Row hairline dividers | Low (remove borderTop) | Medium | P1 |
| C1 | Appointments section header | Very Low | High (cognitive load) | P1 |
| C2 | Two-table tonal separation | Low | Medium | P1 |
| D1 | Appointments empty state | Low | Medium | P1 |
| D2 | Slot Recovery empty state | Low | Medium | P1 |
| A2 | PaymentStatusBadge | Low | Medium | P2 |
