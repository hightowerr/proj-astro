# Drift Audit: Re-engagement Email — Wave 1

**Date**: 2026-07-05
**Specs**: 01-04 (docs/shaping/Re-engagement-email/)
**File**: src/app/api/jobs/connect-reengagement/route.ts

## Divergences

| # | Spec | Spec Says | Implementation Has | Classification | Root Cause |
|---|------|-----------|--------------------|----------------|------------|
| D1 | 01 | letter-spacing: -0.015em on headline | No letter-spacing property | PRE-EXISTING | Original spec 16 implementation omitted this property. Not introduced or removed by copy change. |
| D2 | 02 | max-width: 46ch on body paragraph | No max-width property | PRE-EXISTING | Same as D1. |
| D3 | 03 | font-size: 11.5px, color: #737780 on footer | font-size: 12px, color: #9ca3af | PRE-EXISTING | Same as D1. |
| D4 | 03 | Brand footer "ASTRO · Stop losing money to no-shows." | Element absent | PRE-EXISTING | Design prototype includes brand footer; original implementation never added it. |
| D5 | 04 | Plaintext footer wording matches HTML ("transactional account-setup message") | Plaintext says "transactional notification — not a marketing email" | SPEC INCONSISTENCY | Spec 04 acceptance criterion says "match HTML" but its own explicit full template shows different wording. Implementation follows the explicit template. |

## Classification Summary

- **EVOLUTION**: 0
- **SHORTCUT**: 0
- **PRE-EXISTING**: 4 (D1-D4)
- **SPEC INCONSISTENCY**: 1 (D5)

All divergences predate this change. The copy modifications (the scope of specs 01-04) were implemented with zero drift. The 4 pre-existing gaps are typography/structural issues from the original email implementation (Stripe Connect spec 16, wave 4) and are tracked in `docs/context/current-issues.md`.

D5 is a contradiction within spec 04 itself — the acceptance criterion references spec 03's HTML output but the spec's own "Full plain text template" section provides different wording. The implementer followed the explicit template, which is the correct choice.

## Shortcut Ratio

0 shortcuts / 0 total divergences from this change = **0%** (well below 50% threshold).
