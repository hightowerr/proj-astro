# Applying Friction & Cognitive Load to Generate A/B Test Ideas

This document applies the thinking steps from the Friction and Cognitive Load models to generate a backlog of 1-3 low-design A/B tests for the basket.

---

### Introduction: Finding Low-Effort, High-Impact Tweaks

The goal is to identify small changes that can be implemented quickly within a single sprint. We will use the principles of reducing Friction (unnecessary user effort) and Cognitive Load (mental effort) to find opportunities for improvement.

---

### A/B Test Idea 1: Reduce Cognitive Load on the Primary CTA

*   **Analysis:** The Cognitive Load model emphasizes using clear signposts and leveraging conventions. A generic button like "Continue" or "Proceed" creates uncertainty because the user has to pause and think, "What happens next?" This ambiguity increases cognitive load and can cause hesitation at a critical moment.
*   **Hypothesis:** By changing the primary Call-to-Action (CTA) button text from a generic label (e.g., "Continue") to a more descriptive and specific one (e.g., "Continue to Payment"), we will reduce cognitive load and user hesitation, leading to a higher click-through rate to the next step in the funnel.
*   **Primary Metric:** Click-through rate on the main basket CTA button.
*   **Guardrail Metrics:** Overall conversion rate, time spent on the basket page.

---

### A/B Test Idea 2: Reduce Friction in Promo Code Application

*   **Analysis:** The Friction model focuses on removing extra steps and confusion. The source document noted a debate around the promotions UX, indicating this is a known friction point. A simple, low-design tweak is to improve the clarity (affordance) of the existing input field.
*   **Hypothesis:** By making the promo code input field more prominent (e.g., using a bolder border or background color) and changing its button text from a generic "Apply" to a more explicit "Apply Code," we will reduce the friction and confusion associated with applying a discount, leading to a higher rate of successful promo code applications.
*   **Primary Metric:** Rate of successful promo code applications (defined as `(promo successes) / (clicks on promo field)`).
*   **Guardrail Metrics:** Overall conversion rate, Average Order Value (AOV).

---

### A/B Test Idea 3: Reduce Friction by Removing an Unnecessary Input

*   **Analysis:** Both models advocate for removing unnecessary steps. Often, baskets ask for information too early, creating friction. For example, if the basket requires a zip code just to *estimate* shipping costs, this is a point of friction that can be deferred.
*   **Hypothesis:** If the basket currently requires users to manually enter location information to calculate shipping, then by removing this input field and instead providing a clear, static link to a "View Shipping Options" page/modal, we will reduce friction and prevent premature abandonment, leading to a higher rate of users proceeding to the next step.
*   **Primary Metric:** Click-through rate from the basket page to the next step in the checkout funnel.
*   **Guardrail Metrics:** Cart abandonment rate, user complaints or queries related to shipping costs.
