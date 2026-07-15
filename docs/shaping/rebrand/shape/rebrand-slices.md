# Rebrand "Astro" → "ShowUp" — Slices

## Slicing Strategy

Pattern: **single-file-sweep** (from `docs/signals/patterns/`). All changes are the same type (string replacement) with no inter-dependencies within a wave. Each wave is a single sweep slice, not one-per-file.

## Slices

|  |  |
|:--|:--|
| **[W1: CORE REBRAND](./wave-1/wave-1-plan.md)**<br>✅ COMPLETE (12/12 PASS)<br><br>• P0: layout.tsx title/description (1)<br>• P1: site-header, auth-brand, booking-nav, site-footer (8)<br>• P2: sign-in-button, 5 landing page files (12)<br>• 25 replacements across 13 files (4 extra finds)<br>• 4 evolution / 0 shortcuts<br><br>*Demo: Every user-facing surface reads "ShowUp"* | **[W2: FOLLOW-UP](./wave-2/wave-2-plan.md)**<br>⏳ IMPLEMENTED — awaiting VERIFY<br><br>• P3-app-copy: 2 tooltip replacements<br>• P3-email-rebrand: 5 email strings + typography fix + brand footer<br>• P4-internal-docs: 7 doc replacements<br>• 14 replacements + 4 typography fixes + 1 new element<br>• Bundle email with typography fix<br><br>*Demo: Tooltips, email, docs all read "ShowUp"* |

## Wave Dependencies

```
W1 (core rebrand) ──► W2 (follow-up)
                      └── P3-email-rebrand cross-dep: typography fix
```
