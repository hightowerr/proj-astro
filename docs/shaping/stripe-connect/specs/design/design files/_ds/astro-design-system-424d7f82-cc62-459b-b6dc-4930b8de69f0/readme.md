# Astro Design System — "The Modern Atelier" (Atelier Light)

A light-only, warm-neutral editorial admin design system for **Astro**, a booking-protection product for service businesses (salons, barbers, lash & nail studios). This project packages Astro's visual foundations, reusable React primitives, and a full app UI kit so design agents can produce on-brand Astro interfaces and assets.

---

## 1. Product & Company Context

**Astro protects service businesses from revenue lost to no-shows and late cancellations.** It scores customers on reliability, enforces tier-based deposit policies, and automatically re-sells cancelled slots via SMS offers — turning booking chaos into predictable income.

Core jobs the product does:
- **Reliability scoring & tiers** — every customer is scored and bucketed Top / Neutral / Risk.
- **Tier-based deposits** — deposit and cancellation policy scales with risk.
- **Slot recovery** — a cancelled slot is auto-offered to the waitlist by SMS ("Reply YES to claim").
- **Reminders** — confirmation, 24-hour nudge, recovery offer, post-visit follow-up.
- **Outcome ledger** — appointments resolve to Settled / Voided / Unresolved / Refunded with a payment trail.

Audience: independent beauty professionals and small studio owners. Marketing tagline in the live product: *"Stop losing money to no-shows."*

### One system — Atelier Light
**Atelier Light** ("The Modern Atelier") is the single, canonical Astro design system: navy ink, rationed terracotta, off-white editorial canvas, Manrope. It governs the entire application — every surface, app and marketing alike. There is no second theme. (An old dark variant once lingered in `globals.css` under `@theme inline`; it is dead and must never be used — the live `:root` is Atelier Light and the whole product is moving to it.)

### Sources audited
- **Codebase:** `proj-astro/` (Next.js app, mounted read-only). Key files:
  - `src/app/globals.css` — token source of truth (Atelier Light in `:root`).
  - `src/components/ui/{button,badge,card,input,avatar}.tsx` — shadcn primitives with `al-*` variants.
  - `src/components/app/app-nav.tsx` — the app sidebar/shell.
  - `src/app/app/{dashboard,appointments,customers}/…` and `settings/{reminders,availability,payment-policy}` — the product screens.
  - `src/app/app/appointments/appointments-table.tsx` — the canonical Atelier Light recipe (inline-styled ledger).
- **Design docs:** `proj-astro/docs/design-system/DESIGN.md` (creative north star) and `design-system.md` (token reference).
- **Audit notes** supplied with the brief ("Astro Design System Audit — Atelier Light").

> No logo image files exist in the repo (`public/` holds only default Next.js SVGs). The brand mark is rendered in code: a navy-gradient tile with the `dashboard_customize` Material Symbol + an uppercase, `.16em`-tracked **ASTRO** / shop-name wordmark. We reproduce it in CSS rather than ship a raster logo — see ICONOGRAPHY.

---

## 2. Content Fundamentals — how Astro writes

**Voice:** calm, confident, financially literate, and protective. Astro talks to a busy professional about *their money and their time*, never about software.

- **Person:** addresses the owner as **"you" / "your"** ("Stop losing money to no-shows", "your day at a glance", "your client roster"). The product refers to itself as "Astro" sparingly.
- **Tone:** plain-spoken and reassuring, not hypey. Verbs are active and outcome-led: *protect, recover, re-sell, settle, resolve, monitor*.
- **Casing:**
  - Sentence case for body, ledes, and most labels ("High-risk appointments", "Booking confirmation").
  - **UPPERCASE eyebrows** with `.2em` tracking for section kickers and column headers ("THE LEDGER", "NEEDS ATTENTION", "TIME / CUSTOMER / OUTCOME").
  - Title-ish case for nav items ("Payment Policy", "Shop Catalog").
- **Numbers are first-class.** Money (£185), counts (6/8), capacity (3/3), times (09:00) are written tersely and always render tabular/mono. Currency uses the shop's locale (£ in sample data).
- **Status language** is a fixed, short vocabulary: *Settled, Voided, Unresolved, Refunded, Disputed* (outcomes); *Paid, Pending, Unpaid, Failed* (payments); *Top, Neutral, Risk* (tiers). Reuse these exact words — don't invent synonyms.
- **Microcopy** is short and specific: "Reply YES in the next 30 min to claim it.", "At capacity — offers paused.", "Held after each booking."
- **No emoji.** Not in product UI, not in marketing. Iconography is Material Symbols only.
- **Vibe:** a boutique gallery catalog that happens to run your books — editorial, breathable, precise.

---

## 3. Visual Foundations

**North star:** *The Modern Atelier* — artisanal craft meets digital precision. Meaning is carried by **typographic hierarchy over chrome**: weight (800), uppercase eyebrows, and tabular numerals — not by color, borders, or shadow.

### Color
- **Light theme only.** Canvas `#f9f9f7`, cards `#ffffff`. The only dark surface ever allowed is an intentional navy ledger band.
- **Navy is the only ink and the only CTA** — `#001e40`, used for titles, body emphasis, active nav, and (as the `135deg → #003366` gradient) every primary button.
- **Terracotta is rationed** — the `#fdd8cb` family appears on avatars and at most one badge per viewport. Never a section background or button.
- **Muted workhorse:** `#43474f` (`on-surface-variant`) for nav labels, eyebrows, helper text, sub-labels, icon tints — the highest-frequency color after navy.
- **Status = navy / green `#0e7a55` / amber `#c97a2a` / rose `#a8294a`**, only as small tinted pills or dots — never fills or full-width banners (except the dedicated conflict banner).
- Warm "living" neutrals; avoid dead grays and pure `#000`.

### Type
- **One family: Manrope** for everything. **Mono (JetBrains Mono) for numerics only** — any number read as data gets the mono family + `tabular-nums`.
- Emphasis via **weight 800**, not size jumps or color.
- The **eyebrow motif** (10–11px / 800 / `.2em` / UPPERCASE / muted @ .55) is the most repeated element — never restyle it.
- Fixed sizes, **no fluid type**, no `clamp()`.
- *(Font note: the production app declared JetBrains Mono but never loaded it — falling back to OS mono. This system **fixes** that by loading JetBrains Mono from Google Fonts. See CAVEATS.)*

### Spacing & layout
- "Expensive" whitespace; spacing tracks a 4→136px scale, section padding leans on 16–24.
- App shell is a fixed two-column grid: `264px` sidebar + fluid main, main padded `32px 48px`, vertical rhythm via flex `gap` (24–28px).
- **Desktop-only, no breakpoints** in the source. Building a mobile screen means designing a new layout (the live app has a separate mobile nav, but the system is fixed-width).

### Surfaces, elevation & borders
- **Tonal layering, not lines.** Boundaries come from background shifts across the surface stack (`#f9f9f7 → #f4f4f2 → #eeeeec → …`), not 1px dividers.
- **One elevation:** every card/sheet uses a single soft float `0 20px 40px rgba(26,28,27,.04)`, radius **24**. **No hover-lift on cards.** Deeper/colored shadows are reserved for CTAs (`0 14px 28px rgba(0,30,64,.2)`), the brand mark, and menus.
- **Hairlines, not boxes:** dividers are `rgba(195,198,209, .20–.55)`, 1px. First table row never gets a top border. Inputs forgo the four-sided box — a soft wrap that deepens to a navy "ghost border" (@20%) on focus.
- **Radius ladder:** sheets 24 · controls 10–12 · pills/dots 9999. No sharp corners.

### Imagery & texture
- **No photography in the app.** Avatars are initials on a gradient (navy `#d5e3ff→#a7c8ff` for top tier; terracotta `#fdd8cb→#e2bfb3` for standard/risk).
- The only gradients: the navy CTA and the avatar tints. The only texture: a `135deg` **hatch fill** marking closed/unavailable days.

### Motion
- **Deliberately still.** State changes are ~`.12–.3s`, default `ease`; `.15s` is the de-facto standard. No scroll reveals, no decorative loops. One spinner (recovery) and one accordion (at-capacity banner) are the only animations.

### Hover / press / focus
- Buttons: subtle **opacity dip** on hover (no lift, no recolor).
- Nav/rows: background shift to `#eeeeec` / `#f9f9f7`; row arrow fades in.
- Filter pills: no hover; active = navy fill.
- Focus: inputs get a `0 0 0 3px rgba(0,30,64,.12)` ring. (Buttons/pills lacked focus rings in the source — this system adds an input ring globally and recommends extending it; see CAVEATS.)
- Selected radios/buffer pills: a `0 0 0 4px rgba(0,30,64,.08)` ring.

---

## 4. Iconography

- **Material Symbols Outlined, exclusively.** No emoji, no bespoke SVG glyphs, no second icon set. Loaded via Google Fonts (`opsz,wght,FILL,GRAD` axes) in `tokens/fonts.css`.
- **Fill signals state:** `FILL 0` (outline) at rest, **`FILL 1`** for active/selected nav items and emphasis. Active items also bump weight 400→500. Use the `Icon` component (`fill` prop) or the `.material-symbols-outlined` class (`data-fill="1"`).
- **Sizes** cluster at 14–30px; `opsz` tracks the pixel size for crisp rendering.
- Common glyphs in the product: `dashboard`, `calendar_month`, `group`, `warning`, `schedule`, `receipt_long`, `notifications`, `payments`, `dashboard_customize` (brand mark), `event_upcoming`, `account_balance_wallet`, `loyalty`, `bolt`, `check_circle`.
- **Brand mark:** no image asset exists — it's a navy-gradient rounded tile (`dashboard_customize`, filled) beside an uppercase `.16em`-tracked wordmark. Reproduced in `guidelines/brand-mark.card.html` and `ui_kits/app/AppShell.jsx`. *If you have an official logo file, drop it in `assets/` and we'll wire it in.*

---

## 5. Index / Manifest

**Root**
- `styles.css` — the single entry stylesheet (import-only). Consumers link this.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `base.css`.
- `readme.md` — this guide.
- `SKILL.md` — Agent-Skills-compatible entry point.

**Tokens** live under `:root` as `--al-*` (Material-3 role names) plus an ergonomic semantic alias layer (`--bg`, `--ink`, `--ink-muted`, `--hairline`, `--surface-card`…).

**Components** (`window.AstroDesignSystem_424d7f`)
- `components/core/` — **Icon**, **Button**, **Badge**, **Avatar**
- `components/forms/` — **Field**, **Switch**, **FilterPills**
- `components/data-display/` — **StatusPill**, **SectionHeader**, **Sheet**

**UI kit**
- `ui_kits/app/` — the Astro studio-management app (Dashboard, Appointments, Customers, Reminders, Conflicts) — interactive `index.html` + screen JSX. See its `README.md`.

**Foundation cards** (`guidelines/*.card.html`) populate the Design System tab under Colors, Type, Spacing, and Brand.

---

## CAVEATS
- **Mono font fixed, not faithful:** the live app never actually loaded JetBrains Mono (fell back to OS mono). This system loads it intentionally. If you'd rather match production's accidental fallback or the marketing site's Fira Code, tell me.
- **Fonts via Google Fonts `@import`** (Manrope, JetBrains Mono, Material Symbols) rather than self-hosted `@font-face`, so the compiler reports 0 webfonts even though they load. If you want self-hosted binaries, share the licensed font files.
- **No real logo asset** — the brand mark is reproduced in code. Send an official logo to replace it.
- **Desktop-only:** no responsive/mobile layouts (matches the source).
