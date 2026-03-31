# Reasoning using Bottlenecks

This document applies the "Bottlenecks" mental model (also known as the Theory of Constraints) to analyze the workflow and dependencies in the Argos Pay implementation project.

## Step 1: Map the Process Flow

The high-level process flow for the front-end team to deliver a feature like Argos Pay can be visualized as:

1.  **Define Requirements:** Receive and clarify the feature requirements (the "handover document").
2.  **Get Dependencies:** Receive necessary inputs from other teams:
    *   UI/UX designs (from Design/Leo).
    *   Data and endpoints (from Backend/CPMS).
    *   Reusable components (from PvP team).
3.  **Develop Feature:** Write the front-end code to implement the feature.
4.  **Test & QA:** Test the feature to ensure it works as expected.
5.  **Release:** Deploy the feature to production.

## Step 2: Identify the Constraint(s)

The transcript makes it clear that the current bottleneck is **not** in the "Develop Feature" step for the known UI work. The team seems confident in their ability to execute the simple UI changes.

Instead, the work is piling up at **Step 2: Get Dependencies**. The entire project is constrained by a lack of critical inputs from other teams. These are the primary bottlenecks:

1.  **Decision Bottleneck (Design/Leo):** The most critical bottleneck is the unresolved UX for the desktop view. The team cannot proceed with a solution until a decision is made on how to handle the multiple potential basket totals.
    *   **Evidence:** "we need to think about this then from a design perspective what we want to do because it's not super clear"
    *   **Evidence:** "what do we do for desktop 'cause we we have this this use case we need to think about"

2.  **Technical Dependency Bottleneck (Backend/CPMS):** The feature is entirely dependent on receiving the correct data from the CPMS endpoint. The exact mechanism for this (e.g., passing fulfillment type) is not yet defined or confirmed.
    *   **Evidence:** "can we go ahead and and like is the CPMS endpoint setup and what's needed to to get that text"
    *   **Evidence:** "I'm guessing we have to pass information to CPMS like probably like the basket contents or some put in to reply with the required text"

3.  **Component Dependency Bottleneck (PvP Team):** The side-drawer implementation is blocked waiting for components from another team. While seen as less complex, it's still a dependency that constrains the workflow.
    *   **Evidence:** "the components...is being built by shaban is team PvP...they're not filling the drawer itself but the individual components"

## Step 3: Exploit the Bottleneck

"Exploiting the bottleneck" means ensuring that the limited time and attention of the constraining resource are used with maximum effectiveness.

*   **For the Decision Bottleneck (Leo):** The team must ensure that when they get time with Leo, the problem is presented with extreme clarity so a decision can be made efficiently. The person in the transcript is already doing this by preparing to "flag this with design on the mall ahead of the call so that's part of the agenda". This is a perfect example of exploiting the bottleneck.
*   **For the Technical/Component Bottlenecks:** The team needs to provide the other teams (CPMS, PvP) with crystal-clear requirements and use cases (especially the newly discovered desktop issue) so that those teams can work efficiently on their side.

## Step 4: Subordinate Everything Else

The rest of the system should move at the pace of the bottleneck.

*   The front-end team should **not** build a complex, speculative solution for the desktop view before the UX is decided and the backend capabilities are known. Doing so would be "going faster than the bottleneck" and would likely result in rework (waste).
*   However, the team **can** work on the "known, independent UI work" that is not blocked by these dependencies (e.g., removing the old Argos Card banner). This is a valid way to use available capacity without getting ahead of the bottleneck. The transcript identifies this: "the bits are basket very basic I'd say".

## Step 5: Elevate the Bottleneck

If exploiting and subordinating are not enough, the team must find ways to increase the capacity of the bottleneck.

*   **Elevating the Decision Bottleneck:** This could involve scheduling a dedicated workshop specifically to solve the desktop UX problem, rather than trying to resolve it in a regular meeting. It might also mean escalating the issue to get a faster decision if Leo is unavailable.
*   **Elevating the Technical Bottleneck:** This could involve the front-end team offering to help the backend team by providing a clear contract or even pair-programming on the API definition to speed up the process.

## Conclusion from this Model

The Theory of Constraints shows that the team's focus should not be on "how fast can we code?", but on **"how can we unblock our dependencies?"**. The highest priority for the project's success is to resolve the decision and technical bottlenecks related to the desktop basket calculation. All other work is secondary. The project's timeline is entirely dictated by the speed at which these external dependencies can be resolved.
