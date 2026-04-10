# Content Management Guide — Auth Redesign

This guide explains how to manage the editorial copy for the **Atelier Light** authentication flow.

## Content Management Overview
There is no external CMS (like Sanity) for authentication copy. All editorial content (headlines, body text, form titles) is managed directly within the Next.js **route files**. This ensures that copy is always co-located with the authentication logic.

## Content Structure
The `AuthShell` component consumed by each route accepts four key editorial properties:

| Prop | Purpose | Location |
|------|---------|----------|
| `heroHeadline` | Large H1 text in the media panel (desktop) | `src/app/(auth)/[route]/page.tsx` |
| `heroBody` | Explanatory body text in the media panel | `src/app/(auth)/[route]/page.tsx` |
| `formTitle` | Headline for the actual input area | `src/app/(auth)/[route]/page.tsx` |
| `formSubtitle` | Helper text below the form title | `src/app/(auth)/[route]/page.tsx` |

## Common Workflows

### Update Login Page Copy
1.  Navigate to `src/app/(auth)/login/page.tsx`.
2.  Locate the `<AuthShell>` component.
3.  Update the values for `heroHeadline`, `heroBody`, `formTitle`, or `formSubtitle`.

### Update Registration/Sign-up Copy
1.  Navigate to `src/app/(auth)/register/page.tsx`.
2.  Locate the `<AuthShell>` component.
3.  Modify the props to reflect the latest marketing messaging.

## Guardrails
- **Image Asset**: The hero image is currently a constant inside `src/components/auth/auth-shell.tsx`. Changing this image requires developer intervention to update the Unsplash URL and its associated `alt` text.
- **Brand Wordmark**: The brand name "Astro" and the desktop tagline are managed in `src/components/auth/auth-brand-bar.tsx`.

## Visual Hierarchy
For a full breakdown of the "Atelier Light" design tokens (Cream, Navy, Teal) and typography (Manrope), refer to:
- [Design System Reference](../docs/shaping/auth-redesign/auth-redesign-shaping.md#design-system-reference)
