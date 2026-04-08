# Future State Logic

This diagram illustrates the ideal, robust logic for handling promotion display.

## Key Principles

*   **Single Source of Truth:** A centralized "Promotion Engine" holds all eligibility logic.
*   **Clear Separation of Concerns:** The Basket is only responsible for rendering UI based on simple signals; it contains no business logic.
*   **Explicit Logic:** Eligibility checks are direct and not based on unreliable proxies.

## Ideal Process Flow

1.  **User Action:** User adds a product to the basket.
2.  **System Event:** The Basket requests a "display model" for the product from the Promotion Engine.
3.  **Promotion Engine Invocation:** The request is routed to the centralized Promotion Engine.

## Correct Logic within Promotion Engine

```
FUNCTION get_basket_display_model(product, user):

  // Create a default display model
  display_model = {
    show_offer_sticker: false,
    offer_text: ""
  }

  // Step 1: Find the relevant promotion from the master source.
  promotion = find_promotion_for(product)
  IF promotion is NULL:
    RETURN display_model // Return default (no sticker)

  // Step 2: Directly check if the user is eligible.
  // The logic is contained within this function. It does NOT check for
  // unrelated proxies like "coupon availability".
  IF user_is_eligible_for(promotion, user):
    // If eligible, update the display model with correct info.
    display_model.show_offer_sticker = true
    display_model.offer_text = promotion.text
    RETURN display_model // Return updated model

  // If user is not eligible, return the default model.
  RETURN display_model
```

## Outcome

*   **Result:** The Promotion Engine returns a clear, explicit set of instructions (`display_model`) to the basket.
*   **Symptom:** The basket renders the UI perfectly and consistently based on the `display_model`. The logic is robust, centralized, and easy to debug. The "broader issue" is resolved.
