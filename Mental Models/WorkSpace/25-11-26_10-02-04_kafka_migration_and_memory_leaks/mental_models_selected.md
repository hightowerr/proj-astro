# Mental Model Selection Report

This document outlines the selection and ranking of mental models chosen to analyze the Kafka migration and system stability problem.

## Selection Funnel Summary

From an initial scan of all mental models across categories like Systems Thinking, General, and Warfare, a candidate list of 6 potentially relevant models was created. After a deep-dive evaluation of the top contenders against the specific problem diagnosis (including the zero-downtime requirement, the two-front nature of the problem, and the need for risk mitigation), the final 3 models were selected for their complementary strengths.

---

## Final Ranked Selection

### 1. Two-Front War (`m73_two_front_war.md`)

*   **Rationale for Selection:** The user is explicitly facing two major, distinct challenges: fixing a critical memory leak ("Front 1") and executing a complex Kafka migration ("Front 2"). This model directly addresses the core strategic dilemma of how to allocate limited resources, attention, and time between an urgent operational fire and an important, long-term architectural improvement. It forces a necessary prioritization conversation before diving into execution details.

### 2. Strangler Fig Pattern (`m0140_strangler_pattern.md`)

*   **Rationale for Selection:** This model provides the ideal technical execution strategy for the migration itself. The user's requirement for a **zero-downtime** migration involving dual-cluster operation is the textbook use case for the Strangler Pattern. Its step-by-step process of incrementally routing traffic to a new system while the old one remains operational directly mitigates the risk of a "big bang" cutover and aligns perfectly with the need for continuous stability.

### 3. Second-Order Thinking (`m05_second-order_thinking.md`)

*   **Rationale for Selection:** While the Strangler Pattern provides the "how," Second-Order Thinking provides the essential risk management framework for *each step*. The user's problem is fraught with hidden complexities (data inconsistency, race conditions, stakeholder anxiety). This model forces a deliberate analysis of the "and then what?" consequences for every decision made during the migration. It is crucial for anticipating and mitigating the unintended negative effects that could cause the instability the commercial team fears, especially given the lack of formal data consistency metrics.
