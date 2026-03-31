# Reasoning via Incentives

This document applies the Incentives mental model to the problem of securing architectural support for the DPMS migration.

## 1. Desired Outcome

The architecture team actively supports and prioritizes the DPMS migration.

## 2. Analysis of Architects' Incentives

Based on the problem diagnosis, the architecture team is incentivized to:

*   **Achieve:** Cost reduction, increased efficiency, and the elimination of redundancy.
*   **Avoid:** System instability, budget overruns, increased complexity, and negative impacts on customer experience.

Their performance is likely measured on the stability, scalability, and cost-effectiveness of the overall system architecture. They are rewarded for simplification and punished for creating future problems.

## 3. Mapping the Migration to Their Incentives

We must frame the DPMS migration as a direct path to achieving their goals. The migration is not a "nice to have" for the Basket team; it is a direct solution to problems the architects are incentivized to solve.

| Architect's Incentive | How the DPMS Migration Delivers on the Incentive | Argument to Make |
| :--- | :--- | :--- |
| **Cost Reduction** | The current system causes expensive problems. Fixing data issues from the wrong system (as seen in the A/B test) requires significant, unplanned engineering hours. A single source of truth reduces this waste. | "The current data sourcing for promotions is creating unplanned work and wasting engineering budget. This migration will pay for itself by eliminating the root cause of these expensive data-related fire drills." |
| **Efficiency** | Using the wrong system for promo data is inherently inefficient. It creates downstream work, requires data massaging, and leads to errors. The migration moves this workload to a system designed for it, increasing overall system efficiency. | "We can increase the efficiency of the entire promotional data flow by moving it to the system purpose-built for it. This removes a major point of friction and potential error in the current architecture." |
| **Eliminating Redundancy** | The current setup represents a redundant, improper use of a system. The migration consolidates this logic into a single, correct place, thereby eliminating this architectural redundancy. | "This migration allows us to decommission a redundant and improper data pathway, simplifying the architecture and adhering to the principle of having a single source of truth." |

## 4. Stress-Testing and Mitigating Negative Perceptions

We must also address how the migration could be perceived as *conflicting* with their incentives:

*   **Perceived Risk:** They might see it as a risky project that could *increase* instability or costs.
    *   **Mitigation:** We must present a clear, phased migration plan that minimizes disruption. We should proactively address the risks we identified via Inversion and show we have a plan to manage them.
*   **Perceived Workload:** They might see it as *more work* for them.
    *   **Mitigation:** We should frame this as an investment that *reduces* their future workload by eliminating a recurring source of problems. We should also come prepared with a high-level plan, showing that we have done our homework and are not just handing them a problem.

By framing the migration through the lens of their incentives, we change the conversation from "Please do this for us" to "Here is an opportunity to advance your architectural goals."
