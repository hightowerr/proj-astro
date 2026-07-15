# Rebrand "Astro" → "ShowUp" — Build Order

## Dependency Graph

```
P0 (metadata) ──────────────────┐
P1-site-header ─────────────────┤
P1-auth-brand ──────────────────┤
P1-booking-nav ─────────────────┼──► [PR #1: P0+P1+P2] ──► P3-app-copy ──────────────── (independent)
P1-site-footer ─────────────────┤                      ──► P3-email-rebrand ─┬─ (cross-dep: typography fix)
P2-auth-cta ────────────────────┤                      ──► P4-internal-docs ─── (independent)
P2-landing-copy ────────────────┘
```

| Spec | Depends on | Blocks |
|------|-----------|--------|
| P0 — Metadata | — | P3-app-copy, P3-email-rebrand, P4-internal-docs (via PR #1) |
| P1 — Site header | — | same |
| P1 — Auth brand | — | same |
| P1 — Booking nav | — | same |
| P1 — Site footer | — | same |
| P2 — Auth CTA | — | same |
| P2 — Landing copy | — | same |
| P3 — App copy | PR #1 shipped | — |
| P3 — Email rebrand | PR #1 shipped + typography fix | — |
| P4 — Internal docs | PR #1 shipped | — |

---

## Phased Build Order

### Phase 1 — Core rebrand (all parallel, ship as ONE PR)

| Spec | File(s) | Replacements | Risk |
|------|---------|:---:|------|
| P0-metadata | `src/app/layout.tsx` | 1 | Low |
| P1-site-header | `src/components/site-header.tsx` | 3 | Low |
| P1-auth-brand | `src/components/auth/auth-brand-bar.tsx` | 1 | Low |
| P1-booking-nav | `src/components/booking/booking-nav.tsx` | 2 | Low (code) / High (trust) |
| P1-site-footer | `src/components/site-footer.tsx` | 2 | Low |
| P2-auth-cta | `src/components/auth/sign-in-button.tsx` | 1 | Low |
| P2-landing-copy | 5 landing page components | 11 | Low |

> **7 specs, 21 replacements, 8 files. All parallel — no inter-dependencies. Must ship as a single PR (partial rebrand is worse than none).**

### Phase 2 — Follow-up (parallel, after Phase 1 ships)

| Spec | File(s) | Replacements | Risk | Notes |
|------|---------|:---:|------|-------|
| P3-app-copy | `appointments/page.tsx`, `tier-policy-form.tsx` | 2 | Low | Independent |
| P3-email-rebrand | `connect-reengagement/route.ts` | 5 + new footer | Medium | **Bundle with typography fix PR** |
| P4-internal-docs | `docs/context/project-overview.md` | 7 | None | Internal only |

> **3 specs, 14 replacements + 1 new element, 3 files. All parallel with each other. P3-email-rebrand has cross-dep with typography fix.**

---

## Critical Path

```
Phase 1 (any spec) → P3-email-rebrand + typography fix
```

**Length:** 2 phases. P3-email-rebrand is the bottleneck — it depends on Phase 1 shipping AND the typography fix (separate issue). All other Phase 2 specs are independent once Phase 1 lands.

**Shortest path to brand consistency:** Phase 1 alone (one PR, 21 replacements). Once that ships, every customer-facing surface reads "ShowUp."

---

## Design Needs

| Spec | What the designer needs to review | Pages / Surfaces |
|------|----------------------------------|-----------------|
| P1-booking-nav | **"SHOWUP" wordmark** — 6 chars vs 5 ("ASTRO"). Confirm fit at current font-size, letter-spacing, and brand mark layout. This is the highest-priority review — customer payment flow. | `/book/[slug]` nav bar |
| P1-site-header | **"ShowUp" logo text** — confirm rendering at desktop and mobile drawer sizes. Same layout, different string. | Landing page header, app shell header |
| P1-auth-brand | **"ShowUp" in auth brand bar** — confirm rendering on login/register pages. | `/login`, `/register` |
| P1-site-footer | **"ShowUp" footer logo + copyright** — confirm consistency with header treatment. | Landing page footer |
| P2-landing-copy | **"ShowUp Pro" plan name** — confirm treatment in pricing card. Scan all 5 sections for natural reading. | `/#hero`, `/#how-it-works`, `/#features`, `/#pricing`, `/#faq` |
| P3-email-rebrand | **Brand footer element** — `"SHOWUP · Stop losing money to no-shows."` New element. Review styling, font-size (11.5px), color (#737780). Refer to `Email Connect Reengagement Standalone.html` prototype. | Email template |

**Mock-ups needed:** 2 items —
1. **P1-booking-nav:** "SHOWUP" wordmark in the booking nav (customer-facing, payment flow context)
2. **P3-email-rebrand:** brand footer element in the email template

All other specs are string-only swaps with no layout impact — content sign-off only, no mock-up required.

---

## Architecture Context Updates Needed

> Do NOT apply these now. Apply during Phase 5 (RETRO) of the feature loop, per the loop contract.

### `docs/context/project-overview.md`

1. **Product name:** "Astro" → "ShowUp" throughout (7 replacements — this IS spec P4-internal-docs, applied as part of the loop)

### `docs/context/current-issues.md`

2. **Mark resolved:** "Full rebrand: Astro → ShowUp" once Phase 1 ships. Move P3/P4 status to the resolved entry notes.

### `docs/context/ui-context.md`

3. **Brand name section** (if exists): Update product display name to "ShowUp", uppercase treatment to "SHOWUP", plan name to "ShowUp Pro."

### `docs/context/code-standards.md`

4. **Add convention:** "The product name is 'ShowUp' (camelCase). Uppercase treatment: 'SHOWUP'. Plan name: 'ShowUp Pro.' The `--al-*` CSS token prefix, `proj-astro` directory name, and Vercel deployment URLs are internal artifacts unrelated to the brand name — do not change."

---

## Verified Scope (2026-07-13)

| Metric | Issue estimate | Verified |
|--------|:---:|:---:|
| Occurrences | 28 | **35** |
| Source files | 14 | **15** (project-overview.md adds 7) |
| `auth-origins.test.ts` | listed | **0 matches — dropped** |
| `astro.app/book` URL | listed | **not found — already clean or never existed** |

Total: **10 specs, 35 replacements + 1 new element, 2 phases, 11 files.**
