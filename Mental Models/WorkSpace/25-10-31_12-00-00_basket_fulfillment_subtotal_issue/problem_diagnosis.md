# Problem Diagnosis: Basket Fulfillment and Subtotal Issues

## Core Problem

The core problem is a set of inconsistencies and inaccuracies in the e-commerce basket functionality across different platforms (desktop web, mobile web, and native app). These issues primarily revolve around how the basket subtotal is calculated in relation to the user's intended fulfillment method (collection or delivery), and how this impacts various propositions like "Argos Plus" and "Argos Pay".

## Key Issues

1.  **Inconsistent Subtotals:** The same basket of items shows different subtotals on the native app versus the web platforms (mobile and desktop).

2.  **Fulfilment Preference Issues:**
    *   **Desktop:** Users cannot select their preferred fulfillment method.
    *   **API Behavior:** The basket API seems to calculate the subtotal based on all items in the basket, without accounting for the user's intended fulfillment choice. This leads to incorrect subtotals.

3.  **"Argos Plus" Proposition Flaws:**
    *   The eligibility for the "Argos Plus" free delivery service (triggered by a £20 threshold) is calculated incorrectly.
    *   The calculation includes items that are not eligible for the service (e.g., out-of-stock items, Supplier Direct Fulfilment (SDF) products, and Tu clothing items).
    *   This misleads both existing Argos Plus members and potential new customers into believing their basket qualifies for free delivery when it does not.

4.  **"Argos Pay" Proposition Flaws:**
    *   The eligibility for "Argos Pay" credit options is determined by the basket's contents and subtotal.
    *   Due to the incorrect subtotal calculations, the system presents inaccurate credit options to the user.
    *   "Argos Pay" is not eligible for digital downloads or gift cards.

## System Architecture Insights:

*   All frontends (app, mobile web, desktop web) utilize a common "basket API."
*   The "basket API" forwards all basket items to a separate "SPE" system, which then returns information for display.
*   A key difference: the native app makes an *additional, separate call* to the "SPE" system, which may contribute to the subtotal discrepancies.

## Desired State:

*   **Argos Pay:** Display the correct payment proposition based on the basket value and the user's *preferred/intended fulfillment choice*. This is challenging on desktop where fulfillment intent is not captured.
*   **Argos Plus:** Accurately advertise the pass to customers (regardless of login status) based on *eligible items* and a basket calculation that *respects the chosen fulfillment type (delivery)*.

## Constraints:

*   **The desktop UI cannot be changed.**

## User-Facing Problem Statements

*   "As a customer, I see different subtotals for the same basket on the app versus the web."
*   "I can’t set my fulfillment type preference on the desktop view, so my subtotal includes all items for both collection and delivery."
*   "My basket appears to qualify for free delivery with Argos Plus, but it includes items that are not eligible."
*   "I am prompted to get an Argos Plus pass, but the calculation of my eligibility is misleading."
*   "Given I plan to collect my order, I see subtitles and credit options based on all items including those I can’t collect, so my total doesn’t reflect what I actually intend to buy."
*   "Because I can't choose my fulfillment type on desktop, the credit options I see are based on all items in my trolley, not just the ones I plan to purchase via a specific fulfillment method."
