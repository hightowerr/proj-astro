# Slice 1-1: MCC Mapping Module

## Spec: 01-mcc-mapping-module

## What to build
New file `src/lib/mcc-mapping.ts` exporting:
- `MCC_BY_BUSINESS_TYPE` record (6 entries, typed against `BusinessTypeValue`)
- `DEFAULT_MCC` constant (`"7299"`)
- `getMccForBusinessType(businessType: string | null | undefined): string`

## Files to create
- `src/lib/mcc-mapping.ts` (new)

## Acceptance criteria
1. `getMccForBusinessType("hair")` returns `"7241"`
2. `getMccForBusinessType("beauty")` returns `"7230"`
3. `getMccForBusinessType("spa-massage")` returns `"7297"`
4. `getMccForBusinessType("health-clinic")` returns `"8099"`
5. `getMccForBusinessType("personal-trainer")` returns `"7941"`
6. `getMccForBusinessType("general-services")` returns `"7299"`
7. `getMccForBusinessType(null)` returns `"7299"` (DEFAULT_MCC)
8. `getMccForBusinessType(undefined)` returns `"7299"`
9. `getMccForBusinessType("unknown")` returns `"7299"`
10. `MCC_BY_BUSINESS_TYPE` is exported for test assertions
11. TypeScript compiles with zero errors

## Dependencies
- None
