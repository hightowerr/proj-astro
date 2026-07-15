# Wave 1 Verify Prompt

Copy this into a **new session** (fresh context, no access to the implementer's reasoning).

---

```
You are a verifier. You did NOT implement this code. Your job is to verify it works.

## Inputs
- Specs: docs/shaping/rebrand/ (P0-metadata, P1-site-header, P1-auth-brand, P1-booking-nav, P1-site-footer, P2-auth-cta, P2-landing-copy)
- Wave plan: docs/shaping/rebrand/shape/wave-1/wave-1-plan.md
- Design brief: docs/shaping/rebrand/DESIGN-BRIEF.md
- Mock-ups: docs/shaping/rebrand/Rebrand Mockups.html
- Files changed (13): src/app/layout.tsx, src/app/page.tsx, src/components/site-header.tsx, src/components/auth/auth-brand-bar.tsx, src/components/booking/booking-nav.tsx, src/components/site-footer.tsx, src/components/auth/sign-in-button.tsx, src/components/landing/hero-section.tsx, src/components/landing/faq-section.tsx, src/components/landing/how-it-works.tsx, src/components/landing/features-carousel.tsx, src/components/landing/pricing-section.tsx, src/components/onboarding/shop-details-step.tsx
- App URL: localhost:3000

## Workflow

### 0. Static checks (before browser)
1. Run `pnpm check` — must pass (lint + typecheck)
2. Run `grep -ri "astro" src/app/layout.tsx src/app/page.tsx src/components/site-header.tsx src/components/auth/auth-brand-bar.tsx src/components/booking/booking-nav.tsx src/components/site-footer.tsx src/components/auth/sign-in-button.tsx src/components/landing/hero-section.tsx src/components/landing/faq-section.tsx src/components/landing/how-it-works.tsx src/components/landing/features-carousel.tsx src/components/landing/pricing-section.tsx src/components/onboarding/shop-details-step.tsx` — must return 0 matches
3. Verify no logic/routing/layout changes: `git diff --stat` should show only string content changes across the 13 files

### 1. Start the dev server
Run `pnpm dev` if not already running. Wait for localhost:3000.

### 2. Playwright verification — visit every affected surface

For each page below, use Playwright MCP to:
- Navigate to the page
- Take a screenshot
- Search the page snapshot for any occurrence of "Astro" or "ASTRO" (case-insensitive)
- Report PASS (zero occurrences) or FAIL (with location)

#### Pages to verify

| # | URL | What to check | Spec |
|---|-----|---------------|------|
| 1 | `/` (landing page) | Browser tab title = "ShowUp". Header logo = "ShowUp". Hero text. How-it-works heading + steps. Features carousel slide text. Pricing card "ShowUp Pro". FAQ section (all 5 answers + subtitle). Footer logo + copyright "© 2025 ShowUp." | P0, P1-site-header, P1-site-footer, P2-landing-copy |
| 2 | `/` (mobile 390px) | Resize to 390px width. Open hamburger drawer. Drawer logo = "ShowUp". Close drawer. | P1-site-header |
| 3 | `/login` | Auth brand bar = "ShowUp". "New to ShowUp?" prompt visible. | P1-auth-brand, P2-auth-cta |
| 4 | `/register` | Auth brand bar = "ShowUp". | P1-auth-brand |
| 5 | `/book/test` (or any valid slug) | Booking nav wordmark = "SHOWUP" (uppercase). Brand mark icon unchanged. aria-label = "ShowUp homepage" (check snapshot). | P1-booking-nav |

#### Additional checks (no browser needed — code review)

| # | File | What to check | Spec |
|---|------|---------------|------|
| 6 | `src/app/page.tsx` | Two FeatureSection `description` props reference "ShowUp" not "Astro" | New find |
| 7 | `src/components/onboarding/shop-details-step.tsx` | Demo URL reads `showup.dev/book/` not `astro.com/book/` | New find |
| 8 | `src/components/landing/features-carousel.tsx` | Demo URL reads `showup.dev/book` not `astro.app/book` | New find |

### 3. Verify what was NOT changed (negative checks)

| # | What | How to verify |
|---|------|---------------|
| 9 | Brand mark icon code | Read `booking-nav.tsx` — the `dashboard_customize` Material Symbol and navy square styling are unchanged |
| 10 | `--al-*` CSS tokens | `grep -r "al-" src/app/globals.css | head -5` — token names unchanged |
| 11 | Wave 2 items still have "Astro" | `grep -c "Astro" src/components/payments/tier-policy-form.tsx src/app/app/appointments/page.tsx src/app/api/jobs/connect-reengagement/route.ts` — should return match counts (these are intentionally NOT changed in Wave 1) |
| 12 | No logic changes | `git diff` shows only string content changes — no new imports, no changed conditionals, no layout modifications |

### 4. Design verification (compare against mock-ups)

Open `docs/shaping/rebrand/Rebrand Mockups.html` in browser (serve locally). Compare:
- Booking nav "SHOWUP" wordmark: font-size, letter-spacing, alignment match the mock-up
- No visual overflow at desktop or mobile widths

## Output

Write verification report to docs/shaping/rebrand/shape/wave-1/wave-1-verify.md:

| # | Check | Spec | Status | Evidence |
|---|-------|------|--------|----------|
| 1 | Landing page — all text | P0, P1, P2 | PASS/FAIL | screenshot |
| 2 | Mobile drawer logo | P1-site-header | PASS/FAIL | screenshot |
| 3 | Login page | P1-auth-brand, P2-auth-cta | PASS/FAIL | screenshot |
| ... | ... | ... | ... | ... |

## If any FAIL
Create a fix issue per failure in docs/context/current-issues.md with:
- What failed
- Expected vs actual behavior
- Suggested fix (read-only observation — do not implement)

→ Return to Phase 2 (IMPLEMENT) to fix the issues. Then re-verify.

## Constraints
- READ-ONLY — do not modify any source code
- Do not access the implementing agent's reasoning or conversation
- Test only against the acceptance criteria — nothing more, nothing less
```
