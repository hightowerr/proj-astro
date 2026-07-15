# Wave 2 — Rebrand: App Copy, Email, Internal Docs

## Scope

14 string replacements + 4 typography fixes across 4 files. All P3 + P4 specs. Ships after Wave 1.

## Acceptance Criteria

### P3-app-copy (2 replacements)
1. `grep -i "astro" src/app/app/appointments/page.tsx` returns **0 matches**
2. `grep -i "astro" src/components/payments/tier-policy-form.tsx` returns **0 matches**
3. Appointments empty-state tooltip reads "ShowUp offers their slot"
4. Tier policy form tooltip reads "ShowUp can text the open slot"

### P3-email-rebrand (5 replacements + typography fix + brand footer)
5. `grep -i "astro" src/app/api/jobs/connect-reengagement/route.ts` returns **0 matches**
6. HTML logo span reads "ShowUp"
7. HTML sign-off reads "— ShowUp"
8. HTML footer reads "your ShowUp account"
9. Plain text sign-off reads "— ShowUp"
10. Plain text footer reads "your ShowUp account"
11. Headline `<p>` style includes `letter-spacing:-0.015em`
12. Body `<p>` style includes `max-width:46ch`
13. Footer `<p>` style uses `font-size:11.5px` and `color:#737780` (not `12px` / `#9ca3af`)
14. Brand footer element exists: `SHOWUP · Stop losing money to no-shows.` with `font-weight:800`, `letter-spacing:.14em`, `text-transform:uppercase`
15. Plain text includes `SHOWUP · Stop losing money to no-shows.` at end

### P4-internal-docs (7 replacements)
16. `grep -c "Astro" docs/context/project-overview.md` returns **0**
17. Product name reads "ShowUp", plan name reads "ShowUp Pro"

### Cross-cutting
18. `pnpm check` passes (lint + typecheck)
19. No logic, routing, or layout changes — diff shows only string content + inline style value changes
20. `auth-origins.test.ts` fixture URLs (`astro.example.com`) are NOT in scope — test data, not brand copy

## Files to Modify

| File | Replacements | Spec |
|------|:---:|------|
| `src/app/app/appointments/page.tsx` | 1 | P3-app-copy |
| `src/components/payments/tier-policy-form.tsx` | 1 | P3-app-copy |
| `src/app/api/jobs/connect-reengagement/route.ts` | 5 + 4 typography fixes + 1 new element | P3-email-rebrand |
| `docs/context/project-overview.md` | 7 | P4-internal-docs |

## Implementation Sequence

Single sweep — no ordering constraints within this wave. All replacements are independent.

1. Replace "Astro" → "ShowUp" in tooltip strings (appointments + tier-policy-form)
2. Replace "Astro" → "ShowUp" in email template (HTML + plaintext, 5 occurrences)
3. Apply typography fixes (headline letter-spacing, body max-width, footer font-size/color)
4. Add brand footer element to HTML and plaintext
5. Replace "Astro" → "ShowUp" in project-overview.md (7 occurrences)
6. Run `pnpm check`
7. Run acceptance criteria grep to verify zero remaining occurrences

## Cross-dependency

P3-email-rebrand is bundled with the re-engagement email typography fix (tracked in `current-issues.md`). The typography fix creates the brand footer element — that element is created as "SHOWUP" not "ASTRO" because rebrand ships in the same change.

## Dependencies

- **Requires:** Wave 1 complete (P0+P1+P2 shipped)
- **Blocks:** nothing — this is the final wave

## DO NOT

- Modify `auth-origins.test.ts` fixture URLs (test data, not brand copy)
- Change any logic, routing, or layout
- Self-test with Playwright (Phase 3 handles verification)
