# Reasoning File 2: First-Principle Thinking

This document applies the mental model "First-Principle Thinking" to the problem of establishing a single source of truth for promotional data.

## Analysis using Thinking Steps

### 1. Identify the Problem/Goal

*   **Stated Problem:** We need to fix data inconsistencies between SBE and PDP to run an A/B test.
*   **First-Principle Goal:** We must display accurate, consistent, and reliable promotional information in the shopping basket to improve user experience and increase conversion.

### 2. Deconstruct the Problem to its Fundamentals

Let's break this down by asking "Why?" until we reach foundational truths:

*   **Q: Why do we need promo data in the basket?**
    *   A: To show users the value of their offers, which encourages them to complete the purchase.
*   **Q: What is the absolute minimum information the basket *must* have to function?**
    *   A: Product/offer identifiers, a description (the copy), the price/discount, any conditions, validity dates, and, as we discovered, a flag like `is_coupon_eligible`.
*   **Q: Where does this information truly originate?**
    *   A: A business user in a department like Marketing or Merchandising creates the promotion.
*   **Q: What system do they use or *should* they use?**
    *   A: The organization has strategically decided that **DPMS** is the designated single source of truth for this information.

This deconstruction reveals a fundamental truth: SBE and PDP are irrelevant intermediaries. They are not the origin of the data. The true path is from the business user to DPMS.

### 3. Challenge Every Assumption

*   **Assumption:** "We must fix the SBE data feed."
    *   **Challenge (from First Principles):** Why should we invest any engineering effort into a legacy system (SBE) that is not the strategic source of truth? This is like patching a leaky pipe when you have a brand new one ready to install. It adds to technical debt and delays the correct long-term solution.

*   **Assumption:** "We need to choose between SBE and PDP."
    *   **Challenge (from First Principles):** This is a false dichotomy. The real choice is between perpetuating a broken, complex legacy system vs. aligning with the strategic future (DPMS). The existence of two conflicting sources is a symptom of the problem, not the set of solutions.

### 4. Reconstruct from the Ground Up

A solution built from first principles ignores the current, messy implementation and focuses on the most direct path to the goal:

1.  The basket needs promotional data.
2.  The single, fundamental source of that data is DPMS.
3.  **Conclusion:** The basket must get its data directly from DPMS.

This leads to a clear, logical action plan:

*   The basket development team should treat connecting to DPMS as the primary task.
*   Any data fields required by the basket that are not currently exposed by DPMS (like `is_coupon_eligible`) should be defined as a requirement **for the DPMS team**. The problem is reframed from "SBE is broken" to "DPMS needs to fulfill its role as the source of truth."
*   The legacy systems, SBE and PDP, are now considered irrelevant for this new feature development.

### 5. Optimize the New Solution

The most effective way to implement this is not a massive, risky "big bang" migration. Instead:

*   **Strangler Pattern:** Build a small, dedicated service (an "adapter" or "anti-corruption layer") that is responsible for fetching data from DPMS for the basket. This isolates the new logic.
*   **A/B Test the Pipeline:** The next A/B test should not be about promo copy. It should be a technical test: `Group A gets data from the old SBE/PDP mess` vs. `Group B gets data from the new DPMS pipeline`. This allows the team to validate the new data source with a small percentage of traffic, proving its reliability and performance under real-world load before making it the default for 100% of users.
