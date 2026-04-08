# Reasoning via First-Principle Thinking

**Applied Model:** [m03_first-principle_thinking.md](m03_first-principle_thinking.md)

**Goal:** To define the simplest journey to validate the promo code hypothesis by breaking the process down to its fundamental, irreducible components.

---

### Thinking Steps Applied

**1. Identify the Goal:**
A user wants to reduce the total price of their basket by using a code they possess.

**2. Deconstruct the Problem into Fundamental Truths:**
To achieve this goal, the following things must be true, representing the absolute core components of the journey:

*   **Truth 1: The system needs the code.** The user has a code, and the system needs to receive it. 
    *   **Fundamental Component:** An **Input Field** where the user can type or paste the code string.

*   **Truth 2: The system needs to know when to act.** The system can't guess when the user is done typing. It needs a clear signal to proceed.
    *   **Fundamental Component:** A **Trigger**, such as an "Apply" button, that the user clicks to initiate the validation process.

*   **Truth 3: The system must determine the code's validity.** The code must be checked against a set of rules (e.g., does it exist? is it expired? does it apply to these items?).
    *   **Fundamental Component:** **Backend Logic** that can validate the code against the current basket state.

*   **Truth 4: The system must communicate the result.** The user must know if the action was successful or not. A silent failure or success is not a complete journey.
    *   **Fundamental Component (Success):** The basket total must change. The most fundamental feedback is seeing the **Discount Amount** as a line item and the **Updated Final Price**.
    *   **Fundamental Component (Failure):** The user must be told the code didn't work. The fundamental feedback is a clear **Error Message** (e.g., "Code not valid").

**Conclusion from First Principles:**

The absolute, irreducible "first principles" journey for applying a promo code consists of exactly five components. Anything else is an enhancement or a "nice-to-have" that can be added later.

**The Essential Components Are:**
1.  An **Input Field** for the code.
2.  An **"Apply" Button** to trigger the action.
3.  **Validation Logic** on the backend.
4.  **Success Feedback:** A visible discount line item and a new total.
5.  **Failure Feedback:** A simple, clear error message.
