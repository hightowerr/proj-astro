# Performance Audit: Dashboard UI

## 1. Stack & Runtime
*   **Next.js 16 (App Router):** Leverages server-side rendering (SSR) for initial dashboard data fetching to reduce "Time to Interactive."
*   **React 19:** Utilizes `useTransition` for high-priority UI updates (e.g., period switching and view toggling) to prevent UI blocking.
*   **Turbopack:** Enables extremely fast local development and build times.

## 2. API & Caching
*   **Server-Side Fetching:** Queries like `getDashboardData` and `getDashboardDailyLog` are executed on the server, minimizing round-trips from the client.
*   **Parallel Execution:** `Promise.all` is used extensively in `getDashboardData` and `/api/search` to fetch multiple data sources concurrently, reducing overall latency.
*   **Tier Distribution Caching:** `getTierDistribution` uses `getCached` with a 5-minute TTL to reduce database load for static-like statistics.

## 3. Bundle Analysis (Estimates)
*   **Key Dependencies:**
    *   `lucide-react`: Treeshaked for minimal footprint.
    *   `framer-motion`: Used selectively for transitions (e.g., in `AtelierDashboard`).
    *   `drizzle-orm`: Lean query builder with minimal overhead.
    *   `Tailwind CSS 4`: JIT engine produces a highly optimized CSS bundle containing only the used tokens.

## 4. Specific Dashboard Optimizations
*   **Conditional Fetching:** The "Daily Log" and "Quick View" branches in `DashboardPage` are isolated. When the user is in "Daily Log" view, the `getDashboardData` and `getEventTypesForShop` queries are NOT executed, saving significant server and database resources.
*   **Search Debouncing:** The `DashboardSearch` component uses a 300ms debounce to prevent firing an API request for every keystroke.
*   **Phone Validation:** Phone number lookups in search are guarded with a 4-digit minimum to avoid broad, expensive query scans.

## 5. Optimization Recommendations
*   **Next.js PPR:** Consider enabling "Partial Prerendering" for the dashboard shell once fully stable to further reduce TTFB.
*   **Edge Functions:** The `/api/search` route could potentially be moved to Edge Runtime for globally distributed low-latency lookups.
*   **Lazy Loading:** Consider lazy-loading complex components like the `TierDistributionChart` if it significantly impacts initial bundle size.
