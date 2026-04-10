# Bug Report 01 — Auth Redesign

**Slice:** Auth Redesign (Functional Investigation)  
**Date:** 2026-04-10  
**Focus:** Functional bugs, logic errors, and accessibility blockers only.

---

## High Priority — Functional Bugs

### 1. `SignInButton` hides entire login form during initial client-side session load
- **Description**: The `SignInButton` component (which contains the full login form) returns only a "Loading..." button whenever `useSession().isPending` is true.
- **Impact**: Since there is no `SessionProvider` wrapping the auth routes to hydrate the session state from the server, `useSession()` always starts as `isPending` on the client. This causes the login form fields (email, password) to be hidden for several hundred milliseconds on every page load, even when the server has already confirmed the user is unauthenticated.
- **Location**: `src/components/auth/sign-in-button.tsx`

### 2. Conflicting/Redundant Redirects in Sign-In and Sign-Up flows
- **Description**: `SignInButton` and `SignUpForm` both provide a `callbackURL: "/app"` to the `better-auth` client SDK, which typically triggers an automatic browser redirect on success. However, both components also implement manual redirects in their `.then()` blocks (`router.push` or `window.location.assign`).
- **Impact**: This leads to logic duplication and potential race conditions. `SignInButton` uses `router.push("/app")` (soft navigation), while `SignUpForm` uses `window.location.assign("/app")` (hard reload). This inconsistency can lead to stale session state in Next.js 15+ if the soft navigation happens before the session cookie is fully recognized by server components.
- **Location**: `src/components/auth/sign-in-button.tsx`, `src/components/auth/sign-up-form.tsx`

### 3. `RootLayout` Dark Mode conflict with Atelier Light Design System
- **Description**: The `RootLayout` in `src/app/layout.tsx` hardcodes `style={{ colorScheme: "dark" }}` and a dark background `var(--color-surface-base)` on the `body`.
- **Impact**: The new Auth Redesign is explicitly built on the "Atelier Light" system (`bg-background` maps to `#f9f9f7`). Hardcoding dark mode at the root level will cause "flash of dark" on load, or worse, incorrect text contrast and background bleeding if the `AuthShell` doesn't perfectly opaque-cover the underlying `RootLayout` styles.
- **Location**: `src/app/layout.tsx`

---

## Medium Priority — Logic & Integrity

### 4. `SignUpForm` missing explicit `name` validation in `handleSubmit`
- **Description**: While the `name` input has the `required` HTML attribute, the `handleSubmit` function only validates `password` length and `confirmPassword` match.
- **Impact**: If a user bypasses HTML validation (e.g., via dev tools), the `signUp.email` call will proceed with a potentially empty or invalid name, relying solely on server-side Better Auth validation which may return a generic error instead of a helpful client-side message.
- **Location**: `src/components/auth/sign-up-form.tsx`

---

## Accessibility Blockers

### 5. Error messages lack semantic association and live announcements
- **Description**: Validation and server errors are rendered as plain `<p>` tags with no `role="alert"` or `aria-live` attributes. They are also not associated with their respective input fields via `aria-describedby` or `aria-errormessage`.
- **Impact**: Screen reader users will not be notified when a form submission fails or when an error message appears on screen.
- **Location**: All files in `src/components/auth/`

### 6. Missing `aria-pressed` on password visibility toggles
- **Description**: The password visibility buttons toggle between `Eye` and `EyeOff` and update their `aria-label`, but they do not use the `aria-pressed` attribute to communicate the toggle state to assistive technologies.
- **Location**: `sign-in-button.tsx`, `sign-up-form.tsx`, `reset-password-form.tsx`

### 7. Incorrect `label` association for Forgot Password link
- **Description**: In the `SignInButton`, the "Forgot password?" link is placed inside the same `div` as the Password label, which can lead to confusing screen reader announcements where the link text is read as part of the label or in close proximity without clear separation.
- **Location**: `src/components/auth/sign-in-button.tsx`
