# Reasoning: Problem Disaggregation Analysis

## Problem Definition

**Overarching Problem:** "Inconsistent and inaccurate basket functionality across platforms, leading to incorrect subtotals and misleading eligibility for propositions (Argos Plus, Argos Pay), primarily due to a lack of unified architectural strategy and consistent implementation of fulfillment-dependent business logic."

## Logic Tree Disaggregation

### A. Inconsistent Subtotal Calculation
    *   **A.1. App vs. Web Discrepancy**
        *   A.1.1. App's separate SPE call (potentially more granular/accurate)
        *   A.1.2. Main Basket API's generic SPE call (sends all items without fulfillment context)
    *   **A.2. Inclusion of Ineligible Items in Subtotal**
        *   A.2.1. Out-of-stock items
        *   A.2.2. Supplier Direct Fulfilment (SDF) products
        *   A.2.3. Tu clothing items
        *   A.2.4. Digital downloads/Gift cards (specifically for Argos Pay context)
    *   **A.3. Lack of Fulfillment Type Consideration**
        *   A.3.1. Desktop UI inability to select fulfillment preference
        *   A.3.2. API not receiving/processing fulfillment intent for subtotal calculation

### B. Misleading Proposition Eligibility
    *   **B.1. Argos Plus Inaccuracies**
        *   B.1.1. Incorrect £20 threshold calculation (directly impacted by A.2)
        *   B.1.2. Misleading free delivery claims to users
        *   B.1.3. Inaccurate upsell messaging (pre-login) based on false eligibility
    *   **B.2. Argos Pay Inaccuracies**
        *   B.2.1. Incorrect £5 threshold calculation (directly impacted by A.2)
        *   B.2.2. Incorrect credit options displayed (impacted by A.2, A.3)
        *   B.2.3. Eligibility issues for digital downloads/gift cards (A.2.4)

### C. Platform-Specific UX/API Differences
    *   **C.1. Desktop Web**
        *   C.1.1. No UI element for fulfillment selection
        *   C.1.2. API calls made without explicit fulfillment context
    *   **C.2. Mobile Web**
        *   C.2.1. UI for fulfillment selection exists
        *   C.2.2. API still sends all items to SPE, potentially ignoring selected fulfillment for subtotal calculation
    *   **C.3. Native App**
        *   C.3.1. UI for fulfillment selection exists
        *   C.3.2. Makes a separate, additional call to SPE (A.1.1), leading to different results
        *   C.3.3. Overall discrepancy with web platforms (A.1)

### D. Underlying System/Organizational Issues (from Five Whys)
    *   **D.1. Lack of Unified Architectural Strategy**
        *   D.1.1. Divergent implementations for app vs. web basket logic
        *   D.1.2. Main Basket API not designed with sufficient flexibility for granular fulfillment-dependent logic
    *   **D.2. Inconsistent Business Rule Application**
        *   D.2.1. Eligibility rules (e.g., for Argos Plus/Pay, item exclusions) not applied uniformly or at the correct stage within the API flow
    *   **D.3. Organizational Silos/Communication Gaps**
        *   D.3.1. Independent team development leading to disparate solutions
        *   D.3.2. Insufficient cross-platform architectural planning and alignment

## Hypotheses and Core Problem Areas

The disaggregation process strongly supports and elaborates on the root causes identified by the Five Whys. The core problem areas are hypothesized to be:

1.  **Basket API Intelligence:** The primary "Basket API" lacks the necessary intelligence or context to accurately process fulfillment-specific logic and item eligibility *before* interacting with external systems like SPE. It appears to be a pass-through mechanism rather than an intelligent orchestrator of basket rules.
2.  **Unified Platform Strategy:** There is a significant absence of a unified technical and product strategy for basket calculation and proposition eligibility across all platforms. This has led to divergent implementations (e.g., the app's separate SPE call) and inconsistencies.
3.  **User Intent Capture:** The failure to capture explicit user intent regarding fulfillment type (especially on desktop) at an early stage in the user journey and propagate it through the system is a critical flaw that leads to downstream inaccuracies.

This detailed breakdown provides a clear roadmap for identifying specific points of intervention and developing targeted solutions.
