### Reasoning using Bottlenecks (Theory of Constraints)

**1. Map the Process Flow:**

The team's workflow can be visualized as two competing process flows:

*   **Planned Work:** `Roadmap -> Grooming -> Development -> Release -> Value Delivered`
*   **Unplanned Work:** `Incident Occurs -> Firefighting -> Patch/Fix -> System Stabilizes (temporarily)`

These two flows compete for the same limited resource: developer capacity.

**2. Identify the Constraint:**

The primary constraint on the entire system is **unplanned work caused by system instability**.

*   **Evidence:** The user explicitly stated that **80% of the team's capacity is consumed by "unplanned work, incident response, and general 'firefighting'."**
*   **Effect:** This leaves only 20% of capacity for the "Planned Work" stream. Work piles up in the backlog, deadlines are threatened, and strategic projects (like the Next.js migration) are starved of resources. The system is choked.

**3. Exploit the Bottleneck:**

Exploiting the bottleneck means ensuring the resources allocated to it are used as effectively as possible. The "bottleneck" here is the instability itself, and the resource is the team's time spent on it.

*   **Action:** The team must dedicate focused, exclusive time to identifying and fixing the root cause of the memory leak and other stability issues. The current "change assurance" period, while painful, is the correct application of this step. The goal is to make the stability work so effective that it stops consuming 80% of the team's time.

**4. Subordinate Everything Else:**

The rest of the system must be paced to the speed of the constraint.

*   **Action:** With only 20% of capacity available for planned work, the team must be ruthless in subordination.
    *   **Stop Starting, Start Finishing:** Do not pull any new features or tasks from the backlog that are not directly related to either (a) fixing stability or (b) the absolute top priority project (Argos Pay).
    *   **Pace the work:** The "drumbeat" of the entire team's work is dictated by the 20% capacity. This means communicating to stakeholders that the rate of new feature delivery will be drastically slower until the bottleneck is addressed. The discussion in the transcript about "what can drop" is a form of subordination. The items identified (partial cancellations, wishlist sync) should be formally placed on hold.

**5. Elevate the Bottleneck:**

Once the immediate fires are out, the team must invest in increasing the capacity of the bottleneck, which means making the system more stable.

*   **Action:**
    *   **Prioritize Tech Debt Remediation:** The Next.js migration, while seen as a "developer experience" task, should be re-framed as a critical stability project. It is a primary candidate for elevating the bottleneck by replacing a legacy system that is likely a source of instability.
    *   **Invest in Tooling:** Prioritize work that improves observability, monitoring, and alerting to catch future issues before they become critical incidents. The "feature flag" work is also an elevation, as it de-risks future releases.
    *   **Secure Resources:** The "expansion plan" for the next financial year is the ultimate form of elevation—adding more capacity to the team.

**6. Repeat:**

After the system is stable and the "firefighting" drops from 80% to a manageable level (e.g., <20%), the bottleneck will shift. It might become front-end capacity, or the ability to groom tickets effectively. The team must then re-run this analysis to identify and manage the new constraint.
