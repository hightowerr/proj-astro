# P3 — Re-engagement email rebrand + brand footer creation

## Classification
**Type:** Rebrand — email template
**Risk:** Medium — email copy changes affect sent communications; brand footer is a new element
**File:** `src/app/api/jobs/connect-reengagement/route.ts`

## Problem
Five occurrences of "Astro" in the email template (HTML + plain text). Additionally, the typography fix issue (tracked in `current-issues.md`) requires creating a brand footer element — that element must be created as `"SHOWUP · Stop losing money to no-shows."` not "ASTRO."

## Replacements

### HTML body (3)
| Line | Old | New |
|------|-----|-----|
| 106 | `Astro` (logo span) | `ShowUp` |
| 115 | `— Astro` (sign-off) | `— ShowUp` |
| 117 | `your Astro account` (footer) | `your ShowUp account` |

### Plain text body (2)
| Line | Old | New |
|------|-----|-----|
| 122 | `— Astro` (sign-off) | `— ShowUp` |
| 122 | `your Astro account` (footer) | `your ShowUp account` |

### New element — brand footer (bundle with typography fix)

Add brand footer line between the existing footer text and the legal/unsubscribe line.

**Verified specs from mock-up (2026-07-13):**

```html
<p style="font-size:11.5px; color:#737780; margin:0; padding:16px 0 0;">
  <span style="font-weight:800; letter-spacing:.14em; text-transform:uppercase;">SHOWUP</span>
  <span style="padding:0 7px;">·</span>
  Stop losing money to no-shows.
</p>
```

- "SHOWUP": `font-weight: 800`, `letter-spacing: .14em`, `text-transform: uppercase`
- Separator `·`: `7px` side padding
- Tagline: regular weight (does not compete with footer text above)
- Legal line below: `Unsubscribe · ShowUp Ltd, 1 Atelier Lane, London`

## Cross-dependency
**Must ship with or after the re-engagement email typography fix** (tracked in `current-issues.md`). The typography fix creates the brand footer element — that element's text must be "SHOWUP" not "ASTRO." If this spec ships first, the typography fix must not create the footer as "ASTRO."

## Dependencies
- **Requires:** P0–P2 shipped
- **Cross-dep:** re-engagement email typography fix (bundle in same PR)
- **Blocks:** nothing

## Verification
- `pnpm check` passes
- Email HTML contains zero "Astro" occurrences
- Plain text fallback contains zero "Astro" occurrences
- Brand footer reads "SHOWUP · Stop losing money to no-shows."

## Design impact
**APPROVED (2026-07-13).** Designer verified: 800-weight SHOWUP stays legible at 11.5px. Tagline at regular weight doesn't compete with footer text above. Hierarchy reads sign-off → footer text → brand footer → legal. Mock-up: `docs/shaping/rebrand/Rebrand Mockups.html` (section 1b).
