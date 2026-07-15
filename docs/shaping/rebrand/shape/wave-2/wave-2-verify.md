# Wave 2 Verification Report

**Verifier:** Phase 3 (independent agent)
**Date:** 2026-07-14
**Plan:** `docs/shaping/rebrand/shape/wave-2/wave-2-plan.md`

## Results

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `grep -i "astro" src/app/app/appointments/page.tsx` returns 0 matches | PASS | grep exit code 1 (no matches) |
| 2 | `grep -i "astro" src/components/payments/tier-policy-form.tsx` returns 0 matches | PASS | grep exit code 1 (no matches) |
| 3 | Appointments empty-state tooltip reads "ShowUp offers their slot" | PASS | Line 294: `When a customer cancels, ShowUp offers their slot to another customer on the waitlist.` |
| 4 | Tier policy form tooltip reads "ShowUp can text the open slot" | PASS | Line 922: `When a customer cancels, ShowUp can text the open slot to nearby customers.` |
| 5 | `grep -i "astro" src/app/api/jobs/connect-reengagement/route.ts` returns 0 matches | PASS | grep exit code 1 (no matches) |
| 6 | HTML logo span reads "ShowUp" | PASS | Line 106: `<span class="em-logo" ...>ShowUp</span>` |
| 7 | HTML sign-off reads "-- ShowUp" | PASS | Line 115: `— ShowUp` |
| 8 | HTML footer reads "your ShowUp account" | PASS | Line 117: `...deposit collection for your ShowUp account.` |
| 9 | Plain text sign-off reads "-- ShowUp" | PASS | Line 123: `— ShowUp` in template literal |
| 10 | Plain text footer reads "your ShowUp account" | PASS | Line 123: `your ShowUp account` in template literal |
| 11 | Headline `<p>` style includes `letter-spacing:-0.015em` | PASS | Line 109: `letter-spacing:-0.015em` added to headline style (was absent before) |
| 12 | Body `<p>` style includes `max-width:46ch` | PASS | Line 110: `max-width:46ch` added to body paragraph style (was absent before) |
| 13 | Footer `<p>` style uses `font-size:11.5px` and `color:#737780` | PASS | Line 117: `font-size:11.5px;color:#737780` — changed from `12px` / `#9ca3af` |
| 14 | Brand footer element exists with correct markup | PASS | Line 118: `<p style="font-size:11.5px;color:#737780;margin:0;padding:16px 0 0"><span style="font-weight:800;letter-spacing:.14em;text-transform:uppercase">SHOWUP</span><span style="padding:0 7px">·</span>Stop losing money to no-shows.</p>` — font-weight:800, letter-spacing:.14em, text-transform:uppercase all present |
| 15 | Plain text includes `SHOWUP · Stop losing money to no-shows.` at end | PASS | Line 123: template literal ends with `\n\nSHOWUP · Stop losing money to no-shows.` |
| 16 | `grep -c "Astro" docs/context/project-overview.md` returns 0 | PASS | grep returned `0` |
| 17 | Product name reads "ShowUp", plan name reads "ShowUp Pro" | PASS | Line 7: `**Product name:** ShowUp`, Line 11: `"ShowUp Pro"` |
| 18 | `pnpm check` passes (lint + typecheck) | PASS | Both `eslint .` and `tsc --noEmit` completed with no errors |
| 19 | No logic, routing, or layout changes — diff shows only string content + inline style value changes | PASS | Full diff reviewed: only string literal replacements ("Astro" to "ShowUp") and inline style value changes (letter-spacing, max-width, font-size, color additions). No control flow, imports, routing, or layout structure changes. |
| 20 | `auth-origins.test.ts` fixture URLs not modified | PASS | `git diff -- src/lib/__tests__/auth-origins.test.ts` returned empty (no changes) |

## Summary

| Metric | Count |
|--------|-------|
| Total | 20 |
| PASS | 20 |
| FAIL | 0 |
| BLOCKED | 0 |

**Verdict: PASS** -- All 20 acceptance criteria met. Wave 2 rebrand is complete.
