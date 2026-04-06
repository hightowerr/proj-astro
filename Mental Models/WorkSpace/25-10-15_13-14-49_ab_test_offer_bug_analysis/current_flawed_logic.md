# Current Flawed Logic

This diagram illustrates the process flow that leads to the "missing sticker" error.

## Process Flow

1.  **User Action:** User adds a product to the basket.
2.  **System Event:** The Basket requests promotion information for the product.
3.  **SPE (Service Personalization Engine) Invocation:** The request is routed to the SPE.

## Flawed Logic within SPE

```
FUNCTION should_display_offer(product, user):

  // Check 1: Is there a promotion for this product?
  // This part seems to work correctly.
  promotion = find_promotion_for(product)
  IF promotion is NULL:
    RETURN false

  // Check 2: Is there a coupon available for this promotion?
  // *** THIS IS THE BOTTLENECK/BUG ***
  // It incorrectly assumes a "coupon" must exist.
  coupon = find_coupon_for(promotion)
  IF coupon is NOT available:
    // It stops here, even if the promotion is valid
    // and doesn't need a coupon.
    RETURN false  // <-- ERROR: Incorrectly returns false

  // This part is likely never reached for non-coupon promotions
  IF user is eligible_for(promotion):
    RETURN true
  ELSE:
    RETURN false
```

## Outcome

*   **Result:** The SPE returns `false` for any valid, automatic promotion that doesn't have an associated "coupon" entity.
*   **Symptom:** The basket receives the `false` signal and does not render the "offer sticker", leading to an inconsistent user experience and invalid A/B test data.
