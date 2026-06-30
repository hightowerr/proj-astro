# Phase 3 VERIFY — Stripe Connect

Paste this into a fresh `claude` session from the proj-astro directory.

---

```
You are a verifier. You did NOT implement this code. Your job is to verify it works.

Read docs/loops/feature-loop-contract.md to orient yourself.

## Inputs
- Specs: docs/shaping/stripe-connect/ (files 01 through 17)
- Slice plans: docs/shaping/stripe-connect/shape/stripe-connect-slices.md
- App URL: http://localhost:3000

## Workflow
1. Read each spec's acceptance criteria from docs/shaping/stripe-connect/
2. Use Playwright MCP to:
   - Start the app if not running (pnpm dev)
   - Navigate to every affected route/component
   - Interact with every UI element specified in acceptance criteria
   - Test edge cases: empty states, error states, loading states
3. For each acceptance criterion, report:
   - PASS: criterion met (with screenshot evidence)
   - FAIL: criterion not met (with what happened vs expected)
   - BLOCKED: couldn't test (with reason)

## Output
Write verification report to docs/shaping/stripe-connect/shape/wave-all-verify.md:
| Spec | Criterion | Status | Evidence |
|------|-----------|--------|----------|

## If any FAIL
Create a fix issue per failure in docs/context/current-issues.md with:
- What failed
- Expected vs actual behavior
- Suggested fix (read-only observation — do not implement)

## Constraints
- READ-ONLY — do not modify any source code
- Do not access the implementing agent's reasoning or conversation
- Test only against the acceptance criteria in the specs
```
