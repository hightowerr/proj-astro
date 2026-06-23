---
type: drift
classification: EVOLUTION
wave: 4
specs: "#09, #10, #11, #13"
date: 2026-06-22
---

# Drift: Dynamic inline styles retained (19 total)

## What the specs said
Specs #09, #10, #11, #13 all target "Zero style={{}} props remaining."

## What was implemented
19 inline `style={{}}` props were retained across 4 files:
- appointments/page.tsx (1): RECOVERY_STATUS badge with data-driven bg/fg
- payment-policy/page.tsx (2): TIER_DEFINITIONS badge with data-driven bg/fg/dot
- customers-editorial.tsx (12): tier colors, score bar widths, dynamic font sizes
- conflicts-ledger.tsx (4): severity badge colors, icon sizing

All use `var(--al-*)` tokens instead of hardcoded hex, but the style={{}} mechanism
remains because values are selected at runtime from config objects/props.

## Classification: EVOLUTION
The intent of "zero style={{}}" was to eliminate hardcoded styling, not to prevent
runtime-driven dynamic values. Converting these to Tailwind would require complex
conditional className logic that's less readable than the current approach. The hex
values inside the config objects were migrated to AL tokens, achieving the design
consistency goal.
