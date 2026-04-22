# Editing Guide: Dashboard UI

## 1. How to Change Content
This project does not use an external CMS (like Sanity). Static content is edited directly in the source code.
*   **Hero / Essentials:** Go to `src/components/dashboard/atelier-dashboard.tsx`.
*   **KPI Labels:** Go to `src/components/dashboard/summary-cards.tsx`.
*   **Guides:** Refer to [CONTENT_GUIDE.md](./CONTENT_GUIDE.md) for more details.

## 2. How to Change Visual Design (Stitch)
The visual identity follows **The Modern Atelier** system.
1.  Capture a screenshot of the current UI.
2.  Provide the screenshot and specific change requests to **Stitch**.
    *   *Prompt Example:* "[Describe changes]. Keep the existing layout structure and data props."
3.  Export the new `DESIGN.md` and integrate the updated `al-` design tokens into your CSS.
4.  Run `pnpm format` and `pnpm check` to verify consistency.

## 3. How to Add New Dashboard Pages
Follow the existing route and component patterns:
1.  **Route Integration:** Modify `src/app/app/dashboard/page.tsx` to handle a new query parameter (e.g., `?view=my-new-view`).
2.  **Component Replication:** Use `src/components/dashboard/daily-log-feed.tsx` or `src/components/dashboard/all-appointments-table.tsx` as a template.
3.  **Data Wiring:** Define new queries in `src/lib/queries/dashboard.ts` following the pattern of `getDashboardDailyLog`.

## 4. Stitch Design Prompt History
*   **Date:** 2026-04-15
*   **Prompt:** "Create a high-end editorial atelier experience for a studio management hub. Use intentional asymmetry, tonal layering, and high-contrast typography scale (Manrope). No 1px borders; use surface shifts to create hierarchy. Spacing: 16-24px. Glassmorphism for floating UI."
*   **Result:** `docs/design-system/DESIGN.md` (Modern Atelier North Star).
