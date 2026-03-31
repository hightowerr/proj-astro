---
model: Nonpredictive Decision-Making (Fragility-First)
category: ["Systems Thinking", "Risk"]
detectors:
  - Forecasts are demanded in domains where rare events dominate outcomes
  - Planning depends on precise prediction of complex system behavior
  - Risk is treated as measurable when the distribution is unknown
triggers:
  - Strategy and planning under uncertainty
  - Risk management outside of casino-like domains
  - Policy and product decisions with asymmetric tail consequences
failure_modes:
  - Confusing scenario generation with prediction accuracy
  - Optimizing for a forecast and increasing fragility to model error
  - Ignoring that it’s easier to detect fragility than to predict shocks
aliases:
  - Fragility-First Strategy
  - Nonforecasting Approach
core_mechanics:
  - It is easier to detect what is fragile than to forecast the shock that breaks it
  - Focus on exposure asymmetry and removing ruin risks rather than predicting events
  - Use optionality, redundancy, and via negativa to perform well across unknown futures
---

### Description

Nonpredictive decision-making is an approach to acting under uncertainty that prioritizes fragility detection and exposure control over forecasting. Instead of trying to predict rare events, you identify what would be harmed by volatility and reduce that exposure, while building structures that can benefit from positive surprises.

---

### When to Avoid (or Use with Caution)

- When you’re in a stable, well-modeled domain and prediction is genuinely reliable.
- When refusing to forecast prevents basic coordination; in that case, forecast modestly but design robustly.

---

### Keywords for Situations

Uncertainty, Black Swans, fragility detection, exposure, optionality, redundancy, robustness, via negativa.

---

### Thinking Steps

1. **Refuse false precision**
   Treat point forecasts as fragile in complex systems; use them only for rough coordination.
2. **Identify fragilities**
   Ask what breaks under volatility, error, and time—and what can’t self-repair.
3. **Remove ruin exposures**
   Subtract leverage, tight coupling, single points of failure, and iatrogenic interventions.
4. **Build optionality**
   Add small bets with bounded downside and large upside; create reversibility and choice.
5. **Use time as a filter**
   Prefer Lindy-tested tools/practices when failure is expensive.
6. **Rehearse extreme scenarios**
   Not to predict them, but to ensure survivability and to identify hidden fragility.

---

### Coaching Questions

- What is the easiest fragility to remove without knowing the future?
- If the forecast is wrong, where do we get ruined?
- What changes would make us robust across many possible futures?
- Where can we add optionality cheaply?

