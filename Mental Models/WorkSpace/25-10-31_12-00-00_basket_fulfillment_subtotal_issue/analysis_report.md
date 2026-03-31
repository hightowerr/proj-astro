# Analysis Report: Basket Fulfillment and Subtotal Issues

## Executive Summary

The core problem is a critical lack of consistency and accuracy in the e-commerce basket functionality across different platforms (desktop, mobile web, app). This leads to incorrect subtotals and misleading eligibility for key propositions like "Argos Plus" and "Argos Pay," ultimately eroding user trust and potentially impacting revenue. 

The root cause, identified through a multi-model analysis, is a fragmented architectural strategy. The system lacks a single, intelligent API to uniformly handle fulfillment-dependent business logic. The native app uses a separate, more granular API call, while web platforms use a generic one, causing discrepancies. This is compounded by the inability to capture user fulfillment intent on desktop.

Given the critical constraint that **the desktop UI cannot be changed**, the primary recommendation is to focus on backend unification. The central "Basket API" must be enhanced to become the single source of truth. It needs to intelligently process business rules for all platforms, infer user intent on desktop where possible, and provide consistent, accurate data to all frontends. This API-first approach is the most effective path to resolving the inconsistencies without altering the desktop user interface.

## Problem Statement

Users are frustrated and lose trust in the Argos platform because inconsistent basket subtotals, misleading proposition eligibility, and a lack of control over fulfillment preferences (especially on desktop) prevent them from accurately understanding the true cost and benefits of their intended purchase across different platforms. This is caused by a fragmented system architecture where different platforms calculate basket values using different logic, leading to a confusing and untrustworthy user experience.

## Individual Model Analysis

### 1. Five Whys (Root Cause Analysis)
*   **Rationale for Selection:** This model was chosen to drill down past the surface-level symptoms (e.g., different subtotals) to uncover the foundational cause.
*   **Analysis & Findings:** The analysis traced the problem from the symptom of differing subtotals to a root cause in system design and organizational structure. The key finding was that the native app uses a separate, more granular API call to the "SPE" system, while web platforms use a more generic "Basket API." This divergence points to a lack of a unified architectural strategy and potential communication gaps between platform teams, leading to inconsistent implementations of business logic.

### 2. Problem Disaggregation (Structuring the Problem)
*   **Rationale for Selection:** This model was used to break down the complex, interconnected issues into a structured, manageable hierarchy, allowing for a clear understanding of cause-and-effect relationships.
*   **Analysis & Findings:** The problem was disaggregated into four key areas: Inconsistent Subtotal Calculation, Misleading Proposition Eligibility, Platform-Specific UX/API Differences, and Underlying System/Organizational Issues. This breakdown clearly mapped how the core API and logic inconsistencies (e.g., the app's separate SPE call, inclusion of ineligible items) directly cause the user-facing problems with proposition eligibility and platform discrepancies.

### 3. Design Thinking (User-Centric View)
*   **Rationale for Selection:** This model was applied to ensure the user's perspective remained central to the analysis, focusing on their pain points and needs.
*   **Analysis & Findings:** The analysis highlighted key user needs for accuracy, trust, control, and consistency. It defined the problem from the user's viewpoint: they cannot accurately understand the true cost and benefits of their purchase. While many brainstormed solutions involved UI changes, the core user need for accuracy and clarity remains paramount, shifting the focus to backend solutions that can deliver this within the existing UI constraints.

## Synthesis & Integrated Insights

The three models converge on a single, powerful insight: the current system architecture is the primary source of the user-facing problems. The `Five Whys` identified the *why*—a fragmented architecture. `Problem Disaggregation` laid out the *what*—a detailed map of how this fragmentation causes specific issues. `Design Thinking` clarified the *impact*—a frustrating and untrustworthy user experience.

The core issue is the "Basket API" acting as a simple pass-through rather than an intelligent orchestrator. It does not consistently apply business rules or account for user intent before fetching data. The native app team created a workaround (a separate, more intelligent API call), proving that a more granular approach is possible and necessary. The constraint of an unchangeable desktop UI makes a backend, API-first solution not just the best option, but the only viable one.

## Actionable Options & Recommendations

Given the constraint of an unchangeable desktop UI, the following recommendations are prioritized:

### Recommendation 1: Enhance the "Basket API" to be the Single Source of Truth (High Priority)
*   **Action:** Refactor the central "Basket API" to incorporate the more granular, fulfillment-aware logic currently used by the native app. This API must become the single, authoritative source for basket calculations for ALL platforms (app, mobile web, desktop).
*   **Details:**
    *   The API should receive the user's selected fulfillment type from mobile web and the app.
    *   It must centrally apply all business rules (e.g., for Argos Plus/Pay eligibility, item exclusions) *before* calling any downstream systems like SPE.
    *   This eliminates the need for the app's separate call and ensures web platforms receive the same accurate data.

### Recommendation 2: Implement Intent Inference for Desktop
*   **Action:** Since the desktop UI cannot be changed to capture user intent, the enhanced "Basket API" should attempt to infer it.
*   **Details:**
    *   **Initial Logic:** If a user's basket contains *only* delivery-only items or *only* collection-only items, the API should infer the fulfillment type and calculate the subtotal accordingly.
    *   **Mixed Basket Scenario:** If the basket contains a mix of items, the API should, by default, calculate the subtotal based on the most likely scenario (e.g., delivery) or provide data for both, if the current UI can be adapted to show it without a major change. The primary goal is to move away from a simple sum of all items.

### Recommendation 3: Improve API Response to Frontends
*   **Action:** The enhanced "Basket API" response should be made richer to provide the frontend with more context, allowing for clearer communication to the user even within the existing UI.
*   **Details:**
    *   The API should return flags for each item indicating its eligibility for Argos Plus and Argos Pay.
    *   The API response should include a clear breakdown of the subtotal calculation, which can be used for more detailed display on mobile web and potentially for customer service inquiries originating from desktop.

## References

*   [Reasoning: Five Whys Analysis](0.%20AI-brain-project/Mental%20Models/WorkSpace/25-10-31_12-00-00_basket_fulfillment_subtotal_issue/reasoning_five_whys.md)
*   [Reasoning: Problem Disaggregation Analysis](0.%20AI-brain-project/Mental%20Models/WorkSpace/25-10-31_12-00-00_basket_fulfillment_subtotal_issue/reasoning_problem_disaggregation.md)
*   [Reasoning: Design Thinking Analysis](0.%20AI-brain-project/Mental%20Models/WorkSpace/25-10-31_12-00-00_basket_fulfillment_subtotal_issue/reasoning_design_thinking.md)
