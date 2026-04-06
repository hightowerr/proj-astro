# Reasoning with Leverage

Applying the principle of Leverage helps identify the most effective point of intervention to solve the order summary problem with the least amount of effort for the greatest impact.

## 1. Identifying the System's Fulcrum

The fulcrum, or the point of highest leverage, is the moment the system captures the user's fulfillment intent. As identified in the Bottleneck analysis, this is the single point that dictates the accuracy of all downstream calculations and displays. A small change at this point can have a disproportionately large effect on the entire system.

## 2. Desired Outcome

The primary goal is to achieve **100% accuracy** in the order summary and related upsell offers, thereby reducing user confusion and ensuring business logic is correctly applied.

## 3. Brainstorming Levers

We can apply force at several points in the system, but each offers different leverage:

*   **High-Leverage Action: Modify the UI/UX.**
    *   **Description:** Change the desktop design to guide the user into selecting a fulfillment preference *before* the summary is calculated. This could be a simple radio button or a more integrated design element.
    *   **Why it's high leverage:** This single change solves the core information problem at its root. It simplifies the logic for every other part of the system (frontend, backend, upsell messaging), turning a complex, ambiguous state into a simple, known one.

*   **Medium-Leverage Action: Enhance the Backend API.**
    *   **Description:** Modify the backend to perform calculations for all possible fulfillment scenarios and return a comprehensive data object to the frontend.
    *   **Why it's medium leverage:** This provides the frontend with the necessary data, which is a significant improvement. However, it doesn't solve the entire problem. It transfers the complexity to the UI, which must now be designed to present this multi-faceted information clearly, and the frontend must handle the more complex data structure.

*   **Low-Leverage Action: Build Complex Frontend Logic.**
    *   **Description:** Keep the UI and backend as they are, and build a complex logic layer in the frontend to manage the ambiguity, make multiple calls, and attempt to reconcile the data.
    *   **Why it's low leverage:** This is working *around* the problem, not solving it. It leads to brittle, hard-to-maintain code that is prone to errors, directly contradicting the goal of 100% accuracy. It is the equivalent of trying to lift a heavy weight with no lever at all.

## 4. Assessing the Options

The highest-leverage action is to **change the UI**. While it requires design resources, it provides the most significant simplification and has the highest probability of achieving the 100% accuracy goal. It turns a difficult, multi-path problem into a simple, single-path problem.

The backend enhancement is a viable but less powerful alternative. It solves the data-access problem but creates a new UI/UX challenge.

## 5. Conclusion

To achieve the desired outcome most effectively, the team should focus its efforts on the point of maximum leverage: the user's initial interaction with the fulfillment options on the desktop page. A small, strategic change to the user experience at this stage will provide the clarity needed to simplify the entire downstream process.
