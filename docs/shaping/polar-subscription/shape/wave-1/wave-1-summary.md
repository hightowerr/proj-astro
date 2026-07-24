# Wave 1 — Summary

## Scope

Foundation layer: schema migration, environment variables, and Polar server plugin.

## Slices

| Slice | Spec | Status | Deviations |
|-------|------|--------|------------|
| 1a | 01 — Schema migration | pending | — |
| 1b | 02 — Polar env vars | pending | — |
| 1c | 03 — Polar server plugin | pending | — |

## Execution order

1. Slices 1a and 1b run in parallel (no dependencies).
2. Slice 1c runs after 1b completes (needs env vars).

## Exit criteria

- All 3 slices implemented.
- `pnpm check` passes after each slice.
- No self-verification — Phase 3 handles that.
