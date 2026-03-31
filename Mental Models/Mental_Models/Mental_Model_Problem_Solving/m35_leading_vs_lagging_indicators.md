---
model: "Leading vs. Lagging Indicators"
category: ["Problem Solving"]
detectors: ["KPI definition", "metric selection", "OKRs", "feedback loops", "product strategy", "performance management"]
triggers: ["Metrics arriving too late", "Focusing on revenue without influence", "Need for predictive signals"]
failure_modes: ["False Correlatives", "Reporting Up"]
aliases: ["Input vs Output Metrics", "Predictive Metrics"]
core_mechanics: ["Causal modeling", "Feedback loops", "Predictive analytics", "Time-horizon shifting"]
---

## Mental Model = Leading vs. Lagging Indicators

**Category = Problem Solving**
**Description:**
This model distinguishes between two types of metrics used to measure performance. **Lagging Indicators** measure output or results that have already happened (e.g., revenue, retention rate, quarterly profit). They are accurate but hard to influence directly because the data arrives too late to change the course. **Leading Indicators** measure activities or behaviors that are predictive of future results (e.g., daily active users, customer satisfaction scores, "dog likes the food"). Product teams need to identify and focus on leading indicators (Product Outcomes) that they can influence immediately, which in turn drive the business's lagging indicators (Business Outcomes).

**When to Avoid (or Use with Caution):**
- **False Correlatives:** Be careful not to pick a leading indicator just because it's easy to measure (the "Streetlight Effect"). It *must* have a plausible causal link to the lagging indicator. If you optimize for "page views" (leading) but it doesn't actually drive "ad revenue" (lagging), you are optimizing the wrong thing.
- **Reporting Up:** Executives and investors usually care about lagging indicators (the results). When communicating with them, translate your leading indicator progress into projected impact on their lagging indicators.

**Keywords for Situations:**
KPI definition, metric selection, OKRs, feedback loops, product strategy, performance management.

**Thinking Steps:**
1.  **Identify the Lagging Indicator (Business Outcome):** What is the ultimate measure of health for the business? (e.g., "90-day retention").
2.  **Analyze the Feedback Loop:** Recognize that this metric is too slow to guide daily work. By the time you see it drop, it's too late.
3.  **Hypothesize Precursors:** Ask, "What customer behaviors or conditions *precede* a positive result?" (e.g., "If the dog eats the food enthusiastically in the first week, the owner is likely to retain subscription").
4.  **Select a Leading Indicator (Product Outcome):** Choose a metric based on that precursor behavior that the team can influence *now* (e.g., "Percent of customers reporting 'dog finished bowl' in week 1").
5.  **Validate the Link:** continuously test if moving the leading indicator actually drives the lagging indicator. If the correlation breaks, find a new leading indicator.

**Coaching Questions:**
- "By the time we get this data, will it be too late to do anything about it?"
- "What is the very first sign that a customer is becoming successful with our product?"
- "Are we focusing on a metric we can actually change this sprint, or one we just hope goes up?"
- "Do we have evidence that this leading behavior actually predicts the business result?"