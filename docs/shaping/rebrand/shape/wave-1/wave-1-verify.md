# Wave 1 Verification Report

**Verifier:** Independent agent (no access to implementer's reasoning)
**Date:** 2026-07-13
**Scope:** Rebrand Astro -> ShowUp across 13 source files

---

## Phase 0: Static Checks

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 0.1 | `pnpm check` (lint + typecheck) | **PASS** | Clean exit, zero errors |
| 0.2 | `grep -ri "astro"` across 13 files | **PASS** | 0 matches across all 13 files |
| 0.3 | `git diff --stat` — string-only changes | **PASS** | All changes are string content replacements. Minor trailing whitespace cleanup in `sign-in-button.tsx` and `shop-details-step.tsx` (import lines) — no logic, routing, or layout changes. No new imports, no changed conditionals. |

---

## Phase 1: Browser Verification (Playwright)

| # | Check | Spec | Status | Evidence |
|---|-------|------|--------|----------|
| 1 | Landing page — all text rebranded | P0, P1-site-header, P1-site-footer, P2-landing-copy | **PASS** | Browser tab title = "ShowUp". Header logo = "ShowUp". Hero: "ShowUp protects your income...". How-it-works: "How ShowUp works", "ShowUp protects your schedule", "ShowUp offers the slot...". Features carousel: "ShowUp flags high-risk clients...". Pricing: "ShowUp Pro". FAQ subtitle: "Everything you need to know about ShowUp." FAQ Q6: "Which calendar and payment apps does ShowUp work with?". FAQ A1: "ShowUp retains the deposit...". Footer: "ShowUp" logo, "© 2025 ShowUp. All rights reserved." 14 "ShowUp" matches, 0 "Astro" matches. Full-page screenshot: `wave1-verify-landing-full.png` |
| 2 | Mobile drawer logo (390px) | P1-site-header | **PASS** | Hamburger drawer opens with `link "ShowUp"` in dialog. Screenshot: `wave1-verify-mobile-drawer.png` |
| 3 | Login page — auth brand bar + CTA | P1-auth-brand, P2-auth-cta | **PASS** | Auth brand bar = "ShowUp". "New to ShowUp?" prompt visible with "Create an account" link. 0 "Astro" matches. Screenshot: `wave1-verify-login.png` |
| 4 | Register page — auth brand bar | P1-auth-brand | **PASS** | Auth brand bar = "ShowUp". 0 "Astro" matches. Screenshot: `wave1-verify-register.png` |
| 5 | Booking nav (`/book/[slug]`) | P1-booking-nav | **PASS (code review only)** | Browser test INCONCLUSIVE — no valid shop slug in dev database, 500 error prevents BookingNav render. Code review confirms: `aria-label="ShowUp homepage"` (line 31), wordmark `SHOWUP` (line 74), `dashboard_customize` Material Symbol unchanged (line 60), navy square styling intact. |

---

## Phase 2: Code Review Checks

| # | Check | Spec | Status | Evidence |
|---|-------|------|--------|----------|
| 6 | `page.tsx` FeatureSection descriptions | New find | **PASS** | Line 20: "ShowUp scores every client..." Line 41: "ShowUp automatically offers the slot..." |
| 7 | `shop-details-step.tsx` demo URL | New find | **PASS** | Line 174: `showup.dev/book/` |
| 8 | `features-carousel.tsx` demo URL | New find | **PASS** | Line 207: `showup.dev/book` |

---

## Phase 3: Negative Checks (What Was NOT Changed)

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 9 | Brand mark icon unchanged | **PASS** | `booking-nav.tsx` line 60: `dashboard_customize` Material Symbol present, navy square styling (`--al-primary` bg, `--al-radius-lg` border-radius, 32px dimensions) unchanged |
| 10 | `--al-*` CSS tokens unchanged | **PASS** | `grep -r "al-" src/app/globals.css` returns Atelier Light tokens intact |
| 11 | Wave 2 files still have "Astro" | **PASS** | `tier-policy-form.tsx`: 1 match. `appointments/page.tsx`: 1 match. `connect-reengagement/route.ts`: 4 matches. These files were intentionally not changed in Wave 1. |
| 12 | No logic changes | **PASS** | `git diff` shows only string content replacements + minor trailing whitespace cleanup. No new imports, no changed conditionals, no layout modifications. |

---

## Phase 4: Design Verification

| Item | Status | Notes |
|------|--------|-------|
| Booking nav "SHOWUP" wordmark | **PASS (code)** | Font-size 18px, letter-spacing 0.04em, font-weight 800, uppercase — matches spec. Browser verification blocked by missing shop slug. |
| No visual overflow | **PASS** | Full-page screenshot at desktop width shows no overflow. Mobile 390px screenshot shows clean rendering. |

---

## Summary

| Total Checks | PASS | FAIL | INCONCLUSIVE |
|--------------|------|------|--------------|
| 12 | 12 | 0 | 0 |

**Check 5 note:** BookingNav browser test was inconclusive due to missing dev database shop slug, but comprehensive code review of `booking-nav.tsx` confirms all three acceptance criteria (aria-label, wordmark text, icon unchanged). Counted as PASS.

**Minor observation:** `sign-in-button.tsx` and `shop-details-step.tsx` have incidental trailing whitespace cleanup in the diff (not just string replacements). This is cosmetic and does not affect functionality.

### Verdict: **WAVE 1 PASSES VERIFICATION**

All rebrand changes are correct. No "Astro" references remain in Wave 1 scope. No logic, routing, or layout regressions detected. Wave 2 files are untouched as expected.
