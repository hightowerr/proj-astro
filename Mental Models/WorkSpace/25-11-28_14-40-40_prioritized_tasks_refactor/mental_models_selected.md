# Mental Model Selection Report

## 1. Selection Process Summary
From an initial scan of over 100 models in the library, a candidate list of 12 was generated based on the `problem_diagnosis.md`. The keywords "clutter," "focus," "inconsistent," and "MVP" were used to filter for models related to simplification, user-centric design, and systems thinking. A deep dive was performed on the top 3 candidates to confirm their suitability.

## 2. Final Ranked List of Chosen Models
1.  **Jobs To Be Done** (`m0137_jobs_to_be_done.md`)
2.  **Chekhov's Gun** (`m72_chekhov's_gun.md`)
3.  **Cognitive Load** (`m122_cognitive_load.md`)

## 3. Rationale for Selection

### 1. Model: Jobs To Be Done (JTBD)
*   **Reason:** The "Your Prioritized Tasks" feature has become bloated and lost its way. The JTBD model is the perfect tool to reset our strategy by forcing us to answer the fundamental question: "What progress is the user trying to make when they 'hire' this feature?" Instead of arguing about features, we can first align on the core "job" this feature is meant to do. This will provide a clear, user-centric foundation for all other design and simplification decisions.
*   **Reference:** The model's `Description` directly addresses this by focusing on "customer motivation" and understanding the "struggle to make progress" rather than on features.

### 2. Model: Chekhov's Gun
*   **Reason:** The primary user complaint is "clutter" and information overload. This model provides a powerful, creative lens for ruthless simplification. It frames every UI element, every piece of data, and every feature as a "gun on the wall." The thinking step "Does each element contribute to the main theme or plot?" becomes our guiding principle. If a UI element doesn't directly help the user accomplish the "Job" identified by JTBD, this model argues for its removal.
*   **Reference:** The model's `Description` states, "everything that appears in a story must serve some overall purpose... extraneous details should be eliminated." This is a perfect articulation of the design goal.

### 3. Model: Cognitive Load
*   **Reason:** This model provides the scientific vocabulary and framework to describe *why* the clutter is a problem. The current 5-column table and inconsistent labeling create high cognitive load, which "slows people down, increases errors, and causes abandonment." By applying the thinking steps from this model, such as "Minimize choices" and "Tighten visual hierarchy," we can translate the broad principle of "simplification" from Chekhov's Gun into specific, actionable UI/UX design heuristics.
*   **Reference:** The model's `Keywords for Situations` include "Visual hierarchy," "Consistency," and "Too many choices," which directly map to the problems identified in the diagnosis.
