# Spike C: Tailwind Theme Mapping Requirements

**Date:** 2026-06-19
**Status:** Complete
**Question:** Do the ~48 new AL tokens from Spec #03 need `@theme inline` entries to work as Tailwind utility classes?

---

## 1. How Tailwind 4 `@theme inline` Works

In Tailwind CSS 4, variables declared in `@theme inline` are registered with Tailwind's theme engine. The **variable name prefix** determines which utility namespace the variable maps to:

| Prefix in `@theme inline` | Tailwind utility | Example |
|---|---|---|
| `--color-*` | `bg-*`, `text-*`, `border-*` | `--color-al-primary` -> `bg-al-primary` |
| `--font-*` | `font-*` | `--font-display` -> `font-display` |
| `--shadow-*` | `shadow-*` | `--shadow-md` -> `shadow-md` |
| `--radius-*` | `rounded-*` | `--radius-lg` -> `rounded-lg` |
| `--spacing-*` | `p-*`, `m-*`, `gap-*`, `w-*`, `h-*` | `--spacing-editorial` -> `p-editorial` |
| `--duration-*` | `duration-*` | `--duration-fast` -> `duration-fast` |
| `--animate-*` | `animate-*` | `--animate-shimmer` -> `animate-shimmer` |
| `--font-size-*` | `text-*` (size) | No examples currently |
| `--font-weight-*` | `font-*` (weight) | No examples currently |
| `--letter-spacing-*` | `tracking-*` | No examples currently |

Variables in `:root` (outside `@theme`) are **not** registered with Tailwind. They are only accessible via the `[var()]` arbitrary-value escape hatch (e.g., `text-[length:var(--al-display-md)]`).

---

## 2. Current Codebase Usage Patterns

### Color tokens: Tailwind utility classes (dominant pattern)

The vast majority of AL color usage is through Tailwind utility classes:

```
text-al-primary              (100+ occurrences)
text-al-on-surface-variant   (80+ occurrences)
bg-al-surface-container      (30+ occurrences)
border-al-outline-variant    (20+ occurrences)
```

This works because `globals.css` lines 171-203 define `--color-al-*` aliases in `@theme inline`, which enables `bg-al-*` / `text-al-*` / `border-al-*` classes.

### Non-color AL tokens: inline `style={}` or `[var()]` escape hatch (universal pattern)

Every non-color AL token reference found in the codebase uses one of two approaches:

**Approach A -- Inline React `style` prop:**
```tsx
// atelier-dashboard.tsx
style={{ fontSize: 'var(--al-display-lg)', letterSpacing: '-0.02em' }}

// appointments/page.tsx
style={{ fontFamily: "var(--al-font)", padding: "40px 48px" }}
```

**Approach B -- Tailwind `[var()]` arbitrary value syntax:**
```tsx
// onboarding-flow.tsx
rounded-[var(--al-radius-2xl)]

// atelier-dashboard.tsx, business-type-card.tsx, etc.
shadow-[var(--al-shadow-float)]
```

**Zero instances found** of AL non-color tokens used as native Tailwind utilities (e.g., no `text-al-display-md`, no `p-al-sp-4`, no `tracking-al-track-pill`, no `duration-al-dur-fast`).

### Existing `@theme inline` non-color mappings already work

The `@theme inline` block already maps some non-AL non-color tokens that ARE consumed as utilities:

- `--shadow-xs` through `--shadow-xl` -> `shadow-xs`, `shadow-sm`, etc. (used in components as `shadow-sm`, `shadow-xl`)
- `--duration-instant` through `--duration-slower` -> `duration-fast`, `duration-200`, etc. (though components mostly use Tailwind's built-in `duration-200`/`duration-300` instead)
- `--radius-*` -> `rounded-sm`, `rounded-lg`, etc.
- `--spacing-editorial` -> `p-editorial` (defined but **not used** in any component)

---

## 3. Assessment: Do Spec #03 Tokens Need `@theme inline` Entries?

### Token categories and verdict:

| Category | Token examples | `@theme inline` needed? | Rationale |
|---|---|---|---|
| **Typography scale** (15) | `--al-display-md`, `--al-body-sm` | **No** | Font-size tokens don't map to Tailwind's `text-*` utility via `--font-size-*` prefix today. The project uses inline `style={{ fontSize: 'var(--al-display-lg)' }}` for these. To register them, you'd need `--font-size-al-display-md: var(--al-display-md)` which creates a `text-al-display-md` class -- but this pattern has zero adoption in the codebase. |
| **Weight scale** (6) | `--al-w-light`, `--al-w-bold` | **No** | Would need `--font-weight-al-w-bold: var(--al-w-bold)` -> `font-al-w-bold`. But Tailwind's built-in `font-light`, `font-bold`, `font-extrabold` are already used everywhere. Adding a parallel system creates confusion. |
| **Tracking** (3) | `--al-track-pill`, `--al-track-display` | **No** | Would need `--letter-spacing-al-track-pill: var(--al-track-pill)` -> `tracking-al-track-pill`. But the codebase uses Tailwind's built-in `tracking-widest`, `tracking-wide`, `tracking-tight`, or hardcoded `tracking-[0.2em]`. Zero existing consumption via AL tracking tokens. |
| **Spacing** (12) | `--al-sp-1` through `--al-sp-24` | **No** | Would need `--spacing-al-sp-4: var(--al-sp-4)` -> `p-al-sp-4`. But all spacing currently uses Tailwind's built-in numeric scale (`p-4`, `gap-6`, `m-8`). Switching to `p-al-sp-4` offers no advantage and breaks muscle memory. |
| **Layout** (3) | `--al-main-pad-x`, `--al-sidebar-w` | **No** | These are consumed via `[var()]` or inline styles. Semantic names like `w-[var(--al-sidebar-w)]` are clearer than inventing a Tailwind alias. |
| **Motion** (4) | `--al-dur-instant` through `--al-dur-slow` | **No** | Would need `--duration-al-dur-fast: var(--al-dur-fast)` -> `duration-al-dur-fast`. But the existing `--duration-fast` in `@theme inline` already provides `duration-fast`, and components mostly use Tailwind built-ins (`duration-200`, `duration-300`). Adding parallel AL motion utilities creates naming collision risk. |
| **Effects** (5) | `--al-shadow-menu`, `--al-hairline-rest` | **No** | Shadows are already consumed via `shadow-[var(--al-shadow-float)]`. The hairline tokens are border colors, not shadows. The `[var()]` pattern is established and sufficient. |

---

## 4. Recommendation

**Do NOT add `@theme inline` entries for the Spec #03 tokens.**

Rationale:

1. **Zero existing demand.** No component in the codebase uses non-color AL tokens as native Tailwind utilities. Every usage is `style={{ ... var(--al-*) }}` or `[var(--al-*)]`.

2. **Namespace collision risk.** The project already has `--duration-*` and `--shadow-*` entries in `@theme inline` (Deep Ledger era). Adding `--duration-al-dur-*` or `--shadow-al-shadow-*` creates a confusing parallel where `duration-fast` and `duration-al-dur-fast` both exist.

3. **No ergonomic gain.** For colors, the Tailwind utility pattern is a clear win: `text-al-primary` is shorter and more composable than `text-[var(--al-primary)]`. But for non-color tokens the delta is negligible: `text-[length:var(--al-display-md)]` vs hypothetical `text-al-display-md` -- and the arbitrary-value syntax is already the established pattern.

4. **Tailwind 4 type prefixes add complexity.** Font-size mappings require `--font-size-*`, weight requires `--font-weight-*`, tracking requires `--letter-spacing-*`. Each category needs its own correctly-prefixed alias. This is boilerplate with no demonstrated consumer.

5. **`:root` + `[var()]` is the intended pattern.** The design system spec itself (Spec #03) prescribes adding tokens to `:root`. The later specs (#09-#19) that will consume these tokens can reference them via `var()` in inline styles or `[var()]` in Tailwind class strings.

### If the pattern ever changes

If a future spec introduces heavy reuse of non-color AL tokens as Tailwind classes (e.g., a component library using `text-al-display-md` 50+ times), then creating `--font-size-al-*` mappings in `@theme inline` would make sense. But that decision should be driven by actual consumption, not speculative infrastructure.

---

## 5. Impact on Spec #03 Implementation

Spec #03 should proceed as written:

- Add ~48 tokens to the `:root` block in `globals.css`
- Place them after the existing AL token section (after line 389)
- Organize by category (typography, weight, tracking, spacing, layout, motion, effects)
- **Do not touch the `@theme inline` block**

---

*This resolves Spike C from the Wave 1 shape document.*
