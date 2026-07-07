- Date: 2026-07-06
- Feature: MCC-hardcoded
- Waves: 1–2 (all implementation waves)
- Divergences: 2 total

## D1: MCC_BY_BUSINESS_TYPE exported (Spec 01)
- What diverged: Spec said "export for test assertions" as a recommendation in spec 03's notes. Implementation exports it from the start.
- Classification: EVOLUTION
- Why: Enables the cleaner exhaustiveness test pattern (key presence check vs value comparison) that spec 03 itself recommended as "Option 2 is cleaner."

## D2: Extra "valid 4-digit codes" test (Spec 03)
- What diverged: Spec listed 5 test cases. Implementation adds a 6th: "all MCCs are valid 4-digit codes" format check.
- Classification: EVOLUTION
- Why: Validates data integrity — catches typos in MCC values (e.g., "723" instead of "7230"). Minimal cost, genuine safety.

## Summary
- Evolution: 2
- Shortcut: 0
- Ratio: 2/0 (0% shortcuts)
- No spec patches needed — both evolutions follow the spec's own guidance.
