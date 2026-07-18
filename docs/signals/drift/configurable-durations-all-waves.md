# Drift: configurable-durations (all waves)

## Deviation 1

- **Date**: 2026-07-18
- **Spec**: 02 (remove grid-multiple validation)
- **What diverged**: Spec hardcoded `5` in floor check and error string. Implementation extracts `MIN_SERVICE_DURATION_MINUTES = 5` constant to `constants.ts` and uses template literal in error message.
- **Classification**: EVOLUTION
- **Why**: Centralizes the floor value alongside MAX for testability (test file imports it) and single-source-of-truth maintenance.

## Deviation 2

- **Date**: 2026-07-18
- **Spec**: 02 (remove grid-multiple validation)
- **What diverged**: Spec shows `shopId: string` parameter kept. Implementation uses `_shopId: string` prefix convention.
- **Classification**: EVOLUTION
- **Why**: TypeScript strict mode flags unused parameters. `_` prefix is the standard TS convention to suppress the warning while preserving the function signature for existing callers.

## Summary

- Evolution/shortcut ratio: **2/0** (0% shortcuts)
- No unresolved conflicts
- No remaining unimplemented specs
