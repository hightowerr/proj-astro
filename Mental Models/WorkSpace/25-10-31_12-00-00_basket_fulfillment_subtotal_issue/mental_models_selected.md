# Mental Model Selection

This document outlines the process of selecting the mental models for analyzing the basket fulfillment and subtotal issues.

## Selection Funnel

From an initial list of over 100 available mental models, a candidate list of 12 models was created based on the initial problem diagnosis. After a deep evaluation of these candidates against the problem's specifics and the user's questionnaire responses, the following three models were selected for their direct applicability and power in addressing the identified issues.

## Final Selection & Ranking

1.  **Five Whys** (`m0138_five_whys.md` from `Mental_Model_SysThinking`)
2.  **Problem Disaggregation** (`m64_problem_disaggregation.md` from `Mental_Model_General`)
3.  **Design Thinking** (`m68_design_thinking.md` from `Mental_Model_General`)

## Rationale for Selection

### 1. Five Whys
*   **Rationale:** This model is crucial for uncovering the root causes of the discrepancies, particularly the differing subtotal calculations between the app and web, and why ineligible items are included in proposition eligibility calculations. The user's input highlighted a key architectural difference (the app's separate call to SPE), which `Five Whys` can help us explore to understand *why* this difference exists and *why* it leads to the observed problems.

### 2. Problem Disaggregation
*   **Rationale:** The problem presented is a complex bundle of interconnected issues (inconsistent subtotals, incorrect Argos Plus/Pay eligibility, desktop UX limitations, API interactions). `Problem Disaggregation` will enable us to systematically break down this large problem into smaller, more manageable components. This will allow for a focused analysis of each part without losing sight of the overall system, making the solution process more structured and effective.

### 3. Design Thinking
*   **Rationale:** The desired state articulated by the user heavily emphasizes user experience, particularly around clear communication of eligibility and accurate fulfillment choices. `Design Thinking` provides a user-centric framework to approach the problem, ensuring that any proposed solutions are not just technically sound but also meet the actual needs and expectations of the end-user. It will guide us in empathizing with the user's frustration and designing solutions that deliver a seamless and trustworthy experience.