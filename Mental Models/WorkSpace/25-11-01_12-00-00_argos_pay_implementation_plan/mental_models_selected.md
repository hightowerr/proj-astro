# Mental Models Selected for Argos Pay Implementation Analysis

From an initial list of 12 candidate models, 3 were selected after a deep-dive evaluation. This selection provides a robust framework for deconstructing the provided transcript, structuring the analysis, and generating actionable insights.

## Final Ranked List of Models

1.  **m117_minto_pyramid_principle.md**
2.  **m01_the_map_is_not_the_territory.md**
3.  **m32_bottlenecks.md**

---

## Rationale for Selection

### 1. m117_minto_pyramid_principle.md

*   **Why it was chosen:** The primary task is to transform a chaotic, unstructured conversation into a clear, logical, and actionable analysis. The Minto Pyramid Principle is the ideal tool for this. Its `Situation -> Complication -> Question -> Answer` (SCQA) framework will be used to structure the final report, ensuring that the core problem is clearly defined and the recommendations are presented in a compelling, easy-to-digest manner.
*   **Reference from file:** The model's `Description` states it is a "method for structuring thinking and communication," which directly maps to the user's need. The `Keywords for Situations` like "executive summary," "proposals," and "problem definition" confirm its suitability.

### 2. m01_the_map_is_not_the_territory.md

*   **Why it was chosen:** This model perfectly encapsulates the central challenge revealed in the transcript. The initial plan (the "map") for implementing Argos Pay was perceived as simple, but the reality of the basket calculation, especially on desktop, is proving to be far more complex (the "territory"). This model provides the lens to analyze the gap between perception and reality, which is the source of the team's current difficulties.
*   **Reference from file:** The `Description` highlights that representations of reality are "inherently a simplification and not reality itself." This directly applies to the project plan's failure to account for the complexity of fulfillment options. The `Thinking Steps`, such as "Seek Out the 'Territory'" and "Update Your Map," provide a clear path for analyzing the team's situation.

### 3. m32_bottlenecks.md

*   **Why it was chosen:** The conversation repeatedly highlights dependencies that are slowing down progress and creating uncertainty. The reliance on the CPMS endpoint for data, the need for UI components from the "PvP" team, and the dependency on design decisions from "Leo" are all classic examples of system bottlenecks. This model provides a framework to identify these constraints, analyze their impact, and formulate recommendations to manage them effectively.
*   **Reference from file:** The model's `Description` defines a bottleneck as a "choke point in a system that limits flow and determines the system's overall capacity." This is precisely what the external dependencies are doing to the project. The `Keywords for Situations` like "process optimization," "project management," and "workflow efficiency" align perfectly with the context of the problem.
