---
model: Ludic Fallacy
category: ["Information", "Risk"]
detectors:
  - Risk is modeled as if the world were a casino with known odds
  - Quantitative confidence increases while exposure to rare events grows
  - Decisions rely on clean distributions despite real-world opacity and fat tails
triggers:
  - Forecasting, risk modeling, and “expert” probability claims
  - Financial/operational decisions where tail events matter
  - Complex domains with feedback loops and unknown unknowns
failure_modes:
  - Treating model precision as reality precision
  - Underestimating rare, consequential events (Black Swans)
  - Using casino analogies to dismiss real-world optionality and innovation
aliases:
  - Casino-World Error
core_mechanics:
  - Real life is not a well-posed game with fixed, known probabilities
  - Fat tails and opacity make standard risk estimates unreliable
  - Prefer fragility detection and downside caps over probability-point predictions
---

### Description

The Ludic Fallacy is the mistake of treating real-world uncertainty as if it were the tidy randomness of games (casinos, dice, lab experiments). In complex, fat-tailed domains, probabilities are not stable or fully knowable, and model-driven precision can increase fragility by encouraging hidden risk-taking.

---

### When to Avoid (or Use with Caution)

- In true “ludic” domains where odds are known (games, some controlled experiments).
- When you can bound downside so model error cannot cause ruin.

---

### Keywords for Situations

Risk models, fat tails, Black Swans, uncertainty, opacity, tail risk, “casino thinking.”

---

### Thinking Steps

1. **Ask whether the domain is actually game-like**
   Are probabilities stable and known, or are they uncertain and regime-dependent?
2. **Assume model error**
   Treat probability estimates as fragile; plan for them to be wrong in the tails.
3. **Shift from prediction to exposure**
   Focus on what happens if you’re wrong: cap downside, avoid ruin, keep optionality.
4. **Look for fat-tail signatures**
   Are outcomes dominated by rare events? If so, avoid overreliance on averages and variance.
5. **Prefer robust heuristics**
   Use via negativa (remove fragilities) and barbell structures rather than precise forecasts.

---

### Coaching Questions

- Are we acting as if the world has casino-like odds?
- What happens if the probability estimate is off by an order of magnitude?
- Where is the ruin boundary?
- What decision would we make if we refused to forecast the tail?

