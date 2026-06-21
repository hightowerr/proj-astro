# Spike — Class Name Collisions

**Spec:** #04 (AL Utility Classes)  
**Date:** 2026-06-20  
**Question:** Do any of the 8 proposed utility class names collide with existing CSS or Tailwind utilities?

---

## Findings

**No collisions detected.** All 8 class names are safe to use.

| Class | Status | Notes |
|-------|--------|-------|
| `.al-page` | ✅ Safe | No existing definition anywhere |
| `.al-page-title` | ✅ Safe | No existing definition anywhere |
| `.al-section-title` | ✅ Safe | No existing definition anywhere |
| `.al-eyebrow` | ✅ Safe | Identical definition exists in `docs/design-system/tokens/typography.css:60-68` — not in production |
| `.al-lede` | ✅ Safe | No existing definition anywhere |
| `.al-card` | ✅ Safe | Identical definition exists in `docs/design-system/tokens/base.css:48-53` — not in production |
| `.al-num` | ✅ Safe | Identical definition exists in `docs/design-system/tokens/typography.css:71-72` — not in production |
| `.al-mono` | ✅ Safe | Identical definition exists in `docs/design-system/tokens/typography.css:74-77` — not in production |

### Tailwind v4 Check

The `@theme inline` block in `globals.css` (lines 3–207) defines CSS custom properties and animation keyframes only. It does **not** generate any utilities that would collide with `al-*` class names.

### Design System Doc Alignment

4 of the 8 classes are already defined in design system docs with **identical** definitions to the spec:
- `.al-eyebrow` — same properties, same values
- `.al-card` — same properties, same values
- `.al-num` — same properties, same values
- `.al-mono` — same properties, same values

The remaining 4 (`.al-page`, `.al-page-title`, `.al-section-title`, `.al-lede`) are new — defined only in the spec.

### Component Usage

None of the 8 class names appear in any `.tsx` files in `src/`. Zero migration risk.
