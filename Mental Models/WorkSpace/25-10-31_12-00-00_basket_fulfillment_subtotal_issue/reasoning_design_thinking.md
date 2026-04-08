# Reasoning: Design Thinking Analysis

## 1. Empathize

**User Pain Points Identified:**

*   **Confusion & Lack of Trust (Inconsistent Subtotals):** Users are confused and lose trust when the same basket shows different subtotals across native app and web platforms. This leads to uncertainty about the actual price they will pay.
*   **Lack of Control & Frustration (Desktop Fulfillment):** On desktop, users cannot specify their preferred fulfillment method, leading to a subtotal that includes all items (collection and delivery). This means the displayed total doesn't match their actual intent and can be misleading.
*   **Disappointment & Feeling Misled ("Argos Plus" Inaccuracy):** Users purchasing ineligible items (SDF, Tu, out-of-stock) are incorrectly led to believe they qualify for "Argos Plus" free delivery. This creates disappointment and a sense of being misled when they realize the service isn't truly free for their basket.
*   **False Hope & Frustration (Misleading Argos Pass Prompts):** Prompts to purchase an "Argos Pass" (for free delivery) appear even when the user's basket doesn't truly qualify (due to ineligible items), creating false hope and frustration when non-eligibility is discovered.
*   **Inaccuracy & Difficulty Budgeting ("Argos Pay" Inaccuracy):** Users planning to collect an order see credit options based on all items, including those not available for collection. This makes it difficult to budget and understand the true financial commitment for their intended purchase.

**Key User Needs:**

*   **Accuracy & Trust:** Users need to have confidence that the displayed basket subtotal and proposition eligibility information is always accurate and reflects their chosen intent.
*   **Control & Personalization:** Users require the ability to specify their preferences (e.g., fulfillment type) early in the journey and see immediate, accurate reflections of these choices in the basket total and available propositions.
*   **Clarity & Transparency:** Information regarding eligibility for services like "Argos Plus" and "Argos Pay" must be clear, transparent, and provide a quick explanation if certain items are excluded.
*   **Consistency:** The user experience, especially around critical information like pricing and eligibility, should be consistent across all platforms (app, mobile web, desktop web).

## 2. Define

**User-Centered Problem Statement:**

"Users are frustrated and lose trust in the Argos platform because inconsistent basket subtotals, misleading proposition eligibility, and a lack of control over fulfillment preferences (especially on desktop) prevent them from accurately understanding the true cost and benefits of their intended purchase across different platforms."

## 3. Ideate

**Brainstormed Solutions to Address Core Issues:**

*   **Consistent API Integration & Logic:** Implement a single, intelligent basket API that centrally processes user fulfillment intent and item eligibility rules. This API should be the single source of truth for all platforms.
*   **Revamped Desktop Basket UI:** Introduce a prominent and mandatory fulfillment choice (delivery/collection) at the beginning of the basket journey on desktop. This choice should instantly and accurately update all subsequent calculations and proposition displays.
*   **Real-time Dynamic Updates:** Ensure that the basket subtotal, Argos Plus eligibility (including eligible/ineligible item counts), and Argos Pay options dynamically update as users change fulfillment types, add/remove items, or log in/out.
*   **Visual Eligibility Indicators:** Within the basket, use clear visual cues (e.g., icons, subtle highlighting, clear labels) to indicate which specific items are eligible or ineligible for "Argos Plus" or "Argos Pay" benefits.
*   **Detailed Subtotal Breakdown:** Provide a clear, expandable breakdown of the basket subtotal, differentiating between items selected for collection vs. delivery (if mixed) and highlighting any items excluded from specific propositions.
*   **Proactive Eligibility Messaging:** For "Argos Plus" and "Argos Pay," dynamically display messages that explain *why* a basket *does* or *does not* qualify, and what actions a user can take (e.g., "Add £X more of eligible items for free delivery").
*   **Centralized Business Rule Engine:** Implement a robust rule engine that manages all eligibility criteria for propositions, ensuring consistent application across all API calls and frontends.
*   **Unified Design System:** Enforce a consistent UI/UX design system for basket, checkout, and proposition displays across all platforms to reduce user cognitive load and build familiarity.

## 4. Build (Prototype - Suggested Approaches)

As an AI, I cannot create physical prototypes, but here are recommended approaches:

*   **Interactive Wireframes/Mockups:** Develop high-fidelity wireframes or mockups for the desktop basket, showcasing the proposed UI for fulfillment selection and the dynamic updates to subtotals and eligibility messages.
*   **Clickable Prototypes:** Create interactive prototypes using tools like Figma or InVision to simulate the user journey of changing fulfillment, adding/removing items, and seeing the real-time impact on pricing and proposition eligibility.
*   **"Fake Door" Tests:** For radical UI changes (like a prominent desktop fulfillment selector), consider A/B testing a simple "fake door" to gauge user engagement before full development.
*   **Messaging A/B Tests:** Prototype different variations of eligibility and upsell messages for Argos Plus/Pay to test which ones are clearest and most effective without misleading users.

## 5. Test (Suggested Approaches)

*   **Usability Testing with Target Users:** Conduct moderated or unmoderated usability tests with representative users to observe their interactions with the prototypes. Focus on tasks related to basket building, fulfillment selection, and understanding proposition eligibility.
*   **User Interviews:** Follow up usability tests with interviews to delve deeper into user perceptions, frustrations, and preferences regarding the proposed solutions.
*   **A/B Testing (Post-Implementation):** Once changes are implemented, A/B test different UI elements, messaging, and basket flows to quantitatively measure impact on key metrics like conversion rate, basket abandonment, and customer satisfaction scores.
*   **Analytics Review:** Monitor analytics data (e.g., funnel drop-offs, event tracking for fulfillment changes, proposition engagement) to identify areas for further improvement.

## 6. Iterate

The feedback and data gathered during testing will be crucial for refining the designs, adjusting the underlying logic, and iterating on solutions. This iterative cycle ensures that the final implemented solution effectively addresses the defined user problem and continuously improves the basket experience across all Argos platforms.
