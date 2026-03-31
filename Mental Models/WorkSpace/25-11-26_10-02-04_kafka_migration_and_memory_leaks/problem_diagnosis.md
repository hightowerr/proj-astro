# Problem Diagnosis

Backend engineers need to resolve current memory leak issues and migrate from on-premise Kafka to Confluent Kafka while maintaining system stability during high-traffic periods, but they face risks of data inconsistency, race conditions, and service disruptions due to the complexity of supporting dual-mode operation across multiple services, all while working within partition and deployment constraints that require extensive testing and business justification before the next peak season.

---

## Questionnaire Summary & Key Insights

The primary goal of the migration is to **simplify deployments** and achieve **faster development cycles**. The memory leak issue is a separate, parallel concern.

The migration is constrained by a **zero-downtime** requirement and the commercial team's primary concern for **system stability**, especially during peak traffic periods.

A critical risk is that there are currently **no formal metrics for measuring data consistency**, which is a major concern during the dual-operation phase.

### Detailed Q&A

**1. What is the primary driver for this migration?**
> To simplify deployments. The memory leak is a separate issue.

**2. What is the acceptable level of risk regarding service disruption?**
> Zero-downtime.

**3. How is data consistency currently measured?**
> No.

**4. Who are the key stakeholders and their concerns?**
> Commercial team - concern around stability, especially during really busy periods.

**5. What does success look like in one year (Top KPI)?**
> Faster development cycles.