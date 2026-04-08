# Reasoning with First-Principle Thinking

Applying First-Principle Thinking allows us to deconstruct the order summary problem into its fundamental truths and challenge the assumptions that create complexity.

## 1. The Problem

We need to display a 100% accurate order summary and relevant upsell offers on a desktop page where the user's final fulfillment choice (delivery or collection) is not yet known.

## 2. Deconstructing to Fundamental Truths

*   A user's basket can contain items with different fulfillment eligibility (delivery-only, collection-only, both).
*   The final, accurate cost of an order depends on the chosen fulfillment method.
*   The validity of a promotional offer (like Argos Pay/Plus) depends on the specific items and total value associated with the chosen fulfillment method.
*   The user is on a single page and can see both fulfillment options.
*   The business goal is **100% accuracy** in the summary shown to the user.

## 3. Challenging Core Assumptions

*   **Assumption 1: The desktop UI must show both fulfillment options simultaneously without a primary selection.**
    *   **Challenge:** Why is this a rigid constraint? What user need does it serve? Could we better serve the user by guiding them to a choice earlier? A simple radio button selection at the top of the basket page (`I'd like to... [ ] Get it delivered [ ] Collect from store`) could resolve the ambiguity instantly.

*   **Assumption 2: We must show the upsell message before the user interacts with the fulfillment options.**
    *   **Challenge:** Why? The most relevant moment to upsell a delivery pass (`Argos Plus`) is when the user is actively considering delivery. Could the upsell logic trigger *after* the user clicks the "Continue with Delivery" CTA, but before the next step? This would provide the necessary signal to ensure the offer is accurate.

*   **Assumption 3: The frontend is responsible for figuring out the complex basket logic.**
    *   **Challenge:** The frontend's primary job is presentation. The backend is for business logic. The only unique piece of information the frontend has is the user's platform (`desktop`). Why can't the frontend's role be simplified to passing this context to the backend (`platform: 'desktop'`) and receiving a rich data object that contains all the necessary information for both scenarios (`{ delivery: {...}, collection: {...} }`)? This would centralize the complex business logic in one place.

## 4. Reconstructing a Solution from Scratch

Given the fundamental truth that **accuracy requires knowing the fulfillment method**, we can reason up to a new solution:

1.  To guarantee 100% accuracy, the system must obtain the user's fulfillment intent.
2.  There are two ways to obtain this intent:
    *   **Explicitly:** Ask the user to choose upfront.
    *   **Implicitly:** Infer the choice after they click a CTA corresponding to a fulfillment path.
3.  The simplest and most robust way to meet the "100% accuracy" goal is to get an explicit signal from the user **before** displaying the final summary and offers.

This first-principles analysis strongly suggests that the most direct path to a solution is to **re-evaluate the desktop UI design constraint**. By challenging the assumption that the user cannot be guided to a choice earlier, the entire problem becomes significantly simpler.
