# Functional Bug Audit — Dashboard UI

This report identifies functional, logical, and accessibility bugs in the dashboard implementation relative to the requirements in Bets 1–4. Visual-only issues (spacing, exact colors, typography) are excluded unless they cause functional or accessibility blockers.

## Critical Functional & Logical Bugs

### 1. Currency-Blind Monthly Stats (Bet 1/4)
*   **File:** `src/lib/queries/dashboard.ts` -> `getMonthlyFinancialStats()`
*   **Bug:** The query sums `payments.amountCents` across all currencies into a single `total` scalar.
*   **Impact:** A shop with £500 and $500 in monthly revenue will report "$1,000" (or whatever the hardcoded default is), which is factually incorrect.
*   **Requirement Reference:** Bet 1 R1 (General principle of currency-aware financial data).

### 2. Hardcoded USD in UI (Bet 1)
*   **File:** `src/components/dashboard/summary-cards.tsx`
*   **Bug:** The "This Month" card hardcodes `"USD"` in two places:
    ```tsx
    {formatCurrency(monthlyStats.depositsRetained, "USD")}
    {formatCurrency(monthlyStats.refundsIssued, "USD")}
    ```
*   **Impact:** Even if the underlying data were corrected, the UI forces a USD symbol onto non-USD amounts.

### 3. Inverted High-Risk Highlight Logic
*   **File:** `src/components/dashboard/attention-required-table.tsx`
*   **Bug:** The logic for highlighting high-risk customer avatars is inverted:
    ```tsx
    const isHighRisk = (appointment.customerScore ?? 0) >= 60;
    ```
*   **Impact:** According to the system rules (`score < 40` is risk, `score >= 80` is top), a "neutral" or "top" customer is highlighted in red, while actual high-risk customers (< 40) are shown with a standard primary color.

### 4. High-Risk Customer Sublabel Mismatch (Bet 2)
*   **File:** `src/components/dashboard/summary-cards.tsx`
*   **Bug:** The High-Risk Customers card displays `Require confirmation` instead of the required `In selected window`.
*   **Requirement Reference:** Bet 2 R3, A5.3.

---

## Accessibility & UI Blockers

### 5. Invisible Interactive Elements (Dark on Light)
*   **Files:** `src/components/dashboard/action-buttons.tsx`, `src/components/dashboard/contact-popover.tsx`
*   **Bug:** These components hardcode dark-theme colors (e.g., `text-white`, `bg-white/5`, `bg-bg-dark`) while being rendered inside the light-themed `AttentionRequiredTable` and dashboard surface.
*   **Impact:** Buttons like "View", "Contact", and "Remind" have white text on a white/near-white background, making them invisible and functionally unusable for most users.

### 6. Missing Search ARIA Attributes (Bet 3)
*   **File:** `src/components/dashboard/dashboard-search.tsx`
*   **Bug:** The search control is missing standard WAI-ARIA combobox attributes:
    *   No `role="combobox"` on the input container.
    *   No `aria-expanded`, `aria-controls`, or `aria-haspopup` on the input.
    *   No `aria-live` region or `aria-relevant` to announce when results appear/disappear.
*   **Impact:** Screen reader users will not know that a list of results has appeared or how many results are available.

---

## Minor/Internal Issues

### 7. Redundant/Misleading Query (Bet 2)
*   **File:** `src/lib/queries/dashboard.ts`
*   **Issue:** `getHighRiskCount()` still exists and calculates an appointment-based count, even though `getDashboardData()` now correctly derives a customer-based `highRiskCustomerCount`. 
*   **Impact:** Potential for future developers to use the wrong count function, re-introducing the deduplication bug.

### 8. Hardcoded Locale in Currency Formatter
*   **File:** `src/components/dashboard/summary-cards.tsx`
*   **Issue:** `formatCurrency` is hardcoded to `en-US`. 
*   **Impact:** While currency symbols might be correct, number separators (commas vs. dots) won't adapt to the user's or shop's locale.
