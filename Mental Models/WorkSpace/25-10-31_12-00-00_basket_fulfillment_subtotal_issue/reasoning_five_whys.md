# Reasoning: Five Whys Analysis

## Problem Statement for Analysis

**Primary Problem:** "Basket subtotals for the same items differ between the native app and web platforms (mobile/desktop)."

**Related Problems:**
*   Desktop users cannot specify their preferred fulfillment method, leading to inaccurate subtotal calculations and proposition eligibility.
*   Argos Plus eligibility is incorrectly calculated, including ineligible items (SDF, Tu, out-of-stock) and misleading users about free delivery qualification.
*   Argos Pay credit options are inaccurate due to incorrect basket subtotals and inclusion of ineligible items (digital downloads, gift cards).

## Five Whys Iteration

**Starting Problem:** Basket subtotals for the same items differ between the native app and web platforms (mobile/desktop).

*   **Why 1:** Why do basket subtotals differ between the native app and web platforms?
    *   **Answer:** The native app makes an additional, separate call to the SPE system, while the web platforms only use the main basket API which then calls SPE. This suggests the app might be getting different or more refined information from SPE, or processing it differently.

*   **Why 2:** Why does the native app make an additional, separate call to the SPE system, and why don't the web platforms do the same or receive the same information via the main basket API?
    *   **Answer (Hypothesis):** The app team likely implemented specific logic or integration with SPE to obtain more accurate or real-time fulfillment-specific pricing/eligibility, which was not replicated or integrated into the main basket API used by web platforms. This could be due to historical reasons, different development cycles, or specific requirements for the app. The main basket API might be designed to be more generic and not account for fulfillment-specific nuances.

*   **Why 3:** Why was this specific logic/integration for fulfillment-specific pricing/eligibility not unified or replicated across all platforms via the main basket API?
    *   **Answer (Hypothesis):** This points to a lack of a unified architectural strategy for basket and pricing services across all platforms. It might also stem from independent team development, where the app team solved a specific problem for their platform without a broader integration strategy, or the main basket API was not designed with the flexibility to incorporate such granular, fulfillment-dependent calculations. This leads to the main basket API sending "all items in the trolley" to SPE without considering fulfillment type.

*   **Why 4:** Why is there a lack of a unified architectural strategy or flexible main basket API to handle fulfillment-specific calculations consistently across platforms?
    *   **Answer (Hypothesis):** This suggests a potential gap in system design, ownership, or communication between teams responsible for different platforms and APIs. It indicates that the "basket API" and "SPE" integration might not fully encapsulate all business rules, especially those dependent on user intent (like fulfillment type), or that these rules evolved differently across platforms.

*   **Why 5:** Why is there a gap in system design, ownership, or communication regarding unified basket and pricing logic?
    *   **Answer (Hypothesis):** This could be due to organizational silos, rapid feature development prioritizing speed over consistency, or insufficient upfront architectural planning for a multi-platform ecosystem. The root cause here might be a process or organizational issue rather than purely technical.

## Validation (Simulated)

As an AI, direct validation is not possible. However, the hypotheses generated suggest the following areas for real-world validation:
*   Code review of the native app's SPE integration versus the main basket API's SPE integration.
*   Interviews with product, engineering (frontend, backend, API, SPE), and UX teams involved in the basket functionality.
*   Analysis of API request/response logs and data flow diagrams.

## Prioritized Root Cause

The most impactful root cause appears to be a lack of a unified architectural strategy and consistent implementation of fulfillment-dependent business logic across all platforms, likely exacerbated by organizational factors such as independent team development and potential communication gaps.

## Potential Countermeasures

Based on this Five Whys analysis, potential countermeasures include:
*   **Unify API Logic:** Refactor the main basket API to incorporate and consistently apply all fulfillment-specific logic, potentially by integrating the app's more granular SPE interaction into the main API.
*   **Centralize Business Rules:** Establish a single source of truth for all business rules related to item eligibility (Argos Plus, Argos Pay, fulfillment exclusions) and ensure these are consistently applied by the basket API before any calls to external systems like SPE.
*   **Enhance Desktop UI:** Implement a clear and intuitive user interface element on the desktop platform to allow users to explicitly select their preferred fulfillment type (collection/delivery).
*   **Improve Cross-Team Collaboration & Ownership:** Foster better communication and establish clear ownership for the end-to-end basket and pricing logic across all platform and API development teams to ensure consistent implementation and future evolution.
