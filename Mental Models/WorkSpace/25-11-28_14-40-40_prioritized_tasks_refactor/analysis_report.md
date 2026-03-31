# Analysis Report: Refactoring "Your Prioritized Tasks"

## Executive Summary
The "Your Prioritized Tasks" feature is failing to deliver on its core promise. Instead of providing clear guidance, it presents a cluttered, confusing, and untrustworthy interface that overwhelms users. Our analysis, based on a latticework of mental models, concludes that the feature's primary "job" is to help users overcome being overwhelmed and confidently decide on their next action. The current design fails at this job because it creates high **Cognitive Load** and is filled with elements that, like a gun in a play that never fires (**Chekhov's Gun**), do not serve the main plot.

The recommendation is to ruthlessly simplify the feature by:
1.  **Redesigning the UI:** Replace the cluttered 5-column table with a simple, mobile-first, single-column list that focuses only on the task itself and essential actions.
2.  **Applying a "One Job" Focus:** Move all secondary information (dependencies, history, detailed rationale) to the side drawer, ensuring the primary view is dedicated exclusively to the core "Job To Be Done".
3.  **Standardizing All Logic:** Ensure all tasks, whether AI-generated or manual, are treated and prioritized identically to build user trust.

## Problem Statement
The "Your Prioritized Tasks" feature suffers from a range of issues that prevent it from being an effective tool. The UI is a cluttered 5-column table that is not mobile-friendly and overwhelms users with information. The underlying logic is inconsistent, treating manually-added tasks differently from AI-generated ones and featuring a broken "Quick Wins" filter. The AI agents provide weak rationale, and the task lifecycle is not intelligently managed, eroding user trust and creating a frustrating experience.

## Individual Model Analysis

### 1. Jobs To Be Done (JTBD)
- **Rationale:** To understand the user's fundamental motivation for using this feature.
- **Analysis & Findings:** The primary "job" a user hires this feature for is: "When I feel overwhelmed by information, I want a single, focused, and trustworthy list of my next actions, so I can confidently make progress." This reframes the goal from "showing tasks" to "providing confident guidance." It establishes that **Trust** and **Focus** are the core value propositions, not the quantity of information.

### 2. Chekhov's Gun
- **Rationale:** To provide a principle for ruthless simplification of the cluttered UI.
- **Analysis & Findings:** This model treats every UI element as a "gun on the wall" that must "fire" to justify its existence. The analysis concludes that the 5-column table, inconsistent labels, and extraneous information (like dependencies in the main view) are all "guns" that never fire—they do not help the user achieve their core job. This justifies their removal from the primary view in favor of a clean, focused list.

### 3. Cognitive Load
- **Rationale:** To provide the scientific reasoning for *why* the clutter is a problem.
- **Analysis & Findings:** The current design imposes a high cognitive load on users through an excess of options, inconsistent patterns, and a lack of clear visual hierarchy. This directly hinders the user's ability to complete their "job." The recommendation is to reduce this load by using familiar patterns (a simple list) and progressive disclosure (moving details to the side drawer).

## Synthesis & Integrated Insights
The three models provide a powerful, unified strategy for the refactor:

1.  **Jobs To Be Done** provides the **Core Mission**: We must solve the user's struggle of being overwhelmed by providing confident guidance.
2.  **Chekhov's Gun** provides the **Strategic Principle**: To achieve this mission, we must ruthlessly remove every element that does not directly contribute to it.
3.  **Cognitive Load** provides the **Design Heuristics**: We achieve this by creating a simple, standardized interface with a clear hierarchy that minimizes mental effort.

The integrated insight is that the feature is failing because it attempts to do too many jobs at once, creating a high-cognitive-load experience where nothing is important. The solution is to focus single-mindedly on the primary "Job To Be Done" and to subordinate all design and functional decisions to that single purpose.

## Actionable Recommendations

### UI/UX Refactor (High Priority)
1.  **Replace the Table with a List:** Immediately deprecate the 5-column table in favor of a clean, single-column, mobile-first list view.
2.  **Define the "Essential Task" Component:** The primary view of a task must only contain the task title and clear actions (e.g., "Done," "Discard").
3.  **Leverage the Side Drawer:** Move all secondary information—dependencies, prioritization rationale, task history, labels—into the side drawer, accessible via a clear and consistent entry point from each task.
4.  **Remove the "Locking" Feature (for MVP):** Defer this complex, low-value feature to simplify the initial refactor.

### Backend & Logic Refactor (High Priority)
1.  **Standardize the Task Pipeline:** Refactor the agent logic to ensure all tasks, regardless of their source (AI or manual), are processed through the exact same prioritization, labeling, and display pipeline.
2.  **Improve Prioritization Rationale:** The agent must provide a clear, concise, and human-readable rationale for *why* a task is ranked where it is. This is critical for building trust and should be visible in the side drawer.
3.  **Fix the "Quick Wins" Filter:** This is a basic functionality bug that must be addressed.

### Process & Strategy
1.  **Adopt a Mobile-First Mindset:** All future design and development for this feature must start with the mobile experience.
2.  **Focus on "Leveraged" Tasks:** The default view should be opinionated, showing only what the agent determines to be the most "leveraged" tasks. Filters can allow users to see "neutral" or "overhead" tasks if needed, but they should not be the default.
