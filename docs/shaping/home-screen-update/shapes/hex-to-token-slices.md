# Slices: Dashboard Hex → Token Replacement

**Shape:** `hex-to-token-shape.md` → Shape A
**Approach:** Two slices — prerequisite first, then component sweep
**Execution order:** Sequential (Slice 1 is prerequisite for Slice 2)
**Status:** Both slices implemented (2026-06-19) — 0 TS errors, 0 hardcoded hex remaining, all self-tests pass.

---

## Slice Overview

| # | Slice | Specs Covered | Files Changed | Est. Lines Changed |
|---|-------|--------------|---------------|-------------------|
| 1 | Theme mapping prerequisite | (enables Slice 2) | `globals.css` | 1 |
| 2 | Hex-to-token swap | #11 | `atelier-dashboard.tsx` | 7 lines (12 class replacements) |

---

## Slice 1 — Theme Mapping Prerequisite

**What:** Add `--color-al-on-secondary-container: var(--al-on-secondary-container);` to the `@theme inline` block in `globals.css`.

**Specs:** None directly — enables Slice 2's `text-al-on-secondary-container` utility.

**Plan:** `plan-slice-6-theme-mapping.md`

---

## Slice 2 — Hex-to-Token Swap

**What:** Replace all 12 hardcoded hex class instances across 7 lines in `atelier-dashboard.tsx` with Tailwind DS token utilities.

**Specs:** #11 (Scattered Hardcoded Hex)

**Plan:** `plan-slice-7-hex-swap.md`

---

## Dependency Graph

```
Slice 1 (theme mapping)
    └── Slice 2 (hex swap) — needs text-al-on-secondary-container from Slice 1
```

---

## Replacement Map (reference for Slice 2)

| Line | Old Class | New Class |
|------|-----------|-----------|
| 113 | `bg-[#ffdbcf]` | `bg-al-secondary-fixed` |
| 113 | `text-[#2a170f]` | `text-al-on-secondary-fixed` |
| 156 | `bg-[#fdd8cb]` | `bg-al-secondary-container` |
| 156 | `text-[#785c53]` | `text-al-on-secondary-container` |
| 203 | `bg-[#fdd8cb]` | `bg-al-secondary-container` |
| 203 | `text-[#74584f]` | `text-al-secondary` |
| 208 | `bg-[#fdd8cb]` | `bg-al-secondary-container` |
| 208 | `text-[#74584f]` | `text-al-secondary` |
| 229 | `bg-[#ffdad6]` | `bg-al-error-container` |
| 229 | `text-[#93000a]` | `text-al-on-error-container` |
