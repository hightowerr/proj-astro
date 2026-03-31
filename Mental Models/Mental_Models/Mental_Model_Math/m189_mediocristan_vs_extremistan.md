---
model: Mediocristan vs. Extremistan
category: ["Math", "Risk"]
detectors:
  - You are using averages/variance in a domain dominated by rare extremes
  - A single observation can dominate the total outcome (hits, wealth, outages)
  - Forecast accuracy collapses when scale increases
triggers:
  - Choosing statistical tools and forecasting approaches
  - Risk management and policy in fat-tailed domains
  - Evaluating whether “normal distribution” assumptions are safe
failure_modes:
  - Treating Extremistan like Mediocristan (false comfort from averages)
  - Ignoring tail exposure while optimizing for typical cases
  - Applying fine-tuned optimization where robustness is needed
aliases:
  - Thin Tails vs Fat Tails
core_mechanics:
  - Mediocristan: no single observation meaningfully affects the aggregate
  - Extremistan: aggregates can be dominated by a single extreme observation
  - Strategy differs: in Extremistan, focus on tail exposure, optionality, and robustness
---

### Description

Mediocristan and Extremistan distinguish two randomness regimes. In Mediocristan, outcomes are dominated by the “average” and extremes don’t dominate totals (e.g., heights, many physical traits). In Extremistan, a single extreme can dominate the aggregate (e.g., wealth, book sales, many market outcomes). Mistaking Extremistan for Mediocristan is a primary cause of fragility.

---

### When to Avoid (or Use with Caution)

- When you treat the classification as binary; some domains are mixed or regime-dependent.
- When you assume a domain is safely Mediocristan because it looked stable historically.

---

### Keywords for Situations

Fat tails, power laws, rare events, aggregation, Black Swans, tail risk, robustness.

---

### Thinking Steps

1. **Classify the domain**
   Can one event dominate outcomes, or do extremes wash out in the aggregate?
2. **Choose the right tools**
   In Extremistan, distrust variance-based comfort; use stress tests and scenario thinking.
3. **Focus on tail exposure**
   Identify what happens in extreme cases and whether you can survive them.
4. **Prefer barbell/optionality**
   Keep a robust base; pursue upside with small, bounded bets.
5. **Avoid fragile optimization**
   Don’t fine-tune for typical cases if it increases exposure to rare catastrophic outcomes.

---

### Coaching Questions

- Could one event dominate the total outcome here?
- Are our metrics hiding tail risk by averaging?
- What happens if a rare extreme occurs—do we survive?
- How can we gain from extremes while limiting downside?

