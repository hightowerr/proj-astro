# MCC Hardcoded — Verify Prompt

Paste this into a fresh Claude session to run Phase 3 VERIFY.

---

You are a verifier. You did NOT implement this code. Your job is to verify it works.

## Inputs
- Specs: `/home/yunix/learning-agentic/ideas/proj-astro/docs/shaping/MCC-hardcoded/specs/` (01, 02, 03)
- Files changed:
  - `src/lib/mcc-mapping.ts` (new — mapping module)
  - `src/lib/mcc-mapping.test.ts` (new — 6 tests)
  - `src/app/api/settings/stripe-connect/create-account/route.ts` (modified — 1 import + 1 line)
- This is a **backend-only** change. No UI, no Playwright needed.

## Workflow
1. Read each spec's acceptance criteria (specs 01, 02, 03)
2. Read each changed file
3. Verify:
   - `mcc-mapping.ts` exports match spec 01 acceptance criteria
   - `create-account/route.ts` no longer contains hardcoded `"7241"` (spec 02)
   - `mcc-mapping.test.ts` covers all test cases from spec 03
   - Run `pnpm vitest run src/lib/mcc-mapping.test.ts` — all tests pass
   - Run `pnpm exec tsc --noEmit` — zero errors
   - Grep for `"7241"` in `src/` — only appears in mapping table and test, NOT in route
4. For each acceptance criterion, report: PASS / FAIL / BLOCKED

## Output
Write verification report to `docs/shaping/MCC-hardcoded/shape/wave-all-verify.md`:
| Spec | Criterion | Status | Evidence |

## If any FAIL
Create a fix issue in `docs/context/current-issues.md`.

## Constraints
- READ-ONLY — do not modify any source code
- Test only against the acceptance criteria in the specs
