# Maintenance Guide: Dashboard UI

## 1. Content Updates (Source Files)
To update the "static" content on the Home Hub or Dashboard metrics:
1.  Locate the relevant component in `src/components/dashboard/`.
2.  Modify the text strings or hardcoded arrays (e.g., `essentials` in `AtelierDashboard`).
3.  Review changes via `pnpm dev`.

## 2. Design Updates (Stitch Workflow)
The visual styling (`al-` tokens) follows **The Modern Atelier** design system. To iterate on the design while preserving the operational logic:
1.  **Capture Current State:** Take a screenshot of the existing Dashboard or Home Hub UI.
2.  **Prompt Stitch:** Use the screenshot as a reference and provide specific instructions for changes.
    *   *Example Prompt:* "Evolve the Daily Log feed to use a 'Bento Grid' layout while maintaining the same `DashboardLogItem` data structure and chronological sorting."
3.  **Preserve Structure:** Ensure the logic (props, event handlers, API integration) remains untouched during the visual refresh.
4.  **Export & Integrate:** Export the new `DESIGN.md` and design tokens from Stitch.
5.  **Validation:** Run `pnpm check` to ensure no functional regressions were introduced during the restyling.

## 3. Extension Patterns
When adding new features or views:
*   **New Dashboard Views:** Follow the `view` query parameter pattern used in `DashboardPage`. Add a new case for `view === "your-new-view"` and conditionally render a new component.
*   **New KPI Cards:** Create a new card in `SummaryCards` using the tonal layering principle from `DESIGN.md`. Ensure that the card is responsive and supports mobile viewports.
*   **New Query Logic:** Place all dashboard-related queries in `src/lib/queries/dashboard.ts`. Always use `shopId` from the authenticated session, never from client-side parameters.

## 4. Design History (Stitch Metadata)
*   **Creative North Star:** "The Modern Atelier" (Editorial experience)
*   **Initial Design Date:** 2026-04-15
*   **Token Refresh Logic:** Run `npm run update-tokens` (if script available) or manually update from exported `DESIGN.md`.
*   **Key Design tokens:** `al-surface-low`, `al-primary`, `al-on-surface-variant`, `al-shadow-float`.
