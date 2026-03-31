# Applying Bias Analysis to Basket Problem Validation

This document applies the thinking steps from the Confirmation Bias and Survivorship Bias models to the task: "Validate/refresh customer evidence for existing Basket problems."

---

### Part 1: Countering Confirmation Bias

**Goal:** To actively challenge the existing beliefs and workshop outputs to ensure the team is seeking truth, not just reassurance.

**Thinking Steps & Research Actions:**

1.  **State Your Core Beliefs:**
    *   **Action:** List the top 3-5 hypotheses or strongest beliefs the team has about the basket redesign. (e.g., "We believe a one-page checkout is better," "We believe the promo code field is the biggest friction point.")

2.  **Seek to Disprove Them:**
    *   **Action:** For each belief, design a research question aimed at *disproving* it. This is the most effective way to fight confirmation bias.
        *   *Example:* If the belief is "Users want a one-page checkout," the research question should be: "Find 5 users who prefer a multi-step checkout and deeply understand why."
        *   *Example:* If the belief is "The promo code field is the biggest problem," the question should be: "Find evidence that users are more confused by shipping costs than by promo codes."

3.  **Assign a Devil's Advocate:**
    *   **Action:** In your next design review, formally assign one person to be the "devil's advocate." Their only job is to argue against the prevailing ideas and find flaws in the supporting evidence. This institutionalizes the search for disconfirming evidence.

4.  **Consider Alternative Hypotheses:**
    *   **Action:** Brainstorm alternative, even contradictory, explanations for the user behavior you see. 
        *   *Example:* The data shows users spend a long time in the basket. The hypothesis is "the design is confusing." An alternative hypothesis is "users are using the basket as a calculator or a wishlist to make a careful decision." Your research plan should seek to validate or invalidate *both* hypotheses.

---

### Part 2: Countering Survivorship Bias

**Goal:** To ensure the analysis focuses on the users who *failed* to complete a purchase, not just the successful "survivors."

**Thinking Steps & Research Actions:**

1.  **Identify the "Survivors":**
    *   **Action:** Acknowledge that your current analytics on completed purchases only tells the story of your successful users. This data is blind to the problems that cause users to fail.

2.  **Find the "Silent Graveyard":**
    *   **Action:** The users who abandon their carts are your most valuable source of information on basket problems. Your research must prioritize them.
        *   **Analytics:** Identify the single biggest drop-off point in your basket-to-checkout funnel. This is where the most users "die." Your analysis should start there.
        *   **Session Replays:** Filter for session recordings of users who put an item in their basket but did not complete the purchase. Watch at least 20 of these sessions. What did they do right before they left? Did they rage-click? Did they go back and forth?
        *   **User Interviews:** Actively recruit users for interviews who you know have abandoned a cart in the last 30 days. Do not just interview your happy, loyal customers. Ask them to tell you the story of why they didn't buy.

3.  **Question the Narrative of Success:**
    *   **Action:** For any conclusion drawn from your successful users, ask how it might be misinterpreted due to survivorship bias.
        *   *Example:* "Our data shows 90% of successful mobile users clicked the 'Pay with PayPal' button." This doesn't mean the credit card form is not important. It could mean the credit card form is so broken that only users willing to use PayPal are able to survive the checkout process.
