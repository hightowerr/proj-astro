---
model: Fundamental Asymmetry (Seneca’s Asymmetry)
category: ["Systems Thinking", "Risk"]
detectors:
  - Gains are capped but losses can be large or compounding
  - “Stability” is achieved by suppressing variability rather than by resilient design
  - You are unsure whether volatility helps or hurts you
triggers:
  - Evaluating strategies under uncertainty
  - Comparing options with different downside profiles
  - Designing incentives and exposures
failure_modes:
  - Judging by expected value while ignoring ruin and path dependence
  - Confusing “upside exists” with “upside exceeds downside”
  - Ignoring that removing volatility can harm systems that benefit from stressors
aliases:
  - Upside–Downside Asymmetry
core_mechanics:
  - Antifragility is favorable asymmetry: more upside than downside from randomness
  - Fragility is unfavorable asymmetry: more downside than upside from randomness
  - The practical test is exposure-based: compare potential gains vs potential losses under dispersion
---

### Description

Fundamental Asymmetry (also called Seneca’s Asymmetry) is the idea that antifragility and fragility reduce to how you are exposed to randomness: if potential gains exceed potential losses from volatility, you are antifragile; if losses exceed gains, you are fragile.

This shifts attention from predicting events to inspecting payoff shape and exposure.

---

### When to Avoid (or Use with Caution)

- When you cannot bound or even estimate the downside at all (treat as fragile by default).
- When you use asymmetry to justify taking hidden tail risks (“it’s probably fine”).

---

### Keywords for Situations

Asymmetry, payoff, exposure, volatility, upside vs downside, tail risk, ruin, convexity.

---

### Thinking Steps

1. **State the exposure**
   What variable can change (market moves, load, time, demand), and what does it do to outcomes?
2. **List bounded vs unbounded outcomes**
   Identify what is capped and what can compound or become irreversible.
3. **Compare upside and downside under variability**
   Under more dispersion, do outcomes improve on balance, or deteriorate?
4. **Classify**
   Favorable asymmetry ⇒ antifragile; unfavorable asymmetry ⇒ fragile; near-symmetric ⇒ robust/resilient.
5. **Shift the asymmetry**
   Reduce downside first (remove ruin), then increase upside (optionality, small convex bets).
6. **Re-check after interventions**
   Many “stabilizing” actions change the asymmetry by moving risk into the tail.

---

### Coaching Questions

- Where is the downside open-ended or irreversible?
- If volatility doubled, would we benefit or be harmed?
- What one change would reduce downside without needing to predict anything?
- What option-like exposure can we add that has bounded downside and meaningful upside?

