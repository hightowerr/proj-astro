# Problem Diagnosis: Promotion Code Implementation Strategy

The core challenge is to define the implementation strategy for a new promotion code feature in the e-commerce basket. The discussion highlights a conflict between delivering a seamless user experience and managing technical complexity, development time, and business risk.

## Key Problem Areas:

1.  **Cross-Platform Experience (Web vs. App):** There is a significant technical hurdle to synchronizing the state of applied promo codes between the web and mobile app platforms. The current architecture does not support this, making a seamless cross-device journey difficult to achieve without major changes.

2.  **State Persistence vs. Basket Volatility:** The basket is dynamic. Any change (item removal, quantity update) triggers a recalculation. Persisting an applied promo code after such a change can lead to inconsistencies and invalid states. For example, a discount might still appear to be applied even if the conditions for it are no longer met, leading to customer confusion and potential abuse.

3.  **Technical vs. User Experience Trade-offs:** The team is debating two main paths:
    *   **Path A (Simple & Fast):** A minimal implementation where promo codes are cleared whenever the basket changes. This is technically simpler and faster to deliver but introduces friction for the user, who must re-apply codes.
    *   **Path B (Robust & Complex):** A more sophisticated solution that persists the promo code state correctly through basket changes and potentially across devices. This provides a better user experience but is technically complex, requires more resources, and may delay the launch.

4.  **Business Risk:** There are concerns about potential misuse, such as users capturing screenshots of invalid discounts, and the operational load on customer support to handle these cases. There are also concerns about bot activity and the spamming of promo codes.

## Decision to be made:

The central decision is to choose the right strategy for the initial (Q4) launch of the promo code feature. This decision must balance the competing priorities of speed-to-market, user experience, technical feasibility, and risk mitigation. The team also needs to consider a potential roadmap for evolving the feature post-launch.
