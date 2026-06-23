# Design Consistency Wave 4 — Shape

## Scope

Specs #09–#19 (11 specs). All depend on #04 (AL utility classes, completed Wave 3).
All are independent of each other — no ordering constraint within this wave.

## Assessment

| Spec | File(s) | Lines | `style={{` | Hex | Category |
|------|---------|-------|-----------|-----|----------|
| #09 | appointments/page.tsx | 365 | 57 | 41 | Heavy inline |
| #10 | customers/page.tsx + customers-editorial.tsx | 204 + 1308 | 13 + 88 | 9 + 82 | Heavy inline |
| #11 | conflicts/page.tsx + conflicts-ledger.tsx | 288 + 849 | 14 + 67 | 10 + 54 | Heavy inline |
| #12 | book/[slug]/page.tsx | 194 | 27 | 0 | Moderate inline |
| #13 | settings/payment-policy/page.tsx | 297 | 35 | 17 | Heavy inline |
| #14 | dashboard/page.tsx | 134 | 0 | 0 | Light class swap |
| #15 | settings/services/page.tsx | 87 | 1 | 0 | Light class swap |
| #16 | settings/billing/page.tsx | 131 | 0 | 0 | Light class swap |
| #17 | settings/calendar/page.tsx | 74 | 5 | 0 | Moderate mixed |
| #18 | profile/page.tsx | 416 | 0 | 0 | Icon swap + class |
| #19 | 6 settings/detail pages | ~1157 | 2 | 0 | Light class swap |

### Key observations

- **No `--color-*` Deep Ledger tokens** remain in any target file — token migration is clean.
- **Companion components** (customers-editorial.tsx @ 1308 lines, conflicts-ledger.tsx @ 849 lines)
  are explicitly mentioned in specs #10/#11 as "should be scoped into this migration or handled
  as a companion spec." Given their size (88+67 inline styles), they warrant their own slices.
- **Lucide icons** appear only in profile/page.tsx and chat/page.tsx. Spec #18 explicitly calls
  for Material Symbols swap on profile. Chat page (spec #19) has no icon spec — leave Lucide as-is.
- **Light pages** (#14, #15, #16, #17, #19) total ~10 files but each change is 2-5 class swaps.

## Risks

1. **Companion components are massive.** Customers-editorial.tsx alone is 1308 lines with 88 inline
   styles. This dwarfs the page files and could dominate the wave. Mitigate: separate slices, scope
   page.tsx first, companion components second.
2. **Booking page (#12) is public-facing.** Intentionally different padding (64px vs 48px). Must
   preserve the wider layout — convert style mechanism only, not values.
3. **Profile page (#18) needs icon swap.** Material Symbols must already be loaded (verified: they
   are via globals.css). The Lucide import can be removed entirely.

## Approach

Single-file sweep pattern (validated in waves 1-3). Group into slices by complexity:

- **Slices 1-2:** Light pages first (build momentum, quick wins)
- **Slices 3-6:** Heavy inline pages (one per slice)
- **Slice 7:** Companion components (largest files, highest risk)

Run `pnpm check` after every slice. No self-verification.

## Scope fence

- **In scope:** All changes described in specs #09-#19
- **Out of scope:** Landing page components (hero-section, site-header, site-footer) per #20 notes
- **Deferred:** chat/page.tsx Lucide icons (no spec calls for swap, only typography alignment)
