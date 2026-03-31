# Problem Diagnosis: Your Prioritized Tasks Feature Refactor

## 1. Core Problem
The "Your Prioritized Tasks" feature, which is meant to provide users with a clear, AI-driven list of actions, is failing in its core mission. It is cluttered, confusing, and contains inconsistent behavior, which undermines user trust and prevents them from efficiently acting on the most important tasks.

## 2. Key Issues & Symptoms

### A. User Experience & Interface (UI/UX)
*   **Clutter:** The primary task list is a 5-column table that is visually overwhelming.
*   **Lack of Focus:** Essential information (the task itself, dependencies, recent movements) is obscured by non-essential data.
*   **Poor Mobile Experience:** The design is not mobile-first, leading to a misformatted and unfocused experience on smaller devices.
*   **Ineffective Side Drawer:** A side drawer exists but is not being used effectively to store secondary information, contributing to the main screen's clutter.

### B. Functionality & Logic
*   **Filter Bug:** The "Quick Wins" sort/filter does not function as expected.
*   **Inconsistent Prioritization:** Manually added tasks are not prioritized by the same AI logic as document-generated tasks, leading to inconsistent user experience and frustration.
*   **Lack of Standardization:** Manually added tasks have different labels and formats compared to AI-generated tasks.

### C. Agent & System Behavior
*   **Poor Rationale:** The AI agents do not provide a strong rationale for why tasks are prioritized in a specific order, eroding user trust in the system.
*   **Lack of Persistence:** The system does not properly handle the state of tasks when they are reprioritized, creating a risk that users lose the context of their previous work.
*   **Suboptimal Task Lifecycle:** The process for re-introducing discarded or "done" tasks is not intelligent. It doesn't account for whether the context has changed since the task was last active.

### D. Strategic & Scope Issues
*   **Questionable "Locking" Feature:** A feature exists to lock tasks in place, which adds complexity and may conflict with the goal of an agile, prioritized list, especially for an MVP.
*   **Lack of Task Focus:** The list contains a mix of "leveraged," "neutral," and "overhead" tasks, diluting the feature's purpose of focusing the user on what matters most.

## 3. Desired Outcome
To refactor the feature into a clean, mobile-first, and intuitive tool that:
1.  Presents a focused list of the most important, leveraged tasks.
2.  Provides clear, trustworthy rationale and context for prioritization.
3.  Has a simple, effective UI with a clear information hierarchy.
4.  Behaves consistently and intelligently across all task types and lifecycle states.
