---
type: drift
classification: EVOLUTION
wave: 4
specs: "#10, #11"
date: 2026-06-22
---

# Drift: Bespoke hex colors retained (5 total)

## What the specs said
Specs target zero hardcoded hex values.

## What was implemented
5 hex values retained across 3 files:
- customers/page.tsx (1): `#003366` gradient endpoint in CTA button
- conflicts/page.tsx (1): `#003366` gradient endpoint in CTA button
- customers-editorial.tsx (3): `#d3ead7`, `#a9d4b3`, `#0e4a31` — bespoke top-tier
  avatar gradient stops with no AL design token equivalent

## Classification: EVOLUTION
The `#003366` is a darker shade of `--al-primary` (#001e40) used as a gradient stop.
No AL token exists for this intermediate blue. The avatar gradient greens are decorative
per-tier colors unique to the editorial component. Adding AL tokens for these would
bloat the token system for single-use values.
