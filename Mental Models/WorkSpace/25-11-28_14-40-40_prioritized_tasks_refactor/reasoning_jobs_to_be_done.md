# Analysis using Jobs To Be Done (JTBD)

This document applies the JTBD model to the "Your Prioritized Tasks" feature refactor, using the `problem_diagnosis.md` as the source of evidence for user struggles.

## 1. Spot the Struggle
The user's description reveals several struggles:
-   **Struggle of Focus:** Users are presented with a cluttered UI and a mix of high-value ("leveraged") and low-value ("neutral", "overhead") tasks. They struggle to know what to focus on.
-   **Struggle of Trust:** The AI agent's logic is unclear, and prioritization feels inconsistent, especially for manual tasks. Users struggle to trust that the list is genuinely the most important work they should be doing.
-   **Struggle of Efficiency:** The "Quick Wins" filter is broken, and managing the list is difficult due to clutter. Users struggle to use the tool efficiently to achieve their goals.

## 2. Map the Circumstances
-   **When:** A user has just uploaded or reviewed a set of documents and is now ready to act on them. Or, a user wants to add a manual task and have it contextualized within their existing work.
-   **Where:** On a desktop or mobile device. The mobile context is particularly painful due to the lack of a mobile-first design.
-   **Who:** A user who is trying to be productive and achieve a specific goal, relying on this feature to guide their actions.

## 3. Elicit Desired Progress & Draft Job Stories
Based on the struggles, we can draft a primary Job Story for this feature.

-   **Primary Job Story:**
    > **When** I feel overwhelmed by a large amount of information and potential tasks,
    > **I want to** see a single, focused, and trustworthy list of my most important next actions,
    - **so I can** confidently apply my limited time and energy to what truly matters and make tangible progress toward my goal.

-   **Secondary Job Stories:**
    > **When** new information comes in (from documents or manual entry),
    > **I want to** seamlessly integrate it into my existing priorities without losing my place,
    > **so I can** maintain momentum and trust that my plan is always up-to-date.

    > **When** I review my task list on any device,
    > **I want to** have a clear and simple view optimized for that device,
    > **so I can** quickly get my bearings and take action from anywhere.

## 4. Widen the Competitive Set
What do users "hire" instead of this feature?
-   **Pen and Paper / Simple To-Do App:** A simple, manually curated list. This is a low-friction competitor that offers high control.
-   **Ignoring the feature entirely:** Simply reading the source documents and using their own intuition to decide what to do next. This is the "do nothing" competitor.
-   **A competitor's product:** Another tool that offers similar AI-driven task prioritization.

## Conclusion for this Model
The JTBD analysis reframes the problem. The goal is not to "fix the clutter" or "fix the filter." The goal is to **hire our feature to solve the user's struggle of being overwhelmed and to provide confident guidance.**

This leads to a clear design hierarchy:
1.  **Trust is paramount.** The rationale for prioritization must be clear and consistent.
2.  **Focus is the core value.** The UI must be ruthlessly simplified to present only the most important information that helps the user make their next decision.
3.  **Efficiency is secondary.** Features like filtering and task management are only valuable once the user trusts the list and can focus on the tasks.

This provides a strong foundation for using the next model, Chekhov's Gun, to decide what elements in the current UI are essential and which can be removed.
