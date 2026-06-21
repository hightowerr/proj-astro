# Shape — AL Utility Classes (Spec #04)

**Wave:** 3  
**Appetite:** Now  
**Status:** Complete — Shape A confirmed, sliced, plans written  

---

## 1. Problem

Pages across the app repeat the same styling patterns inline — eyebrows, page titles, section titles, card containers, lede text, tabular numerics — because no shared utility classes exist in production CSS.

The design system docs (`docs/design-system/tokens/base.css`, `typography.css`) define `.al-eyebrow`, `.al-card`, `.al-num`, and `.al-mono`, but these were **never added to `globals.css`**. Without them, every page re-invents the same patterns with slightly different values, causing visual drift.

### Scale of the problem

| Pattern | Files affected | Drift risk |
|---------|---------------|------------|
| Eyebrow (uppercase + small + tracking) | ~46 | High — values vary (10px vs 11px, 0.18em vs 0.2em) |
| Page title (large display font) | ~38 | Medium — sizes cluster but aren't canonical |
| Card container (surface + shadow + radius) | ~37 | Medium — radius varies (lg vs 3xl) |
| Full-page wrapper (min-h-screen + bg + padding) | ~18 | Low — mostly consistent |
| Mono/tabular numerics | ~13 | Low — pattern is simple |

### What this spec does NOT do

This spec **only adds utility classes to `globals.css`**. It does not migrate any components to use them. Migration is future work — the classes must exist first.

---

## 2. Dependencies

| Dependency | Status | Notes |
|-----------|--------|-------|
| Spec #02 (Base font rules) | ✅ Implemented | Wave 2 Slice 1 |
| Spec #03 (Missing AL tokens) | ✅ Implemented | Wave 1 Slice 1 (49 tokens added) |
| `--al-track-eyebrow` (0.2em) | ❌ Missing | Confirmed absent from globals.css `:root`. Must add. |
| `--al-radius-3xl` (24px) | ❌ Missing | Confirmed absent from globals.css `:root`. Must add. |
| `--al-display-lg` (3.5rem) | ❌ Missing | Not needed by spec #04 but tracked in current-issues.md. Add opportunistically. |
| All other referenced tokens | ✅ Verified | 16 tokens confirmed in globals.css `:root` |

---

## 3. Architecture Fit

**From `architecture-context.md`:**
- "Design tokens: CSS custom properties in `globals.css` — design system is code-managed" → ✅ Aligned
- Styling: "Tailwind CSS 4.1.18 + CSS custom properties — Atelier Light design system tokens" → ✅ Aligned

**From `code-standards.md`:**
- "Use CSS custom property tokens defined in `globals.css`" → ✅ This spec creates reusable classes from those tokens
- "Maintain the border radius scale: `rounded-3xl` for cards/sheets" → ✅ `.al-card` uses `--al-radius-3xl` (24px)

**Conflicts:** None identified. This is purely additive — no existing code changes.

**From `ui-context.md` Brand Non-Negotiables:**
- #5: "Eyebrows are 10–11px, weight 800, `.2em` tracking, UPPERCASE, `#43474f` @ ~.55 opacity" → ✅ `.al-eyebrow` matches exactly
- #6: "One elevation — cards use the single soft float" → ✅ `.al-card` uses `--al-shadow-float`
- #4: "Every data number is tabular" → ✅ `.al-num` and `.al-mono` enforce this

---

## 4. Shapes

### Shape A — Exact Spec Drop-in

Add the 8 utility classes exactly as defined in spec #04 to the end of the Atelier Light Utilities section in `globals.css`. Add any missing tokens first.

**Pros:** Minimal scope, zero risk, matches spec exactly  
**Cons:** None — this is the spec  

**Classes added (8):**
1. `.al-page` — Standard app page wrapper
2. `.al-page-title` — Page title (44px / 800)
3. `.al-section-title` — Section title (24px / 800)
4. `.al-eyebrow` — Signature eyebrow motif
5. `.al-lede` — Body lede / description text
6. `.al-card` — Card container with single elevation
7. `.al-num` — Tabular numerics utility
8. `.al-mono` — Monospace numerics (time, money, counts)

### Shape B — Drop-in + Design System Doc Update

Same as Shape A, plus update `docs/design-system/tokens/base.css` to include the full set of 8 classes (it currently only has 4: `al-eyebrow`, `al-card`, `al-num`, `al-mono`).

**Pros:** Keeps docs in sync with production  
**Cons:** Slightly more scope; docs may drift again  

### Shape C — Drop-in + Canonical Page Structure Comment

Same as Shape A, plus add a CSS comment block above the utilities documenting the canonical page structure (the JSX snippet from the spec) so developers see the pattern when editing globals.css.

**Pros:** Self-documenting; pattern is visible at point of use  
**Cons:** Comments can go stale  

---

## 5. Technical Unknowns (Spikes)

| # | Unknown | Risk | Spike |
|---|---------|------|-------|
| 1 | Do `--al-track-eyebrow` and `--al-radius-3xl` exist in production `globals.css`? | Blocks implementation | Grep globals.css for exact token definitions |
| 2 | Do any of the 8 class names collide with existing CSS or Tailwind utilities? | Could cause style conflicts | Search all CSS and TSX files |
| 3 | What's the exact insertion point at the end of the Atelier Light Utilities section? | Need precise line number | Read end of utilities section |

---

## 6. Spike Findings

### Spike 1 — Token Existence ([full report](spike-token-existence.md))

**Result:** All 3 tracked tokens are **ABSENT** from production `globals.css`.

| Token | Production | Docs value | Required by spec #04? |
|-------|-----------|------------|----------------------|
| `--al-track-eyebrow` | ❌ Missing | `0.2em` | Yes — `.al-eyebrow` |
| `--al-radius-3xl` | ❌ Missing | `24px` | Yes — `.al-card` |
| `--al-display-lg` | ❌ Missing | `3.5rem` | No — but clear current-issues.md item |

**Action:** Add `--al-track-eyebrow` and `--al-radius-3xl` as pre-req. Add `--al-display-lg` opportunistically.

### Spike 2 — Class Name Collisions ([full report](spike-class-collisions.md))

**Result: No collisions.** All 8 class names are safe.

- 4 classes are completely new: `.al-page`, `.al-page-title`, `.al-section-title`, `.al-lede`
- 4 classes exist in design system docs with **identical** definitions: `.al-eyebrow`, `.al-card`, `.al-num`, `.al-mono`
- No Tailwind `@theme inline` conflicts
- Zero `.tsx` files reference any of these class names

### Spike 3 — Insertion Point ([full report](spike-insertion-point.md))

**Result:** Atelier Light Utilities section spans lines 605–723. File ends at line 724 (blank). **Safe to append at line 724.**

---

## 7. Breadboard

### Affordance Map

The change touches exactly one file (`src/app/globals.css`) in two locations:

```
globals.css
├── :root block (lines 258–453)
│   ├── Tracking section: ADD --al-track-eyebrow: 0.2em
│   ├── Roundness section: ADD --al-radius-3xl: 24px
│   └── Type scale section: ADD --al-display-lg: 3.5rem (opportunistic)
│
└── Atelier Light Utilities (lines 605–723)
    └── APPEND after line 723:
        ├── .al-page         (page wrapper)
        ├── .al-page-title   (44px/800 display)
        ├── .al-section-title (24px/800 headline)
        ├── .al-eyebrow      (signature motif)
        ├── .al-lede         (description text)
        ├── .al-card         (single elevation)
        ├── .al-num          (tabular-nums)
        └── .al-mono         (mono + tabular-nums)
```

### Wiring

```
Token dependencies (all verified ✅ except 2 that must be added):
──────────────────────────────────────────────────────────────────

.al-page ────────→ --al-font, --al-background, --al-main-pad-y,
                   --al-main-pad-x, --al-sp-6

.al-page-title ──→ --al-display-md, --al-w-extra,
                   --al-track-display, --al-primary

.al-section-title→ --al-headline-md, --al-w-extra, --al-primary

.al-eyebrow ─────→ --al-font, --al-label-sm, --al-w-extra,
                   --al-track-eyebrow ⚠️ (MUST ADD),
                   --al-on-surface-variant

.al-lede ────────→ --al-title-sm, --al-on-surface-variant

.al-card ────────→ --al-surface-container-lowest,
                   --al-radius-3xl ⚠️ (MUST ADD),
                   --al-shadow-float

.al-num ─────────→ (no tokens — pure CSS property)

.al-mono ────────→ --al-font-mono
```

### Risk Assessment

| Dimension | Rating | Rationale |
|-----------|--------|-----------|
| Speed | ✅ Fast | Single file, ~50 lines of CSS, no component changes |
| Risk | ✅ Minimal | Purely additive — no existing code touched. Classes don't exist yet so nothing can break. |
| Simplicity | ✅ Simple | Copy spec CSS into globals.css. No abstraction, no tooling, no build changes. |

---

## 8. Recommendation

**Shape A (Exact Spec Drop-in)** is the clear winner.

- All spikes resolved with zero blockers
- Purely additive change to one file
- Token pre-reqs are 2 one-line additions
- No collisions, no migration, no risk
- Shapes B and C add marginal value for extra scope — defer to separate work

### Pre-req checklist
1. Add `--al-track-eyebrow: 0.2em` to `:root` Tracking section
2. Add `--al-radius-3xl: 24px` to `:root` Roundness section
3. (Optional) Add `--al-display-lg: 3.5rem` to `:root` Type scale section

### Deliverable
8 utility classes appended to Atelier Light Utilities section at line 724+.
