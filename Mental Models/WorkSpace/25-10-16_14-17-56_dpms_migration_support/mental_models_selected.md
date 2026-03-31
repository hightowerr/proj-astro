# Mental Model Selection Report

This document outlines the selection and ranking of mental models for the task of securing architectural support for the DPMS migration.

## Selection Funnel

From an initial scan of 112 models, a candidate list of 12 potentially relevant models was created. A deep-dive analysis was then performed on a shortlist of 5 models. From this, a final selection of 3 models was made.

## Final Ranked Selection

1.  **Inversion (`m07_inversion.md`)**
2.  **Incentives (`m19_incentives.md`)**
3.  **Minto Pyramid Principle (`Minto Pyramid Principle.md`)**

## Rationale for Selection

### 1. Inversion
*   **Reason for Selection:** This model was chosen as the starting point to proactively identify and mitigate all potential reasons for failure. By asking "What would guarantee the architecture team rejects our proposal?", we can anticipate their objections, address their perceived risks (e.g., single point of failure, future costs), and fill in our knowledge gaps. This directly tackles the unknowns and risks identified in the problem diagnosis.

### 2. Incentives
*   **Reason for Selection:** The problem diagnosis clearly states the architects' primary incentives: **cost reduction, efficiency, and eliminating redundancy**. This model is therefore central to the entire strategy. It forces us to frame the DPMS migration not as a self-serving request, but as a solution that directly serves their core objectives by simplifying the tech stack, creating a single source of truth, and improving data integrity.

### 3. Minto Pyramid Principle
*   **Reason for Selection:** After using Inversion to understand the risks and Incentives to frame the benefits, we need a powerful communication structure. The Minto Pyramid is the ideal tool for this. It will allow us to construct a clear, top-down argument that starts with the conclusion (the "Answer") and then supports it with logical points that are directly aligned with the architects' priorities. This ensures our message is received as a well-reasoned, strategic proposal rather than a simple request.
