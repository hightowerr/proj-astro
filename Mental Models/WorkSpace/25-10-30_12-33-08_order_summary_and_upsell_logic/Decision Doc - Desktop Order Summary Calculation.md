# Decision Document: Desktop Order Summary Calculation

**Date:** 2025-10-30

**Status:** DRAFT

**Author:** Yink

## 1. Problem Statement

The system cannot guarantee 100% accuracy for the order summary and dependent upsell offers (e.g., Argos Pay) on the desktop basket page. This is because the user interface presents both delivery and collection options simultaneously, without capturing the user's fulfillment intent upfront. This ambiguity leads to incorrect basket calculations, which poses a significant risk to user trust, feature correctness, and revenue-generating opportunities.

## 2. Background

This issue was identified as a critical blocker during the planning for the Argos Pay implementation. The logic for Argos Pay offers depends on an accurate basket subtotal, which is currently unreliable on the desktop platform due to its unique UI. While the mobile and app platforms have a sequential flow that solves this, the desktop experience creates a **bottleneck** that prevents the accurate flow of information. This document outlines the options to resolve this bottleneck.

## 3. Decision Required

To select a definitive technical and design approach for calculating and displaying order summary information on the desktop basket page, ensuring 100% accuracy to support the Argos Pay initiative and improve the core user experience.

## 4. Options Analysis

### Option 1: Redesign the Desktop UI to Capture Intent (Recommended)

*   **Description:** Modify the desktop user experience to guide the user to select a fulfillment preference (e.g., via radio buttons) *before* the order summary and upsell propositions are calculated and displayed.
*   **Pros:**
    *   **High Leverage:** Solves the problem at its source, simplifying all downstream logic.
    *   **Guarantees Accuracy:** Directly achieves the primary business goal of 100% accuracy.
    *   **System Simplification:** Removes the need for complex workarounds in the frontend and backend.
    *   **Consistency:** Aligns the desktop user journey more closely with the mobile experience.
*   **Cons:**
    *   Requires design and UX research resources to ensure the new interaction is intuitive.
    *   May challenge the existing design paradigm for the desktop basket.

### Option 2: Enhance the Backend API to Return All Permutations

*   **Description:** The backend API is modified to calculate and return a complex data object containing separate propositions for every possible fulfillment scenario (e.g., a `delivery` object and a `collection` object).
*   **Pros:**
    *   Decouples the backend data logic from the frontend presentation.
    *   Gives the design team flexibility in how to present the options.
*   **Cons:**
    *   **Medium Leverage:** Solves the data problem but transfers the core complexity to the UI, which must now handle the presentation of ambiguous or multiple totals.
    *   **Performance Risk:** May increase API payload size and response times.
    *   **High UI/UX Risk:** Presenting multiple, competing totals can easily lead to user confusion.

### Option 3: Build Complex Frontend-Only Logic (Not Recommended)

*   **Description:** Keep the UI and backend as is. The frontend attempts to manage the ambiguity by making multiple calls or building complex conditional logic.
*   **Pros:**
    *   Requires no immediate changes from other teams.
*   **Cons:**
    *   **Low Leverage:** This is a brittle workaround, not a solution. It increases code complexity and is prone to errors.
    *   **Fails the Goal:** It is highly unlikely to achieve the 100% accuracy requirement.
    *   **High Maintenance Cost:** Creates significant technical debt.

## 5. Recommendation

**The recommendation is to proceed with Option 1: Redesign the Desktop UI.**

This recommendation is based on the following analysis:
1.  It is the only solution that directly addresses the core **Bottleneck** in the system: the lack of user intent.
2.  Reasoning from **First Principles**, accuracy requires knowing the user's choice. This option is the simplest and most direct way to acquire that information.
3.  It is the highest **Leverage** action. A small, upfront investment in design yields a massive simplification across the entire tech stack and guarantees the primary business outcome.

## 6. Next Steps

1.  **Schedule a review session** with Design (Leo) and key engineering stakeholders to discuss and align on this recommendation.
2.  **Initiate a design spike** to explore and prototype UI solutions for capturing user fulfillment intent on the desktop basket page.
3.  **Groom technical tickets** for the implementation of the chosen UI solution and the corresponding simplified backend logic.
