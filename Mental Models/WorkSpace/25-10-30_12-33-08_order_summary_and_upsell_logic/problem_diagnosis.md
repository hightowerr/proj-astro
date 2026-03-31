# Problem Diagnosis: Order Summary and Upsell Logic

The core problem is ensuring the accurate calculation and display of order summary subtitles and promotional upsell messaging (for Argos Plus/Pay) in the customer's basket, particularly on the desktop platform.

## Key Challenges:

1.  **Fulfillment Type Ambiguity on Desktop:**
    *   On mobile, users select a fulfillment type (e.g., collection) before seeing the final summary, making it easy to calculate an accurate subtitle based on eligible items.
    *   On desktop, both delivery and collection options are displayed simultaneously. The system doesn't know the user's intent upfront, leading to potential inaccuracies if the summary is based on the entire basket.

2.  **Upsell Logic Complexity:**
    *   Displaying upsell messages for Argos Pay or Argos Plus depends on an accurate basket calculation.
    *   The logic needs to verify item eligibility, stock status, and fulfillment type to present a valid offer. This is compromised by the ambiguity on desktop.

3.  **Logged-Out Users:**
    *   There is no current mechanism to advertise Argos Plus to logged-out users because their pass status is unknown.

4.  **Technical Divergence:**
    *   The mobile app and web platforms seem to use different technical solutions. The mobile app makes an additional call to a service (SB/SP) to get accurate data.
    *   There is a risk of sending incorrect information to downstream systems (like a CMS for payment propositions), which could result in displaying the wrong payment options to the user.

## Additional Information from Questionnaire:

*   **Primary Business Outcome:** The number one goal is to "Ensure 100% accuracy in order summary."
*   **Platform Priority:** Mobile is the highest priority due to higher traffic, but the desktop problem is significant because of its unique UI constraints.
*   **Decision-Making:** The technical approach is decided collaboratively between teams. The existing app implementation is seen as a good model.
*   **Hardest Constraint:** The primary constraint is the user interface on desktop, where the absence of an upfront fulfillment selection prevents the system from knowing the user's intent.
*   **Proposition Details:**
    *   **Argos Plus:** A £40/year delivery subscription. Upsell logic must be precise to only target customers with eligible baskets.
    *   **Argos Pay:** A "Buy Now, Pay Later" service with multiple plans. The correct plan is determined by the accurate basket total and item eligibility, making order summary accuracy critical.