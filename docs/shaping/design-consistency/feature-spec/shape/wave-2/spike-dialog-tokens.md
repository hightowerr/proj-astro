# Spike B: Dialog Component Verification

**Date:** 2026-06-19
**Status:** RESOLVED

## Findings

### 1. Forbidden tokens listed in Spec #06

All five forbidden Deep Ledger tokens are present in `src/components/ui/dialog.tsx`, confirmed at the following lines:

| Token | Location | Line |
|---|---|---|
| `--color-surface-raised` | `DialogContent` inline style (`background`) | 66 |
| `--color-border-default` | `DialogContent` inline style (`border`) | 67 |
| `--shadow-lg` | `DialogContent` inline style (`boxShadow`) | 68 |
| `--color-text-tertiary` | `DialogPrimitive.Close` inline style (`color`) | 77 |
| `--color-text-secondary` | `DialogDescription` inline style (`color`) | 132 |

All five are applied via React `style={{}}` objects, not via Tailwind classes.

### 2. Additional forbidden tokens

No additional forbidden tokens were found. Specifically:

- No other `--color-*` or `--shadow-*` CSS custom properties beyond the five listed above.
- No hardcoded hex values (e.g., `#ffffff`, `#1a1c1b`).
- No Tailwind `dark:` variant classes.

The component is clean aside from the five known violations.

### 3. Existing AL token usage

The component uses **zero** `--al-*` tokens. No Atelier Light tokens appear anywhere in `dialog.tsx`.

### 4. Replacement token availability

All four proposed replacement tokens are defined in `src/app/globals.css`:

| Replacement Token | Defined at line | Value |
|---|---|---|
| `--al-surface-container-lowest` | 334 | `#ffffff` |
| `--al-outline-variant` | 349 | `#c3c6d1` |
| `--al-shadow-menu` | 435 | `0px 20px 40px rgba(26, 28, 27, 0.10)` |
| `--al-on-surface-variant` | 344 | `#43474f` |

Note: `--al-on-surface-variant` serves double duty, replacing both `--color-text-tertiary` (Close button) and `--color-text-secondary` (DialogDescription). If the design intent is for the description to be lighter than the close button icon, a separate token like `--al-on-surface-subtle` may be needed -- but the spec as written uses a single token for both.

## Conclusion

The spec is accurate: exactly five forbidden Deep Ledger tokens exist in `dialog.tsx` (lines 66-68, 77, 132), all delivered through inline `style={{}}` props, and no other forbidden patterns are present. All four proposed Atelier Light replacement tokens are already defined in `globals.css`, so the migration is a straightforward 1:1 swap with no prerequisite token work. The only design consideration is whether mapping both `--color-text-tertiary` and `--color-text-secondary` to the single `--al-on-surface-variant` token is intentional, since it would make the close button and description text the same color.
