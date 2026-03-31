# Analysis using Mental Model: Trade-Offs

This document applies the Trade-Offs & Opportunity Cost mental model to the promo code implementation decision.

### 1. Core Decision

Which implementation strategy should be chosen for the promo code feature to ensure a successful Q4 launch?

### 2. Viable Options

*   **Option A: The Simple Path (Stateless Implementation)**
    *   **Description:** A minimal, web-first implementation. Promo codes are cleared whenever the basket is modified, requiring the user to re-apply them. The system does not remember applied codes between sessions or across devices.
    *   **Evidence from transcript:** This is the path the team was leaning towards, prioritizing speed and simplicity. *"We want to keep it simple and just kind of get get it and do it."*

*   **Option B: The Robust Path (Stateful Implementation)**
    *   **Description:** A more complex implementation where the system persists the state of applied promo codes through basket changes and potentially across sessions/devices. This would require significant backend changes.
    *   **Evidence from transcript:** This was discussed as a future possibility but deemed too complex for the immediate timeline. *"Possible now or maybe tactical solution would say that you know we might need to take our design out we have done it for item and quantity..."*

### 3. Gains of Each Option

*   **Gains of Option A (The Simple Path):**
    *   **Speed to Market:** High probability of delivering the feature for the Q4 holiday season.
    *   **Lower Technical Risk:** Simpler logic reduces the risk of critical bugs.
    *   **Lower Development Cost:** Requires fewer engineering resources.

*   **Gains of Option B (The Robust Path):**
    *   **Superior User Experience:** A seamless, less frustrating journey for the user.
    *   **Solid Foundation:** Builds the correct architecture for future enhancements like cross-device syncing.
    *   **Reduced User Confusion:** Avoids the negative experience of codes "disappearing."

### 4. Opportunity Cost of Each Option

*   **Opportunity Cost of Choosing Option A:**
    *   You are giving up a **better user experience**. The trade-off is accepting a clunkier, more frustrating journey for some users in exchange for speed.
    *   You are giving up on building the **right long-term foundation** now. This work will need to be done later, incurring future costs.

*   **Opportunity Cost of Choosing Option B:**
    *   You are giving up the **certainty of a Q4 launch**. The biggest cost is missing the target deadline, which appears to be the primary business driver.
    *   You are giving up **engineering resources** that could be allocated to other valuable features.

### 5. Alignment with Priorities

The discussion in the transcript strongly indicates that the primary, overriding priority is **launching the feature in Q4**. The team is willing to sacrifice a perfect user experience to meet this deadline.

*   **Option A** directly serves the top priorities of **speed** and **risk reduction**.
*   **Option B** serves the lower-priority goal of a **perfect user experience** at the expense of the primary goal.

### 6. Deliberate Choice

Based on this analysis, the deliberate choice is **Option A: The Simple Path**. This choice consciously accepts the negative user experience trade-offs as a necessary cost to achieve the primary business objective of a Q4 launch.
