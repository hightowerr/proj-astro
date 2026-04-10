---
shaping: true
---

# Auth Redesign — Ship Report

**Auditor pass:** shaped solution delivery · visual polish · Stitch provenance  
**Date:** 2026-04-10  
**Inputs:** `auth-redesign-shaping.md` · `login-register-requirements.md` · `review-01.md` · `stitch_reminder_system_prd (login)/code.html` · current codebase

---

## Did We Deliver the Shaped Solution?

### Requirements verdict

| Req | Description | Delivered? |
|-----|-------------|-----------|
| R0 | Dedicated shell owns full viewport — no marketing chrome | ✅ `RouteChrome` renders `<main>{children}</main>` for all auth routes. `(auth)/layout.tsx` is `min-h-screen bg-background`. |
| R1 | Premium split-screen desktop layout — collapses to single-column mobile | ✅ `AuthShell`: `flex-col md:flex-row`. Hero `hidden md:flex md:w-1/2 lg:w-3/5`. Form `flex-1 md:w-1/2 lg:w-2/5`. `pt-24` clears brand bar on mobile. |
| R2 | Atelier light tokens: filled inputs, ghost focus rings, soft-depth CTA, tertiary links | ✅ `bg-input` fills, `focus:ring-primary/20`, `bg-primary hover:bg-[#003366] active:scale-95 shadow-xl shadow-primary/5`, `font-bold text-primary hover:underline`. |
| R3 | `/login`: email/password, forgot-pw adjacent to label, register link, `?reset=success` banner, session guard, editorial copy | ✅ All present. |
| R4 | `/register`: 4-field contract, no business fields, onboarding-framed copy | ✅ Name/email/password/confirm. No business fields absorbed. |
| R5 | `/forgot-password` and `/reset-password` in shell; truthful copy; token-based reset; redirect to `?reset=success` | ✅ Terminal delivery copy in forgot-password success state. Invalid/expired token state in reset-password. |
| R6 | Email/password only. No Google control. No inbox claim. No verification-before-entry. | ✅ Google fully absent. No divider. Copy is truthful. |
| R7 | Functional integrity: session guards, redirects, onboarding trigger | ✅ All guards preserved. `Suspense` wrapping `ResetPasswordForm` maintained. Onboarding untouched. |
| R8 | Auth shell footer omitted entirely | ✅ No footer row, no dead links. |
| R9 | Rate limiting: per-IP, shared across instances, stricter on reset endpoints | ✅ Pre-existing implementation in `src/lib/auth.ts`. Not regressed. |

**All 10 requirements met.** Core goals R0 and R1 delivered cleanly.

---

## Is the Visual Polish Appropriate for the Appetite?

**Yes. No over-design found.**

The appetite was: a premium split-screen auth shell with Atelier tokens, covering 4 routes — scoped as a 2-slice implementation. The implementation lands exactly at that mark:

- `active:scale-95` and `shadow-xl shadow-primary/5` on the CTA button are explicitly specified in the shaping doc (B6). They are not additions.
- No micro-animations beyond what the spec called for.
- No extra gradients, glow effects, or hover transitions were added.
- Module-level CSS constants (`INPUT_CLASS_NAME`, `PRIMARY_BUTTON_CLASS_NAME`, `SECONDARY_LINK_CLASS_NAME`) are pragmatic DRY — 3 call sites per constant. Not abstraction creep.
- `autoComplete` attributes on inputs are a one-line pragmatic addition. Correct call.
- Lucide `Eye`/`EyeOff` for visibility toggles instead of Material Symbols — pragmatic (no new dependency, same visual weight).

---

## What Was Built vs What Stitch Generated vs What Was Custom

### Structural provenance

| Element | Stitch (`code.html`) | Built | Verdict |
|---------|----------------------|-------|---------|
| Fixed glassmorphic brand bar | ✅ `bg-[#f9f9f7]/80 backdrop-blur-xl` · "Atelier" wordmark | ✅ identical structure · "Astro" wordmark | **From Stitch — brand name corrected** |
| Desktop tagline in brand bar | ✅ "Manage your studio with ease" | ✅ "Manage your bookings with ease" | **From Stitch — copy refined** |
| Split-screen container | ✅ `flex-grow flex flex-col md:flex-row` | ✅ `flex flex-col md:flex-row min-h-screen` | **From Stitch** |
| Hero panel proportions | ✅ `hidden md:flex md:w-1/2 lg:w-3/5` | ✅ identical | **From Stitch** |
| Hero image treatment | ✅ full-bleed + `opacity-90 mix-blend-multiply grayscale-[20%]` + gradient overlay | ✅ identical treatment | **From Stitch** |
| Hero image source | Stitch: Google-hosted luxury boutique interior | Built: Unsplash `photo-1562322140-8baeececf3df` (hairstylist in bright salon) | **Custom — correct. OQ-1 chose a more on-brand image for beauty professionals.** |
| Hero headline style | ✅ `text-5xl lg:text-7xl font-bold tracking-tight text-on-primary` | ✅ identical | **From Stitch** |
| Form panel proportions | ✅ `w-full md:w-1/2 lg:w-2/5 flex items-center justify-center` | ✅ identical | **From Stitch** |
| Form container width | Stitch: `max-w-md` (28rem) | Built: `max-w-sm` (24rem) | **Minor deviation — acceptable. Form content is narrower than Stitch.** |
| Form heading alignment | Stitch: `text-center md:text-left` | Built: left-aligned always | **Minor deviation — acceptable.** |
| Input styling | ✅ `bg-surface-container-low border-none focus:ring-1 focus:ring-primary/20 rounded-xl py-4 px-5 outline-none` | ✅ `bg-input border-0 focus:ring-1 focus:ring-primary/20 rounded-xl py-4 px-5 outline-none` — `bg-input` maps to `#f4f4f2` (same value) | **From Stitch — token mapped correctly to project Tailwind config** |
| Forgot-pw link inline in label row | ✅ `flex justify-between items-center mb-2` | ✅ identical | **From Stitch** |
| Password visibility toggle | ✅ Material Symbols `visibility` icon | Lucide `Eye`/`EyeOff` | **Custom — correct. No new dependency needed; identical visual function.** |
| Primary CTA | ✅ `bg-primary text-on-primary font-bold py-4 rounded-xl hover:bg-primary-container active:scale-95 shadow-xl shadow-primary/5` | ✅ `bg-primary text-primary-foreground font-bold py-4 rounded-xl hover:bg-[#003366] active:scale-95 shadow-xl shadow-primary/5` — `hover:bg-[#003366]` is `primary-container` value; `text-primary-foreground` is `on-primary` | **From Stitch — tokens remapped correctly** |
| Sign-up/sign-in tertiary links | ✅ `font-bold text-primary hover:underline` | ✅ identical | **From Stitch** |
| **Google "Continue with Google" button** | ✅ Present (disabled, "Coming Soon" badge) | **Absent** | **Correctly removed. OQ-4: no control of any kind.** |
| **"or use email" divider** | ✅ Present | **Absent** | **Correctly removed. No social option to divide from.** |
| **Footer: Privacy / Terms / Support** | ✅ Present | **Absent** | **Correctly removed. OQ-3: routes don't exist in v1.** |
| **Footer copyright line** | ✅ Present | **Absent** | **Correctly removed. Keeps shell clean.** |

### What was custom (not in Stitch)

Stitch only produced the `/login` screen. Everything below was built without a Stitch reference:

| Item | Where |
|------|-------|
| Route-specific editorial copy for `/register`, `/forgot-password`, `/reset-password` | `auth-redesign-shaping.md` → `Per-Route Editorial Copy` table |
| `<AuthShell>` server component with props contract | Custom architecture (Shape B) |
| `<AuthBrandBar>` server component | Custom — matches Stitch header HTML |
| `(auth)/layout.tsx` minimal wrapper | Custom |
| `RouteChrome` wiring for auth chrome suppression | Pre-existing mechanism, wired for auth routes |
| Per-route `page.tsx` session guards + `Suspense` | Custom — functional integrity preservation |
| `?reset=success` banner on `/login` | Custom — pre-existing feature, restyled |
| Module-level CSS constants | Custom — pragmatic DRY |
| `autoComplete` attributes on all inputs | Custom — pragmatic |
| `BOUNDARY` slice comments | Custom — scope documentation |

### Decisions made against Stitch

All four were explicitly closed in the shaping doc before implementation:

| Stitch element | Decision | Closed by |
|----------------|----------|-----------|
| Google "Continue with Google" (disabled) | Absent entirely — no control of any kind | OQ-4 |
| "or use email" divider | Removed — meaningless without a social option above | OQ-4 consequence |
| Footer: Privacy Policy · Terms · Support | Omitted — routes not shipping in v1 | OQ-3 |
| Footer copyright line | Omitted — clean shell preferred | OQ-3 consequence |

---

## Open Items from review-01

Two blockers were raised in `review-01.md` that have **not yet been addressed** in the codebase:

### Blocker 1 — `sessionPending` early return still present

**File:** `src/components/auth/sign-in-button.tsx:26–35`

The form panel renders as a single "Loading..." button for ~300ms on every `/login` page load. The server-side session guard already confirms unauthenticated state before SSR — the client-side `isPending` guard is redundant. 5-line fix: delete the block.

### Blocker 2 — `TODO: Stitch polish` comments not added

The implementation uses `BOUNDARY` comments (scope documentation) but has no `TODO: Stitch polish` markers for deferred visual debt. Two spots need them:

- `reset-password/page.tsx` — Suspense fallback is bare `<div>Loading...</div>`
- Anywhere a future visual refinement (skeleton, shimmer, etc.) is known but deferred

---

## Recommendation

# [SHIP] — with two pre-ship fixes

The shaped solution is fully delivered. All R0–R9 requirements met. Build is clean (0 lint errors, 0 type errors, 0 build warnings). Visual polish is scoped to appetite — no over-design. Stitch provenance is clear: structure and token decisions followed the generated reference; four closed decisions (OQ-1 through OQ-4) correctly removed elements that were out of scope for v1.

The two review-01 blockers are cosmetic and small (a 5-line delete and 2 comment additions). Neither represents a design regression or a functional gap against the shaped requirements. Fix them, then ship.

### Pre-ship checklist

- [ ] Delete `sessionPending` early return in `sign-in-button.tsx:26–35`
- [ ] Add `TODO: Stitch polish` marker on `reset-password/page.tsx` Suspense fallback

### Post-ship backlog (non-blocking)

| Item | Source |
|------|--------|
| Redirect inconsistency: `router.push` vs `window.location.assign` | review-01 Bug #2 |
| `colorScheme: dark` on `<html>` conflicts with Atelier Light autofill | review-01 Bug #3 |
| `SignUpForm` missing client-side name validation | review-01 Bug #4 |
| Error `<p>` elements need `role="alert"` / `aria-live` | review-01 Bug #5 |
| Password visibility toggles need `aria-pressed` | review-01 Bug #6 |
| Form heading not centered on mobile (Stitch: `text-center md:text-left`) | Minor deviation |
| Form container `max-w-sm` vs Stitch `max-w-md` | Minor deviation |
