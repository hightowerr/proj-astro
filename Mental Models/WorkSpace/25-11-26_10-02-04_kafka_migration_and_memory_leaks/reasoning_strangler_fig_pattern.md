# Analysis using the Strangler Fig Pattern Mental Model

This document provides a tactical plan for the Kafka migration by applying the Strangler Fig Pattern. This pattern is the technical blueprint for achieving the zero-downtime requirement.

---

### Step 1: Find the Seams (The Interception Point)

The success of this pattern depends on finding a clean "seam" where you can intercept messages without modifying the legacy system. Given the architecture involves multiple services (basket orchestration, command processor, calculation), the ideal seam is a single point through which all relevant Kafka messages flow.

*   **Proposal:** Implement a **Routing Service** (or an "Anti-Corruption Layer Proxy"). This service's sole job is to receive all incoming events/messages that would normally go to the on-premise Kafka. It then decides, based on configuration, where to send that message: to the old Kafka, the new Confluent Kafka, or both. All message producers will now publish to this single routing service instead of directly to a Kafka cluster.

### Step 2: Choose the First Slice (The First Battle)

Do not attempt to migrate everything at once. Select a single, low-risk, well-understood message type to be the first "slice" to be strangled.

*   **Criteria for the first slice:**
    *   **Low Business Impact:** Choose a message that, if processed incorrectly, would have minimal impact on users (e.g., an analytics event, not an "add to basket" command).
    *   **Idempotent:** The operation should be safely repeatable. This is crucial for initial testing where you might send the message to both systems.
    *   **Well-Understood:** The team should have high confidence in their understanding of the message's schema and processing logic.

### Step 3: Stand Up the New Capability (The New Service)

Build the new consumer service that will run on the Confluent Kafka cluster. This service should be built and deployed independently of the legacy system. It will subscribe to the topic on Confluent that corresponds to the "first slice" message type.

### Step 4: Intercept and Route (The Strangulation)

This is the core of the migration, executed in careful, controlled phases.

*   **Phase A: Shadow Mode (Mirroring).** Configure the Routing Service to send the "first slice" message to **both** the old Kafka cluster and the new Confluent cluster. The legacy system continues to be the source of truth, but this allows you to compare the outcomes, performance, and behavior of the new service in a live environment with zero risk to production data.
*   **Phase B: Canary Release.** Once you are confident in the new service's correctness from Shadow Mode, configure the Routing Service to send a small fraction (e.g., 1%) of the "first slice" messages **only** to the new Confluent cluster. The remaining 99% continue to go to the old system.
*   **Phase C: Incremental Ramp-Up.** Gradually increase the percentage of traffic being routed to the new system: 1% -> 10% -> 50% -> 100%. This must be governed by the risk management metrics defined via Second-Order Thinking (the next model).

### Step 5: Keep the Experience Seamless (Maintain the Contract)

For the backend, "seamless" means the consumers of the data being written by these processes see no difference. This is where the lack of data consistency metrics is a major risk. Before starting the strangulation, you must **define and implement** metrics that can verify data integrity. For instance, if a message updates a user's basket, you need a way to check that the basket is in the correct state regardless of which system processed the message.

### Step 6: De-risk with Flags and Canaries (The Safety Net)

The entire routing logic must be controlled by **feature flags**.

*   **Global Kill Switch:** You must have a single "kill switch" that can instantly redirect 100% of traffic back to the old on-premise Kafka system if a major issue is detected.
*   **Per-Slice Granularity:** The routing percentage for each message type should be independently configurable.

This safety net is non-negotiable for a zero-downtime migration and is what allows the team to move forward with confidence.

### Step 7: Retire What You've Replaced (Celebrate the Win)

Once a message slice is 100% migrated to Confluent and has been running stably for a defined period, the final step is to **retire the legacy code**. This involves:
1.  Deleting the old consumer logic for that message type from the legacy system.
2.  Removing the corresponding topic from the on-premise Kafka cluster.
3.  Removing the routing logic for that slice from the Routing Service (it now just passes through to Confluent).

This step is critical as it simplifies the system, provides a clear measure of progress, and directly contributes to the goal of "faster development cycles" by reducing cognitive overhead. Then, you repeat the entire process for the next slice.
