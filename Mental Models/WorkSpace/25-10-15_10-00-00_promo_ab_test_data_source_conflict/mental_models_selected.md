# Mental Model Selection Report

## 1. Selection Funnel

From an initial list of over 50 potential models, a candidate list of 6 was created based on the problem diagnosis. After a deep-dive review of these 6 candidates, a final selection of the 3 most impactful and relevant models was made.

## 2. Final Ranked Selection

1.  **The Map Is Not the Territory**
2.  **First-Principle Thinking**
3.  **Inversion**

## 3. Rationale for Selection

### 1. The Map Is Not the Territory

*   **Reason for Selection:** This model was chosen because the core of the problem is a discrepancy between the team's understanding of their data systems and the actual reality. The A/B test failed because their "map" (believing SBE and PDP data were consistent) did not match the "territory" (the `is_coupon_eligible` field was missing). This model forces the team to first accept their current understanding is flawed before attempting to build a new solution.
*   **Reference from Model:** The selection directly aligns with the model's `Thinking Steps`, particularly `Step 1: Identify Your Map` (the flawed assumption of data consistency) and `Step 4: Compare and Contrast` (the failed test revealing the discrepancy).

### 2. First-Principle Thinking

*   **Reason for Selection:** This model is crucial for addressing the strategic goal of establishing DPMS as the "single source of truth." Instead of reasoning by analogy ("how can we patch the old system?"), the team must break the problem down to its fundamentals. What information is absolutely essential for promotions to work in the basket? What is the most direct path from the true source to the basket? This prevents legacy complexity from compromising the new architecture.
*   **Reference from Model:** The selection is based on the model's core concept of challenging assumptions ("Why do we need two sources?") and reconstructing from the ground up, which is essential for the migration to DPMS.

### 3. Inversion

*   **Reason for Selection:** After a new plan is made, Inversion is the ideal tool for ensuring its success by focusing on potential failures. By asking, "What could make the next A/B test fail?" or "How could the migration to DPMS go wrong?", the team can proactively identify and mitigate risks beyond the specific `is_coupon_eligible` field. This addresses technical issues, process gaps, and potential stakeholder conflicts.
*   **Reference from Model:** This choice is guided by the model's `Keywords for Situations` (project planning, risk management) and its `Thinking Steps` (brainstorming all potential failure points to create an "avoidance list").
