# Reasoning via Occam's Razor

**Applied Model:** [m09_occam's_razor.md](m09_occam's_razor.md)

**Goal:** To simplify the five fundamental components identified by First-Principle Thinking by challenging their complexity and removing any non-essential assumptions.

---

### Thinking Steps Applied

**1. Gather All Plausible Components:**
From the previous analysis, the essential components for the journey are:
1.  Input Field
2.  Apply Button
3.  Backend Logic
4.  Success Feedback (Discount Line Item + New Total)
5.  Failure Feedback (Error Message)

**2. Count the Assumptions (Challenge Each Component):**
We will now act as a "razor" and question if each component is in its simplest possible form to test the hypothesis.

*   **Input Field & Apply Button:** Are these the simplest way to get the code? Yes. Any alternative (e.g., auto-applying on paste) is more complex to build and less clear for the user. They represent the simplest, most direct method. **Verdict: Keep as is.**

*   **Backend Logic:** Does the logic need to be complex? No. For the MVP, it only needs to answer one binary question: is this code valid for this basket, yes or no? It does not need to handle complex scenarios or multiple discount types initially. **Verdict: Keep, but ensure it's the simplest possible validation logic.**

*   **Success Feedback:** The meeting notes mentioned users want a "breakdown of what is being saved." Does the MVP need to deliver this? This is a critical point. While a simple changing total is technically simpler, the user research suggests the *value* is in the clarity of the breakdown. Therefore, the simplest journey that validates the *perceived value* must include this breakdown. 
    *   **Simplest Form:** A new line item showing the discount amount (e.g., "Discount: -£5.00") and an updated basket total. 
    *   **Verdict: Keep. The breakdown is part of the core hypothesis.**

*   **Failure Feedback:** Does the user need to know *why* the code failed (e.g., "expired," "not applicable")? 
    *   **Complex Explanation:** Requires the backend to return multiple, specific error reasons and the frontend to display them.
    *   **Simple Explanation:** Requires only one generic error state (e.g., "Code not recognised").
    *   Occam's Razor strongly favors the simplest explanation. The core journey is tested by simply telling the user it didn't work. The reasons why can be added in a later iteration.
    *   **Verdict: Simplify. Use a single, generic error message for all failure states.**

**Conclusion from Occam's Razor:**

This model successfully simplifies the journey by reducing the complexity of the feedback mechanisms without removing any of the five core components. The simplest viable journey requires:

*   **A single, generic error message** for all failure states.
*   The backend logic only needs to return a simple "success" or "fail" state, not multiple failure reasons.

This significantly reduces the number of states the UI and API need to handle, making the MVP faster and cheaper to build while still testing the core hypothesis. 
