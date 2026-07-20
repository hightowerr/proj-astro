# Spec 01 — Hero Social Proof: Future Social Proof Framing

## Priority

P1 — HIGH. Independent. Ship standalone.

## Summary

Replace the false "Trusted by 500+ beauty professionals" social proof line with a Cialdini-validated future social proof framing. At n=1 customer, fabricated user counts are falsifiable in one peer conversation within the target market (tight professional network). Future social proof — signalling an honest upward trend — is equally effective at low adoption per Cialdini Ch.4.

ADR: `docs/adr/0001-honest-positioning-at-low-adoption.md`

## Changes

- **File:** `src/components/landing/hero-section.tsx`
- **Location:** Line 136 (social proof line below hero CTAs)
- **Current:**
  ```tsx
  <p className="text-sm text-text-light-muted">Trusted by 500+ beauty professionals</p>
  ```
- **Replace with:**
  ```tsx
  <p className="text-sm text-text-light-muted">New platform. Early adopters are filling their calendars.</p>
  ```

## Design Notes

- Styling unchanged — same `text-sm text-text-light-muted` class
- Copy is honest about being new (not a weakness — signals "get in early")
- Upgrade path: swap to named testimonial ("See how [Kicksnare] eliminated no-shows") when consent is obtained (target: 3-5 customers)
- "14-day free trial · No card required" moves to sit directly beneath CTA button, not in the social proof slot

### Pages impacted

- `/` — landing page hero section

## Acceptance Criteria

- [ ] "500+" text is removed from hero section
- [ ] Future social proof line renders in its place
- [ ] No other mentions of "500+" remain in `hero-section.tsx`
- [ ] `pnpm check` passes

## Prerequisites

None.

## Dependencies

None — fully independent.
