# Performance Audit — Auth Redesign

This audit evaluates the performance impact of the **Auth Redesign** implementation.

## Core Web Vitals (Projected)
- **LCP (Largest Contentful Paint)**: The primary LCP element is the hero image. It is optimized via the Next.js `priority` prop to ensure fast loading on desktop.
- **CLS (Cumulative Layout Shift)**: The split-screen layout is stable. The `AuthBrandBar` is fixed, and the form panel is pre-sized to prevent shifting during hydration.
- **FID (First Input Delay)**: Better Auth interaction is minimal. Form input responsiveness is prioritized by avoiding heavy client-side state management.

## Bundle Analysis
- **Framework Overhead**: Next.js 16 App Router minimizes the client-side JavaScript by rendering the `AuthShell` as a server component.
- **CSS Weight**: Tailwind CSS v4's build-time engine produces a minimal utility-first bundle. No external component libraries (like shadcn/radix) are bundled with the authentication routes.
- **Dependencies**:
    - `lucide-react`: Isomorphic SVG components, minimal impact.
    - `better-auth`: Client SDK is lightweight.
- **Heaviest Dependency**: The hero image (Unsplash) is external. We rely on the Next.js Image component for lazy loading and efficient sizing on mobile.

## Implementation Impact
- **Server Components**: The layout shell and brand bar are server components. This reduces the client-side bundle size compared to the previous card-based implementation.
- **Form Panel**: No heavy hydration for form titles and subtitles (passed as strings from server components).

## Optimization Recommendations
1.  **Local Image Sourcing**: To further improve LCP, consider serving the hero image directly from the project's public directory or a first-party CDN instead of Unsplash.
2.  **Prefetching**: Next.js already prefetches routes. Ensure that the `/register` link on the login page is optimized to reduce perceived load time when navigating between auth routes.
3.  **Critical CSS**: Use the Tailwind v4 build process to ensure that only the "Atelier Light" tokens are included in the critical CSS path for authentication routes.
