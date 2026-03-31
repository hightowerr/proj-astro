# Applying Leverage to Prioritize A/B Test Ideas

This document applies the thinking steps from the Leverage model to prioritize the A/B test ideas generated in the previous step. The goal is to identify the tweak that represents the highest-leverage opportunity.

---

### Introduction: Finding the Fulcrum

Leverage is about achieving a disproportionate output from a given input. In A/B testing, this means finding the smallest possible change that delivers the largest possible impact on the desired metric. Not all tweaks are created equal; this analysis will provide a framework for finding the one with the most leverage.

---

### Applying Leverage Thinking Steps

**1. Identify the System's Fulcrum**
*   **Analysis:** In a conversion funnel like a shopping basket, the highest-leverage points (fulcrums) are the steps that the most users interact with, or the steps where the most users drop off.
*   **Action:** Before selecting a test, analyze your basket analytics to identify:
    1.  The single UI element with the highest interaction rate (this is almost certainly the primary CTA like "Continue to Checkout").
    2.  The single biggest user drop-off point in the basket flow.

**2. Determine the Desired Outcome**
*   **Analysis:** The stated goal is to "start delivering incremental conversion wins quickly." This means the desired outcome is an increase in the number of users successfully proceeding to the next step of the checkout funnel.

**3. Assess the Levers (The A/B Test Ideas)**
*   **Analysis:** The A/B test ideas are our potential levers. We can score them based on their potential leverage (Impact vs. Effort).
*   **Prioritization Framework:**

| Test Idea | Potential Impact (Users Affected) | Effort (Complexity) | Leverage Score |
| :--- | :--- | :--- | :--- |
| **1. Clarify Primary CTA** | **High** (Affects 100% of users proceeding) | **Low** (Simple text change) | **High** |
| **2. Tweak Promo Code Field** | **Medium** (Affects only the subset of users with promo codes) | **Low** (Simple text/style change) | **Medium** |
| **3. Remove Shipping Estimator** | **Varies** (Affects users who interact with it) | **Medium** (May require logic changes) | **Low-Medium** |

**4. Assess Upside/Downside & Recommendation**
*   **Analysis:** The A/B testing process itself is the method for applying leverage with measure. The metrics and guardrails manage the upside and downside.
*   **Recommendation:** Based on the leverage analysis, **Test Idea 1: Reduce Cognitive Load on the Primary CTA** is the highest-leverage opportunity. It impacts the largest possible user segment for the lowest implementation effort.

---

### Conclusion

To maximize the chance of a quick, incremental win, the first A/B test for the next sprint should be the one with the highest leverage. The analysis points to clarifying the text of the main Call-to-Action button as the top priority.
