# Drift: no-minimum (all waves)

## D1 — Test file location
- **Date:** 2026-07-07
- **Spec:** 03-floor-unit-tests.md
- **What diverged:** Spec predicted file path `src/lib/tier-pricing.test.ts`. Implementation used `src/lib/__tests__/tier-pricing.test.ts` — the project's standard test directory where all other tier-pricing tests already live.
- **Classification:** EVOLUTION
- **Why:** Tests were added to the existing file rather than creating a duplicate. Using the established `__tests__/` directory is consistent with every other test in the project.

## Quality ratchet
- Total divergences: 1
- Evolutions: 1
- Shortcuts: 0
- Shortcut ratio: 0% (within threshold)
