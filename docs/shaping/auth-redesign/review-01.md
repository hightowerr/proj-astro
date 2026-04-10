---
shaping: true
---

# Auth Redesign — Review 01

**Slice:** V1 (Shell + Route Wiring) + V2 (Form Atelier Token Pass)  
**Date:** 2026-04-10  
**Inputs:** `auth-redesign-shaping.md`, `auth-redesign-v1-plan.md`, `auth-redesign-v2-plan.md`, `bug-report-01.md`

---

## Build Status

| Check | Result |
|-------|--------|
| `pnpm lint` | 0 errors · 1 pre-existing unrelated warning (`shop-details-step.tsx`) |
| `pnpm typecheck` | 0 errors |
| `next build` | Clean · 0 errors · 0 warnings · all 4 auth routes compiled as dynamic server-rendered pages |

---

## Requirements Check (R0–R9)

| Req | Status | Evidence |
|-----|--------|----------|
| R0 | ✅ | `RouteChrome` renders `<main>{children}</main>` for all auth routes — no `SiteHeader`/`SiteFooter`. `(auth)/layout.tsx` is `min-h-screen bg-background`. |
| R1 | ✅ | `AuthShell` — `flex-col md:flex-row min-h-screen`. Hero panel `hidden md:flex md:w-1/2 lg:w-3/5`. Form panel `flex-1 ... md:w-1/2 lg:w-2/5`. Correct asymmetry. |
| R2 | ✅ | `bg-input` inputs, `focus:ring-primary/20`, `bg-primary` CTA buttons, `font-bold text-primary` tertiary links. Token constants defined at module level in each form. |
| R3 | ✅ | Login: forgot-pw link inline-right of password label, register link, `?reset=success` banner present, session guard. |
| R4 | ✅ | 4-field form intact. No business setup fields. Copy previews onboarding. |
| R5 | ✅ | Both routes in `AuthShell`. `ForgotPasswordForm` shows terminal delivery copy. `ResetPasswordForm` handles invalid token + valid token states. |
| R6 | ✅ | No Google button anywhere. No "or use email" divider. No inbox claim. |
| R7 | ✅ | Session guards preserved on all 4 pages. `Suspense` wrapping `ResetPasswordForm` maintained. Onboarding trigger untouched. |
| R8 | ✅ | No footer in `AuthShell`. No dead links. |
| R9 | ✅ | Pre-existing — confirmed implemented in `src/lib/auth.ts`. Not touched by this slice. |

All requirements met.

---

## Premature Visual Optimization Check

No over-engineering detected. The `active:scale-95` and `shadow-xl shadow-primary/5` on CTA buttons are explicitly specified in the shaping doc (B6). No additional animations, gradients, or effects were added beyond the spec. Token constants (`INPUT_CLASS_NAME`, `PRIMARY_BUTTON_CLASS_NAME`, `SECONDARY_LINK_CLASS_NAME`) are a clean implementation detail — not abstraction creep. The `autoComplete` attributes added to inputs are a pragmatic addition that improves UX without violating scope. **Pass.**

---

## "TODO: Stitch polish" Comments

**Not present.** The implementation uses `/* BOUNDARY: auth-redesign-vN ... */` comments, which document slice scope correctly. These do not serve as visual debt markers. The shaping doc acknowledges that form token restyling (V2) ships as a separate pass from the shell wiring (V1) — the V1 `AuthShell` boundary comment notes this — but there are no `TODO: Stitch polish` markers flagging known remaining visual debt.

Known items without markers:
- `reset-password/page.tsx` — Suspense fallback is `<div>Loading...</div>` (bare, unstyled)
- `sign-in-button.tsx` — `sessionPending` loading state appearance is unstyled relative to the form

**Gap — requires action.**

---

## Mobile Responsive Check

Confirmed from `auth-shell.tsx`:

| Element | Class | Behaviour |
|---------|-------|-----------|
| Outer wrapper | `flex-col md:flex-row` | Single column on mobile ✓ |
| Hero panel | `hidden md:flex` | Fully hidden below `md` ✓ |
| Form panel top padding | `pt-24 md:p-12` | 96px clears 72px fixed brand bar on mobile; overridden at `md` where `items-center` handles vertical centering ✓ |
| Brand bar tagline | `hidden md:block` | Mobile-hidden ✓ |

One minor divergence: `reset-password/page.tsx` uses `<Suspense fallback={<div>Loading...</div>}>` where the V1 plan specified `<p className="text-sm text-muted-foreground">Loading...</p>`. The bare `<div>` inherits neither Manrope font nor muted colour from the form panel context. Low severity.

---

## Bug Report Validation

### Bug #1 — `SignInButton` hides form during session load
**Confirmed, functional.** The `sessionPending` guard was present in the original code but is now more impactful — previously it replaced a small card button; in the new layout it leaves the entire AuthShell form panel empty for 200–500ms on every page load. The server-side session guard on the page already confirms the user is unauthenticated before SSR, making the client-side `isPending` guard redundant and harmful.

**Fix:** remove the `sessionPending` early return block (`sign-in-button.tsx:26–35`). The `if (session) return null` guard can stay as a defence-in-depth check after `isPending` resolves.

```tsx
// Delete this block entirely:
if (sessionPending) {
  return (
    <button type="button" disabled className={PRIMARY_BUTTON_CLASS_NAME}>
      Loading...
    </button>
  )
}
```

---

### Bug #2 — Conflicting redirects in sign-in and sign-up
**Partially confirmed, low severity.** For email/password flows, `callbackURL` in `signIn.email()` / `signUp.email()` is a no-op — it applies to OAuth callback flows, not credential flows. The manual redirect is what navigates. The inconsistency (`router.push + router.refresh` in sign-in vs `window.location.assign` in sign-up) is real but pre-existing — not introduced by this slice. **Track separately. Not a blocker.**

---

### Bug #3 — RootLayout `colorScheme: "dark"` conflicts with Atelier Light
**Confirmed, pre-existing.** `src/app/layout.tsx` has `style={{ colorScheme: "dark" }}` on `<html>`. Not introduced by this slice. Immediate impact on auth pages: browser autofill overlays may render with dark chrome on the light form inputs; `colorScheme: dark` is the wrong hint for Atelier Light pages. **Track separately. Not a blocker.**

---

### Bug #4 — `SignUpForm` missing name validation in `handleSubmit`
**Confirmed, low severity.** Native `required` prevents empty-name submission via browser validation. Server validation is the real boundary. Pre-existing. **Track separately. Not a blocker.**

---

### Bug #5 — Error messages lack `role="alert"` and `aria-live`
**Confirmed, accessibility blocker.** All error `<p>` elements across the 4 form components are plain text with no `role="alert"` or `aria-live="polite"`. Screen reader users will not be notified on submission failure. Pre-existing pattern, now applied to all restyled components. **Track separately. Not a blocker for this slice.**

---

### Bug #6 — Missing `aria-pressed` on password visibility toggles
**Confirmed.** Visibility toggle buttons update their `aria-label` on state change but do not use `aria-pressed`. Introduced by V2. **Track separately. Not a blocker.**

---

### Bug #7 — Incorrect label association for forgot password link
**Disputed — not actionable.** The `<label htmlFor="password">` and the `<Link>` are siblings inside a `flex justify-between` wrapper. The link is not inside the `<label>` element. Screen readers read the label and link as distinct interactive elements — this is standard semantic HTML and matches the shaping doc spec (R3). The bug description overstates the impact.

---

## Status

## REQUEST CHANGES

Two items block approval:

### Blocker 1 — Remove `sessionPending` early return in `SignInButton`

**File:** `src/components/auth/sign-in-button.tsx:26–35`

Hiding the entire form panel on every page load is a regression in perceived responsiveness. The server-side guard makes the client-side `isPending` check redundant.

Delete:
```tsx
if (sessionPending) {
  return (
    <button
      type="button"
      disabled
      className={PRIMARY_BUTTON_CLASS_NAME}
    >
      Loading...
    </button>
  )
}
```

---

### Blocker 2 — Add `TODO: Stitch polish` markers for known visual debt

**Files:** `src/app/(auth)/reset-password/page.tsx`, `src/components/auth/sign-in-button.tsx`

The `BOUNDARY` comment convention documents scope but does not surface visual debt for future polish passes. Add at minimum:

`reset-password/page.tsx`:
```tsx
{/* TODO: Stitch polish — Suspense fallback unstyled; apply Atelier skeleton or spinner in a future pass */}
<Suspense fallback={<div>Loading...</div>}>
```

`sign-in-button.tsx` — after removing the `sessionPending` block, if a future skeleton/shimmer is intended:
```tsx
{/* TODO: Stitch polish — no loading skeleton on session check; acceptable at v1 since server guard handles auth */}
```

---

### Secondary — Track separately, not blocking

| # | Item |
|---|------|
| Bug #2 | Redirect inconsistency (`router.push` vs `window.location.assign`) |
| Bug #3 | `colorScheme: dark` on `<html>` affects autofill on Atelier Light pages |
| Bug #4 | Missing client-side name validation in `SignUpForm` |
| Bug #5 | Error `<p>` elements need `role="alert"` / `aria-live="polite"` |
| Bug #6 | Password visibility toggles need `aria-pressed` |
