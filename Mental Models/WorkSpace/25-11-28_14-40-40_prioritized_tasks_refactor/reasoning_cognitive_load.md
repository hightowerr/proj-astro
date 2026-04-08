# Analysis using Cognitive Load

This document applies the Cognitive Load model to the "Your Prioritized Tasks" feature, explaining *why* the current design is failing and providing clear principles for the refactor.

## 1. Sources of Cognitive Load in the Current Design
The `problem_diagnosis.md` points to several sources of high cognitive load:

-   **Excess Options & Information (The 5-Column Table):** The primary source of load. A 5-column table forces the user to process multiple, competing data points for every single task. This visual and informational clutter makes it difficult to perform the main goal: identify and act on the top priority.
-   **Novelty & Inconsistency (AI vs. Manual Tasks):** The inconsistent labeling for different task types violates a key principle of usability. The user's brain has to spend mental energy understanding *why* these tasks look different, which is effort stolen from the actual work.
-   **Lack of Clear Hierarchy:** The cluttered view means there is no clear visual hierarchy. The user's attention is pulled in multiple directions, with no signal as to what is most important. The "movement indicators," "dependencies," and various "labels" all compete for attention with the task title itself.
-   **Sub-optimal Mobile Experience:** A design that is not mobile-first forces users on small screens to deal with misformatted text, horizontal scrolling, or tiny touch targets, all of which dramatically increase cognitive load.

## 2. Applying Thinking Steps to Reduce Cognitive Load

Here's how the thinking steps from the `Cognitive Load` model can be applied to create a better design:

1.  **Define the user’s immediate goal:** The goal is to see the *next* task and decide whether to act on it. Everything else should be removed or deferred.
    -   **Action:** The primary view for a task should contain only the task title and the actions (Done/Discard).

2.  **Choose familiar patterns:** A simple, clean list is the most familiar pattern for a set of tasks.
    -   **Action:** Replace the 5-column table with a single-column vertical list.

3.  **Minimize choices (Progressive Disclosure):** Users don't need to see all information about all tasks at all times.
    -   **Action:** Move all secondary information (dependencies, detailed rationale, history, etc.) into the side drawer. The primary list view should be for triage; the side drawer is for deep investigation. This is a core principle of progressive disclosure.

4.  **Tighten visual hierarchy:** Guide the user's eye to what matters most.
    -   **Action:** Use whitespace, typography, and alignment to make the task title the most prominent element. Action buttons (Done/Discard) should be clear but secondary. Any other indicators (like movement) should be subtle and not compete for attention.

5.  **Standardize:** All tasks, regardless of origin, must look and behave the same.
    -   **Action:** Create a single, standardized "task component" with a consistent design. This removes the cognitive load of interpreting different UI elements.

## Conclusion for this Model
The Cognitive Load model provides the scientific justification for the simplification proposed by the Chekhov's Gun model. The current design fails because it imposes a high cognitive load on the user, making it difficult to achieve their primary goal.

The key takeaway is to design for **recognition over recall**. The user should be able to instantly recognize their top priority without having to recall what different columns mean or why certain tasks look different. By moving to a simple, standardized list and using progressive disclosure (the side drawer), we can dramatically reduce the mental effort required to use the feature, making it more effective and less frustrating.
