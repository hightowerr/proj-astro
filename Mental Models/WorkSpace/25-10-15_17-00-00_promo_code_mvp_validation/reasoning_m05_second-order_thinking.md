# Reasoning via Second-Order Thinking

**Applied Model:** [m05_second-order_thinking.md](m05_second-order_thinking.md)

**Goal:** To analyze the unintended consequences of launching the hyper-simplified MVP defined by the previous two models, ensuring it produces reliable data.

---

### Thinking Steps Applied

**1. Identify the Decision and First-Order Consequence:**
*   **Decision:** To build the MVP with only the bare essentials: an input, a button, success feedback, and a single, generic error message.
*   **First-Order Consequence:** We will be able to build and ship the feature extremely quickly and cheaply to test our core hypothesis.

**2. Ask "And then what?" (The Ripple Effects):**
What happens as a result of this extreme simplicity?

*   **Scenario: The Generic Error Message**
    *   A user enters a code that is valid, but not for the items in their basket (a very common scenario).
    *   The system correctly rejects the code, but our MVP shows the generic message: "Code not recognised."
    *   **Second-Order Consequence:** The user becomes frustrated. They believe the feature is broken or that the code they were given is fake. Their trust in the system is damaged.
    *   **Third-Order Consequence:** They may abandon their purchase. More importantly, our experiment is contaminated. We might get a false-negative signal, concluding that the feature isn't valuable, when in reality, the *implementation* was simply too frustrating to be useful.

*   **Scenario: No "Remove" Button**
    *   Our simplified design did not include a way to remove an applied code.
    *   A user applies a 10% off code, then remembers they have a 20% off code. They try to apply the new code, but the system doesn't allow it. They cannot remove the old code.
    *   **Second-Order Consequence:** The user is now stuck with the inferior discount. They feel cheated and frustrated.
    *   **Third-Order Consequence:** They may abandon the purchase or complete it with a negative sentiment. This again pollutes our data on the feature's perceived value.

**5. Evaluate the Full Chain of Consequences:**

The desire for absolute simplicity (a positive first-order goal) leads to a frustrating user experience (a negative second-order consequence), which in turn leads to unreliable test data (a disastrous third-order consequence). 

This analysis reveals that the MVP, as simplified by Occam's Razor, is no longer **viable**. A product must have a minimum level of usability to be a valid test. The risk of a false negative is too high.

**Conclusion from Second-Order Thinking:**

This model acts as a critical safety net. It forces us to slightly amend the MVP definition to ensure the journey is not just simple, but also **non-frustrating** in the most common scenarios. The simplest *viable* journey must therefore be adjusted:

1.  **Refine the Error Feedback:** The MVP must, at a minimum, distinguish between an invalid code (e.g., a typo) and a valid code that is not applicable to the current basket. This prevents the most common and damaging user frustration.

2.  **Include a "Remove" Option:** The user must have a way to undo their action. A "Remove" or "Change" link next to the applied discount is a minimal addition that is critical for usability.

By investing a small amount of extra effort in these two areas, we can prevent major user frustration and dramatically increase the reliability of our experiment.
