# Dashboard UI Regression Report

**Status:** ✅ Verified  
**Date:** 2026-04-22  
**Version:** Post-Visual Overhaul

## Executive Summary
A comprehensive regression audit was performed on the Dashboard UI following significant visual and stylistic changes. All original functional requirements defined in Bets 1–4 have been verified to work as expected. Critical interactive components, including search, tab switching, and data filtering, remain fully functional and accessible.

---

## 1. Verified Functional Requirements

### Bet 1: Currency-Aware Deposits & Type Drift
- **Multi-currency Support:** `depositsAtRisk` correctly handles multiple currencies and displays "Multiple currencies" as specified when more than one currency is present in the selected window.
- **Type Drift Resolution:** `customerId` and `serviceName` are correctly selected from the database and included in all dashboard appointment interfaces, resolving previous type inconsistencies.
- **Deposit Accuracy:** COALESCE correctly handles appointments without payment records, returning 0 instead of null.

### Bet 2: High-Risk Customers KPI
- **KPI Card Definition:** The "High-Risk Appointments" card successfully transitioned to "High-Risk Customers."
- **Customer Deduplication:** The card correctly displays a count of *distinct* customers with high-risk appointments in the window (using `Set` on `customerId`), rather than the total number of appointments.
- **Visual Labels:** The "In selected window" sublabel and updated card title are correctly implemented.

### Bet 3: Dashboard Search (Quick-Find)
- **Functional Search:** Input correctly triggers a debounced (300ms) search for customers and appointments starting at 2+ characters.
- **Grouped Results:** Popover correctly segments results into "Customers" and "Appointments" with appropriate metadata (email, service, date, status).
- **Navigation:** Enter key on a selected result correctly routes to the corresponding detail page (`/app/customers/[id]` or `/app/appointments/[id]`).
- **Dismissal:** Escape key and clicks outside the search wrapper correctly close the results popover.

### Bet 4: Daily Log Tab
- **Tab Switching:** Tab switcher correctly toggles between "Quick View" and "Daily Log" using URL query parameters (`?view=log`).
- **Log Feed Sources:** Daily Log successfully merges three sources (New Bookings, Events, Message Logs) and displays them in a chronological feed.
- **Grouping:** Events are correctly grouped by day (e.g., "Apr 15, 2026") in reverse chronological order.
- **Exclusions:** `slot_recovery_offer` and specific payment events are correctly excluded from the feed.

---

## 2. Interactive & Event Handlers

| Component | Interaction | Behavior | Status |
|-----------|-------------|----------|--------|
| Search Input | Key: Arrows | Moves highlight through combined customer/appointment list | ✅ |
| Search Input | Key: Enter | Navigates to highlighted item's detail page | ✅ |
| Search Input | Key: Escape | Closes the search results popover | ✅ |
| Tab Switcher | Click | Updates URL and switches dashboard view state | ✅ |
| Period Selector | Click | Updates high-risk window and refreshes data | ✅ |
| Table Headers | Click | Toggles sort (Time, Score, Tier) with visual indicators | ✅ |
| Action Buttons | Click | Correctly passes appointment/customer IDs to sub-components | ✅ |

---

## 3. Responsive & Visual Integrity

- **Adaptive Grid:** Dashboard cards transition from 1 to 4 columns across breakpoints (`grid-cols-1 md:grid-cols-2 xl:grid-cols-4`).
- **Table Overflow:** Appointment tables use `overflow-x-auto` to allow horizontal scrolling on small screens without breaking the layout.
- **Flex Directions:** Headers and toolbars use `flex-col sm:flex-row` to stack cleanly on mobile.
- **Skeleton/Loading:** `useTransition` for period/view changes prevents UI freezing during data re-validation.

---

## 4. Accessibility Audit (Visual Compliance)

- **Semantic HTML:** Correct use of `<nav>`, `<article>`, `<section>`, and `<header>` tags.
- **ARIA Roles:** `DashboardSearch` implements a full `combobox` pattern (`role="listbox"`, `role="option"`, `aria-activedescendant`, `aria-expanded`).
- **Focus Management:** Active states in search and table sorting are clearly indicated visually.
- **Color Contrast:** Tier and status badges use high-contrast color pairings (e.g., `emerald-700` on `emerald-50`) compliant with the new design tokens.

---

## 5. Automated Verification Results

- **Unit Tests:** `src/lib/queries/__tests__/dashboard.test.ts` (34/34 passing)
- **API Tests:** `src/app/api/search/__tests__/route.test.ts` (14/14 passing)
- **Type Check:** `pnpm typecheck` (Exit code 0)
- **Lint:** `pnpm lint` (Exit code 0)

---

## Conclusion
The Dashboard UI overhaul has been completed without breaking core functionality. The implementation is robust, responsive, and maintains the technical integrity of the business logic established in the project's shaping phase.
