# P4 — Internal documentation update

## Classification
**Type:** Rebrand — internal docs
**Risk:** None — no production code, no customer-facing impact
**File:** `docs/context/project-overview.md`

## Problem
Seven occurrences of "Astro" in the product definition document. Internal-only but creates confusion when context files reference the old name.

> **Note:** `src/lib/__tests__/auth-origins.test.ts` was listed in the original issue as containing `astro.example.com` fixture URLs but has **0 matches** — already clean or never had them. Dropped from this spec.

## Replacements

### `docs/context/project-overview.md` (7)
| Line | Old | New |
|------|-----|-----|
| 1 | `# Product Definition: Astro` | `# Product Definition: ShowUp` |
| 7 | `Product name: Astro` | `Product name: ShowUp` |
| 10 | `on Astro itself` | `on ShowUp itself` |
| 11 | `"Astro Pro"` | `"ShowUp Pro"` |
| 13 | `Astro protects service businesses` | `ShowUp protects service businesses` |
| 79 | `Astro tracks reliability` | `ShowUp tracks reliability` |
| 83 | `Astro is a tool for existing businesses` | `ShowUp is a tool for existing businesses` |

## Dependencies
- **Requires:** P0–P2 shipped (product name should be official before updating docs)
- **Blocks:** nothing

## Verification
- `grep -c "Astro" docs/context/project-overview.md` returns 0

## Design impact
None — internal documentation only.
