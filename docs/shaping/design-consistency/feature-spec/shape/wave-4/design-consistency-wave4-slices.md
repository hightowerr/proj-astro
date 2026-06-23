# Design Consistency Wave 4 — Slices

## Slice 1: Light typography pages (specs #14, #15, #16, #17)

**Files:** dashboard/page.tsx, services/page.tsx, billing/page.tsx, calendar/page.tsx
**Effort:** Small — class swaps only, 0-5 inline styles each
**Changes:**
- #14: page title → `al-page-title`, subtitle → `al-lede`, py-10 → py-8
- #15: title 72px → `al-page-title`, breadcrumb → `al-eyebrow`, remove inline style on breadcrumb
- #16: title 56px → `al-page-title`, amber/red Tailwind → AL status tokens
- #17: remove 5 inline style props, title → `al-page-title`, breadcrumb → `al-eyebrow`
**Verify:** `pnpm check` pass, zero `style={{` in #17 calendar page

## Slice 2: Settings & detail pages (spec #19)

**Files:** availability/page.tsx, reminders/page.tsx, appointments/[id]/page.tsx,
customers/[id]/page.tsx, slot-openings/[id]/page.tsx, chat/page.tsx
**Effort:** Small — title class + padding per file
**Changes:**
- All: page title → `al-page-title`
- All: container padding px-4 py-10 → px-12 py-8
- All: `text-muted-foreground` → `text-al-on-surface-variant` where present
- reminders: section headings → `al-section-title`
**Verify:** `pnpm check` pass

## Slice 3: Profile page (spec #18)

**Files:** profile/page.tsx
**Effort:** Medium — Lucide → Material Symbols, class swaps, card radius
**Changes:**
- Remove Lucide import, add MsIcon helper or direct `<span className="material-symbols-outlined">`
- Title → `al-page-title`
- Container → `al-page` wrapper
- Cards → `al-card`
- `text-green-*` → AL status tokens
- `text-muted-foreground` → `text-al-on-surface-variant`
**Verify:** `pnpm check` pass, zero Lucide imports

## Slice 4: Booking page (spec #12)

**Files:** book/[slug]/page.tsx
**Effort:** Medium — 27 inline styles, public-facing page
**Changes:**
- Header eyebrow → `al-eyebrow`
- Title → Tailwind classes (32px is intentionally smaller than 44px for booking)
- Convert all inline styles to Tailwind classes
- Preserve intentional wider padding (64px → px-16)
- Consider extracting repeated header into local BookingHeader component
**Verify:** `pnpm check` pass, zero `style={{` props

## Slice 5: Appointments page (spec #09)

**Files:** appointments/page.tsx
**Effort:** Large — 57 inline styles, 41 hex colors
**Changes:**
- Root → `al-page`
- All eyebrows → `al-eyebrow`
- Page title → `al-page-title`
- Section titles → `al-section-title`
- Cards → `al-card`
- RECOVERY_STATUS hex colors → AL status tokens
- All inline padding/margin/gap → Tailwind spacing
- Stat numbers → `al-mono`
**Verify:** `pnpm check` pass, zero `style={{` props

## Slice 6: Customers + Conflicts pages (specs #10, #11)

**Files:** customers/page.tsx, conflicts/page.tsx
**Effort:** Medium — 13+14 inline styles between both pages
**Changes:**
- Both: root → `al-page`, title → `al-page-title`, remove fontFamily
- Both: eyebrows → `al-eyebrow`, cards → `al-card`
- Both: hex colors → AL tokens
- Both: inline padding/gap → Tailwind spacing
**Verify:** `pnpm check` pass, zero `style={{` in both

## Slice 7: Payment Policy page (spec #13)

**Files:** settings/payment-policy/page.tsx
**Effort:** Large — 35 inline styles, 17 hex, complex TiersExplainerCard
**Changes:**
- Page wrapper → `al-page`
- Content container → max-w-5xl mx-auto
- Breadcrumb → `al-eyebrow`, title → `al-page-title`
- Section titles → `al-section-title`, cards → `al-card`
- TiersExplainerCard grid → Tailwind grid classes
- Material Symbols inline styles → class + size overrides
- CTA gradient → `al-gradient-cta`
**Verify:** `pnpm check` pass, zero `style={{` props

## Slice 8: Companion components (specs #10, #11 extended scope)

**Files:** customers-editorial.tsx, conflicts-ledger.tsx
**Effort:** Very large — 88+67 inline styles, 82+54 hex colors (2157 lines total)
**Changes:**
- Same pattern as page conversions: inline styles → Tailwind + AL classes
- All hex colors → AL token references
- Material Symbols inline → class-based
**Verify:** `pnpm check` pass, zero `style={{` in both files

---

## Execution order

All slices are independent. Recommended order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8
(light wins first → build confidence → heavy work last)

## Gate

Wave 4 complete when slices 1-7 pass `pnpm check`. Slice 8 (companion components)
is stretch scope — it extends what the specs explicitly target but the specs note
these components "should be scoped in or handled as companion spec."
