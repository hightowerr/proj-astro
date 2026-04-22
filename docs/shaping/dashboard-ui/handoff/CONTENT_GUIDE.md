# Content Guide: Dashboard UI

This application does not currently use an external CMS (like Sanity) for dashboard content. All data is dynamically pulled from the PostgreSQL database or maintained in specific "static" sections within the codebase.

## 1. Content Management Strategy
Most "content" on the dashboard is operational data (KPI counts, search results, log items) derived directly from your studio's database.

### Dynamic Content
*   **KPI Metrics:** Values like `High-Risk Customers` and `Deposits at Risk` are calculated from live appointments and payment data.
*   **Search Results:** Pulled directly from the `customers` and `appointments` tables.
*   **Daily Log:** A merged feed of recent `appointments`, `appointment_events`, and `message_log` entries.

## 2. Source-Level Content (For Editors/Developers)
Sections that feel like "marketing" or "onboarding" copy are located in specific React components.

| Section | Location | Key Editable Fields |
|---------|----------|---------------------|
| **Home Hub Hero** | `src/components/dashboard/atelier-dashboard.tsx` | `h1` Welcome text, `p` Hero description |
| **Studio Essentials** | `src/components/dashboard/atelier-dashboard.tsx` | `const essentials` (labels, descriptions, icons) |
| **KPI Labels** | `src/components/dashboard/summary-cards.tsx` | Card headers (e.g., "Total Upcoming (30d)") |
| **Onboarding Cards** | `src/components/dashboard/atelier-dashboard.tsx` | Title and descriptions for "Sync Google Calendar" |

## 3. Workflow: Updating "Static" Sections
1.  Navigate to the file specified in the table above.
2.  Update the text strings directly within the TSX/TS file.
3.  Changes will reflect immediately in development via Fast Refresh.

## 4. Visual Hierarchy References
Refer to the **The Modern Atelier** philosophy in `docs/design-system/DESIGN.md` before changing copy. Ensure that text lengths are optimized for the "Editorial Authority" design principle (Display-lg for headlines, clear and concise body copy).
