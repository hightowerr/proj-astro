# Slice 2-2: Schema Guard Test

## Spec: 03-schema-guard-test

## What to build
Vitest test file asserting every `businessTypes` entry has a corresponding MCC mapping. Prevents recurrence when new verticals are added.

## Files to create
- `src/lib/mcc-mapping.test.ts` (new)

## Test cases
1. Every `businessTypes[].value` is a key in `MCC_BY_BUSINESS_TYPE` (exhaustiveness)
2. Each known type returns the correct specific MCC (6 assertions)
3. `null` returns `DEFAULT_MCC`
4. `undefined` returns `DEFAULT_MCC`
5. Unknown string returns `DEFAULT_MCC`

## Note on general-services
`general-services` maps to `"7299"` which equals `DEFAULT_MCC`. The exhaustiveness test should check `value in MCC_BY_BUSINESS_TYPE` (key presence), not `!== DEFAULT_MCC` (value difference). Export `MCC_BY_BUSINESS_TYPE` from the module to enable this.

## Acceptance criteria
1. `pnpm vitest run src/lib/mcc-mapping.test.ts` passes (all tests green)
2. Adding a new value to `businessTypes` without a corresponding MCC entry causes a test failure
3. All 5 test cases implemented
4. TypeScript compiles with zero errors

## Dependencies
- Spec 01 (mcc-mapping module must exist)
