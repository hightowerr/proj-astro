# Re-engagement Email — Build Order

## Design reference
**Prototype:** [`Email Connect Reengagement Standalone.html`](Email%20Connect%20Reengagement%20Standalone.html)
Variants confirmed: Desktop/Light, Mobile/Light, Desktop/Dark, Mobile/Dark.

---

## Dependency Graph

```
spec 16 (implemented) ──┬──→ 01 (HTML headline)
                        ├──→ 02 (HTML body)
                        ├──→ 03 (HTML footer)
                        └──→ 04 (plaintext) ──→ depends on 01, 03 wording
```

## Phased Build Order

### Phase 1 — HTML copy (parallel)

| Spec | Title | Depends on | Change |
|------|-------|-----------|--------|
| 01 | HTML headline: outcome-anchored language | spec 16 (done) | "You started connecting your Stripe account — you're almost there." → "You began setting up deposits — finish in under 5 minutes." |
| 02 | HTML body: remove "verified" assumption | spec 16 (done) | "Once verified" → "Once set up" |
| 03 | HTML footer: remove "Stripe Connect onboarding" | spec 16 (done) | "you started Stripe Connect onboarding for your Astro account" → "you began setting up deposit collection for your Astro account" |

### Phase 2 — Plaintext mirror (sequential after Phase 1)

| Spec | Title | Depends on | Change |
|------|-------|-----------|--------|
| 04 | Plain text fallback: mirror HTML changes | 01, 03 finalised | Headline + footer + body ("Once verified" → "Once set up") in plaintext |

## Critical Path

```
spec 16 (done) → 01 (headline wording) → 04 (plaintext mirror)
                                          ↑
                              03 (footer wording) ─┘
```

**Longest chain:** 2 phases. Total: 4 string replacements in 1 file.

---

## Confirmed Design Details (from prototype)

### Color tokens

| Token | Light | Dark | Used by |
|-------|-------|------|---------|
| cWordmark | `#001e40` | `#cdddf7` | Headline, logo wordmark |
| cInk | `#1a1c1b` | `#f1f2f4` | Greeting, sign-off |
| cMuted | `#43474f` | `#a3a9b2` | Body paragraph |
| cFaint | `#737780` | `#7c828c` | Nudge, footer, brand |
| cHair | `rgba(195,198,209,.45)` | `rgba(255,255,255,.10)` | Dividers |
| cBody (card bg) | `#ffffff` | `#16191e` | Email card background |
| cPage | `#ecece8` | `#0e1013` | Page/inbox background |

### Typography

| Element | Size | Weight | Line height | Extra |
|---------|------|--------|-------------|-------|
| Logo wordmark | 13px | 800 | — | letter-spacing .16em |
| Greeting | 16px | 600 | — | — |
| Headline | 21px | 800 | 1.4 | letter-spacing -0.015em, text-wrap pretty |
| Body | 15.5px | — | 1.65 | max-width 46ch, text-wrap pretty |
| CTA button | 15.5px | 700 | — | letter-spacing .01em |
| Nudge | 13px | — | — | centered |
| Sign-off | 15px | 600 | — | — |
| Footer | 11.5px | — | 1.6 | — |
| Brand wordmark | 10px | 800 | — | letter-spacing .14em, uppercase |
| Brand tagline | 11px | — | — | — |

### CTA button

| Property | Light | Dark |
|----------|-------|------|
| Background | `var(--al-gradient-cta)` | `linear-gradient(135deg,#1f477b,#003366)` |
| Box shadow | `0 14px 28px rgba(0,30,64,.22)` | `0 12px 26px rgba(0,40,90,.5)` |
| Border radius | 12px | 12px |
| Min height | 50px | 50px |
| Padding | 0 36px | 0 36px |
| Color | #fff | #fff |

### Layout

| Breakpoint | Max width | Body padding | CTA |
|------------|-----------|-------------|-----|
| Desktop | 600px | 44px 56px | inline-flex, centered |
| Mobile | 392px | 32px 26px | full-width block |

### Pages impacted

| Page | Element | Change type |
|------|---------|------------|
| Re-engagement email (HTML) | Headline (21px, weight 800, cWordmark) | Copy only |
| Re-engagement email (HTML) | Body paragraph (15.5px, cMuted) | Copy only |
| Re-engagement email (HTML) | Footer (11.5px, cFaint) | Copy only |
| Re-engagement email (plain text) | Headline + footer + body | Copy only |

### What does NOT change
- Subject line: "You're one step away from collecting deposits"
- CTA button text: "Complete setup →"
- Nudge text: "This usually takes under 5 minutes."
- Sign-off: "— Astro"
- Brand footer: "ASTRO · Stop losing money to no-shows."
- Layout, spacing, colors, logo, responsive behavior, dark mode tokens
- Send logic, timing window, or deduplication
