# Rebrand Design Brief — "Astro" → "ShowUp"

## Context

The product domain is `showup.dev`. All user-facing surfaces still say "Astro" or "ASTRO." This brief covers every surface that needs designer review before implementation ships.

**Brand rules:**
- Display name: **ShowUp** (camelCase)
- Uppercase treatment: **SHOWUP** (matches current "ASTRO" all-caps usage)
- Plan name: **ShowUp Pro**
- Brand mark: **unchanged** — navy square + `dashboard_customize` icon stays as-is
- `--al-*` design system tokens: **unchanged** — unrelated to the product name

---

## Mock-ups — RECEIVED (2026-07-13)

Mock-up file: `docs/shaping/rebrand/Rebrand Mockups.html`

### 1a. Booking nav wordmark (P1-booking-nav) — APPROVED

**Surface:** `/book/[slug]` — the customer booking + payment flow
**File:** `src/components/booking/booking-nav.tsx`

**Designer verdict:** SHOWUP fits at the unchanged spec — no changes needed.

**Verified specs from mock-up:**

- Wordmark: `font-size: 16px`, `font-weight: 800`, `letter-spacing: .16em`
- Mark-to-wordmark gap: `11px` (unchanged)
- Brand mark square: `34px` (unchanged)
- `white-space: nowrap` prevents wrapping
- Desktop 1100px: brand block + nav links + CTAs all clear each other
- Mobile 390px: nav links hidden, brand block + CTA still clear each other — no overflow

**No layout, spacing, or font changes required. String swap only.**

### 1b. Email brand footer (P3-email-rebrand) — APPROVED

**Surface:** Connect re-engagement email (sent via Resend)
**File:** `src/app/api/jobs/connect-reengagement/route.ts`

**Verified specs from mock-up:**

- Full line: `SHOWUP · Stop losing money to no-shows.`
- `font-size: 11.5px`
- `color: #737780`
- "SHOWUP" portion: `font-weight: 800`, `letter-spacing: .14em`, `text-transform: uppercase`
- Separator `·` with `7px` side padding
- Tagline "Stop losing money to no-shows." at regular weight (doesn't compete with footer text above)
- Placement hierarchy: sign-off → footer text → **brand footer** → legal line
- Legal line: `Unsubscribe · ShowUp Ltd, 1 Atelier Lane, London`

**Designer note:** The 800-weight SHOWUP stays legible at 11.5px; the tagline sits at regular weight so the line doesn't compete with the footer text above it.

---

## Content sign-off (no mock-up needed — same layout, different string)

These are all string-only swaps. No layout, spacing, or visual changes. Designer should scan and confirm the copy reads naturally.

### Platform chrome

| Surface | Page(s) | Current | New | Notes |
|---------|---------|---------|-----|-------|
| Site header — desktop logo | Landing, app shell | Astro | ShowUp | Same font-size/weight |
| Site header — mobile drawer logo | Landing (mobile) | Astro (×2) | ShowUp | Appears twice in drawer |
| Auth brand bar | `/login`, `/register` | Astro | ShowUp | |
| Site footer — logo | Landing | Astro | ShowUp | Match header treatment |
| Site footer — copyright | Landing | © 2025 Astro. | © 2025 ShowUp. | |
| Browser tab / social preview | All pages | Astro | ShowUp | `<title>` metadata |

### Landing page marketing copy

| Section | Current copy | New copy |
|---------|-------------|----------|
| Hero | "Astro protects your income…" | "ShowUp protects your income…" |
| How it works — heading | "How Astro works" | "How ShowUp works" |
| How it works — step 1 | "Astro protects your schedule" | "ShowUp protects your schedule" |
| How it works — step 3 | "Astro offers the slot…" | "ShowUp offers the slot…" |
| Features carousel | "Astro flags high-risk clients…" | "ShowUp flags high-risk clients…" |
| Pricing card | "Astro Pro" | "ShowUp Pro" |
| FAQ — answer 1 | "Astro retains the deposit…" | "ShowUp retains the deposit…" |
| FAQ — answer 4 | "Astro is month-to-month…" | "ShowUp is month-to-month…" |
| FAQ — question 5 | "…does Astro work with?" | "…does ShowUp work with?" |
| FAQ — answer 5 | "Astro integrates with…" | "ShowUp integrates with…" |
| FAQ — section subtitle | "…about Astro." | "…about ShowUp." |

### Auth flow

| Surface | Current | New |
|---------|---------|-----|
| Sign-in page prompt | "New to Astro?" | "New to ShowUp?" |

### Email template (string swaps — separate from the new footer element above)

| Location | Current | New |
|----------|---------|-----|
| HTML logo span | Astro | ShowUp |
| HTML sign-off | — Astro | — ShowUp |
| HTML footer | your Astro account | your ShowUp account |
| Plain text sign-off | — Astro | — ShowUp |
| Plain text footer | your Astro account | your ShowUp account |

---

## Not changing

These items were explicitly scoped out — **do not design for these:**

- Brand mark (navy square + `dashboard_customize` icon)
- `--al-*` CSS design system token names
- `proj-astro` directory / repo name
- Vercel deployment URLs
- Stitch design system folder name
- Routes, DB schema, business logic
- In-app tooltips (P3, ships after main PR — no design review needed)
- Internal docs (P4, no user-facing impact)
