# Reasoning with Bottlenecks

Applying the Bottlenecks mental model to the order summary problem reveals where the system flow is constrained.

## 1. Process Flow Mapping

The user journey for purchasing items is as follows:

1.  User adds items to their basket.
2.  User proceeds to the basket/summary page.
3.  **Platform Divergence:**
    *   **On Mobile:** The user is guided to select a fulfillment type (Delivery or Collection).
    *   **On Desktop:** The user is presented with both options simultaneously, with no initial choice made.
4.  The system attempts to calculate and display an accurate order summary subtitle.
5.  The system attempts to determine eligibility for upsell offers (Argos Pay/Plus).
6.  The system sends basket information to a CMS to fetch valid payment propositions.
7.  The user proceeds to checkout.

## 2. Identifying the Constraint (The Bottleneck)

The primary bottleneck is located in the **desktop user journey** at the point where the order summary needs to be displayed. The system lacks the critical information of the user's intended fulfillment method. This single point of ambiguity constrains the ability of all downstream processes to function accurately. Work (i.e., accurate calculations) "piles up" here because the system cannot proceed down a single path.

## 3. Exploiting the Bottleneck

To "exploit" the bottleneck means to make the absolute best use of it. The current process of calculating the summary based on the entire basket is a poor exploitation, as it leads to inaccuracies. A better exploitation would be to ensure that whatever is displayed is clearly communicated as provisional, but this violates the primary goal of 100% accuracy.

## 4. Subordinating the System

All other steps are subordinate to this bottleneck. The accuracy of the Argos Pay upsell logic, the correctness of the payment propositions returned by the CMS, and the final order summary are all entirely dependent on knowing the user's fulfillment choice. It is inefficient to spend effort optimizing these downstream steps until the bottleneck is addressed, as they will be fed inaccurate information.

## 5. Elevating the Bottleneck

"Elevating" the bottleneck means increasing its capacity. Here, the capacity is "certainty of user intent." The options for elevation are:

*   **Option A: Redesign the UI.** Modify the desktop interface to guide the user into making a fulfillment choice *before* the summary is calculated. This is the most direct way to eliminate the bottleneck.
*   **Option B: Enhance the Backend.** Adapt the backend APIs to handle the ambiguity. The frontend could pass a `platform: 'desktop'` flag, and the backend could return a more complex data structure containing calculations for all possible scenarios. This moves the complexity from the frontend to the backend and UI.
*   **Option C: Make an Educated Guess (Not Recommended).** Default to the most common fulfillment type for the initial display. This is a weak solution that fails to meet the core requirement of 100% accuracy.

By focusing on elevating this specific bottleneck, the team can unlock the flow of accurate information through the rest of the checkout system.
