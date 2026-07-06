# Re-engagement Email Copy Fix — Slices

## Wave structure
Single wave. All 4 specs target the same file (`connect-reengagement/route.ts`), creating file contention. Parallelism is not possible — sequential execution within a single agent.

## Wave 1 — All copy changes (1 agent, sequential)

| Slice | Spec | Change | Lines |
|-------|------|--------|-------|
| 1 | 01 | HTML headline: "You started connecting…" → "You began setting up deposits…" | ~109 |
| 2 | 02 | HTML body: "Once verified" → "Once set up" | ~110 |
| 3 | 03 | HTML footer: "you started Stripe Connect onboarding…" → "you began setting up deposit collection…" | ~117 |
| 4 | 04 | Plaintext: headline + body + footer mirrored | ~122 |

## Critical path
```
01 → 02 → 03 → 04 (sequential, same file, ~5 min total)
```

## Implementation notes
- All changes are in inline template strings — no external template files
- The HTML template uses inline `style=""` attributes (email-compatible), not CSS classes
- The plaintext template is a separate template literal on line ~122
- Footer in the design prototype already uses correct copy ("setting up deposit collection") — the code deviates from design. This spec aligns code to design.
