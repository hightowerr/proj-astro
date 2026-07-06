# Build Order: Wire Email Verification to Resend

## Dependency Graph

```
01-resend-domain-verification ──────────────────────────────┐
02-password-reset-email-template ──┐                        │
03-verification-email-template ──┐ │                        │
04-e2e-test-guards ──────────┐   │ │                        │
07-stale-copy-cleanup        │   │ │                        │
09-no-verification-gate      │   │ │                        │
                             ▼   ▼ ▼                        │
                   05-wire-password-reset ──────────┐       │
                             │   ▼                  │       │
                             │ 06-wire-email-verif ─┤       │
                             │                      ▼       ▼
                             │          08-production-env-config
                             │
                             └──(shared sendEmail import)
```

---

## Phase 1 — No dependencies (all parallel)

| Spec | Description | Type | Effort | Designer? |
|------|-------------|------|--------|-----------|
| `01` | Verify `showup.dev` in Resend (DNS records) | Infra | 15 min | No |
| `02` | Password reset email template (HTML + plain text) | Design | 15 min | **Yes** |
| `03` | Verification email template (HTML + plain text) | Design | 10 min | **Yes** |
| `04` | E2E test guards (`isPlaywrightE2E` in both handlers) | Code | 5 min | No |
| `07` | Fix stale "terminal" copy in forgot-password UI | Code | 5 min | No |
| `09` | Decision record: no verification gate | Doc | 0 min | No |

**Phase 1 total: ~50 min elapsed (parallel), 6 specs**

---

## Phase 2 — Depends on Phase 1 templates + guards

| Spec | Description | Depends on | Effort | Designer? |
|------|-------------|------------|--------|-----------|
| `05` | Wire `sendResetPassword` → `sendEmail()` | `02`, `04` | 15 min | No |
| `06` | Wire `sendVerificationEmail` → `sendEmail()` | `03`, `04` | 10 min | No |

**Phase 2 total: ~15 min elapsed (parallel), 2 specs**

---

## Phase 3 — Depends on everything above + DNS verification

| Spec | Description | Depends on | Effort | Designer? |
|------|-------------|------------|--------|-----------|
| `08` | Set `EMAIL_FROM_ADDRESS` in Vercel production env | `01`, `05`, `06` | 5 min | No |

**Phase 3 total: ~5 min, 1 spec**

---

## Critical Path

```
02-password-reset-template (15 min)
  → 05-wire-password-reset (15 min)
    → 08-production-env-config (5 min)

Total: 35 min sequential
```

The actual bottleneck is DNS propagation for `01-resend-domain-verification` (minutes to hours), but that runs in parallel with all code work and only blocks the final deploy step (`08`).

---

## Designer Brief

### Pages needing mockups: 2 email templates

Both emails share an identical layout — only the copy differs. A single mockup showing the shared structure with variant copy callouts is sufficient.

| Asset | Template | Key elements |
|-------|----------|-------------|
| Email: Password Reset | `02` | Heading "Reset your password", CTA "Reset password →", expiry note "1 hour" |
| Email: Verification | `03` | Heading "Verify your email address", CTA "Verify email →", expiry note "24 hours" |

### Shared layout spec (match existing product emails)

- **Width:** 600px max, `44px 56px` padding (desktop), `28px 24px` (mobile)
- **Header:** "Astro" text logo — 22px, weight 800, `#001e40`
- **Body text:** 15.5px, line-height 1.65, `#111827`
- **CTA button:** `#001e40` bg, white text, 12px radius, `14px 36px` padding. Full-width on mobile
- **Footer:** 12px, `#9ca3af`, separated by 1px `#e5e7eb` rule
- **Dark mode:** Inverts bg to `#0f1117`, text to `#e8eaf0`, muted to `#9ca3af`

### Pages with copy-only changes (no mockup needed)

| Page | File | Change |
|------|------|--------|
| Forgot Password | `src/app/(auth)/forgot-password/page.tsx:19` | `"...to your terminal"` → `"...a reset link"` |
| Forgot Password (success) | `src/components/auth/forgot-password-form.tsx:51` | `"Check your terminal..."` → `"Check your inbox."` |

### Pages explicitly NOT changing

| Page | Why |
|------|-----|
| Dashboard / all protected routes | No verification gate (spec `09`) — no banner, no blocking UI |
| Sign up form | No change — `sendOnSignUp` already handles trigger |
| Reset password form | Already complete, reads token from URL |

---

## Total Effort Summary

| Phase | Specs | Code time | Blocked by |
|-------|-------|-----------|------------|
| 1 | 6 | ~50 min (parallel) | Nothing |
| 2 | 2 | ~15 min (parallel) | Phase 1 |
| 3 | 1 | ~5 min | Phase 2 + DNS verification |
| **Total** | **9** | **~70 min** | **DNS propagation (async)** |
