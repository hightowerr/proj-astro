# Applying 5 Whys to Basket Problem Root Cause Analysis

This document applies the thinking steps from the 5 Whys framework to the task: "Validate/refresh customer evidence for existing Basket problems." It should be used as the final step in the analysis of a specific, validated problem.

---

### Introduction: From Problem to Root Cause

The previous steps (JTBD, Bias Analysis) are designed to help you identify and validate *what* the real user problems are. The 5 Whys is a tool to help you understand *why* those problems are occurring. By repeatedly asking "Why?", you move past surface-level symptoms to find a root cause that you can design a solution for.

**Prerequisite:** Do not use this technique on an unvalidated problem. Start with a crisp, observable problem statement backed by evidence from your research. 

*   **Good starting point:** "Analytics and session replays show 60% of users drop off on the page where they are asked to enter their shipping address."
*   **Bad starting point:** "The shipping form is bad."

---

### 5 Whys Thinking Steps: A Worked Example

Here is how to apply the 5 Whys process to a validated problem.

**1. Frame the Problem Crisply**
*   **Problem:** 60% of users drop off at the shipping address page.

**2. Gather the Right People**
*   **Action:** Assemble a small, cross-functional group (e.g., a designer, an engineer, a product manager) to walk through the exercise.

**3. Ask "Why?" Iteratively**
*   **Why 1?** (Why do users drop off?)
    *   *Answer:* Because they are presented with a long, intimidating form with many input fields.

*   **Why 2?** (Why is the form long and intimidating?)
    *   *Answer:* Because it asks for information we don't strictly need for the most common use case (e.g., "Company Name," "Address Line 2," separate fields for first and last name).

*   **Why 3?** (Why does it ask for non-essential information?)
    *   *Answer:* Because the form was designed to cover all possible edge cases for shipping, rather than being optimized for simplicity.

*   **Why 4?** (Why was it designed for edge cases over simplicity?)
    *   *Answer:* Because there was no design principle or success metric related to speed or "form-field efficiency."

*   **Why 5? (Potential Root Cause)**
    *   *Answer:* Because the project's initial requirements prioritized "capturing complete data" over "reducing user friction."

**4. Define Countermeasures**
*   **Goal:** Convert the root cause into a specific, actionable countermeasure for the redesign.
*   **Example Countermeasure:**
    *   "For the redesign, we will establish **'Minimize user friction'** as a primary design principle, measured by time-to-completion and form abandonment rate.
    *   **Action:** Make all non-essential fields (like Company Name, Address Line 2) optional and move them behind an 'Add optional details' link.
    *   **Action:** Combine First Name and Last Name into a single 'Full Name' field to reduce the number of inputs."

---

### Conclusion

This technique provides the final link between a high-level user struggle (a failed "Job to be Done") and a concrete design change. By finding the root cause, you ensure you are fixing the fundamental issue, not just patching a symptom.
