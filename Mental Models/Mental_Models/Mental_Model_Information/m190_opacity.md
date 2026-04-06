---
model: Opacity
category: ["Information", "Risk"]
detectors:
  - You cannot observe the full causal chain or the true risk distribution
  - Outcomes are driven by hidden variables and delayed effects
  - Confidence is high despite thin evidence and heavy modeling assumptions
triggers:
  - Decisions in complex systems (markets, organizations, health)
  - Vendor/tool selection where failure modes are hard to see
  - Forecasting under uncertainty and regime shifts
failure_modes:
  - Overconfidence in narratives and models (“we understand what’s going on”)
  - Taking leveraged positions in opaque domains
  - Mistaking the absence of visible harm for safety
aliases:
  - Hidden Causality
  - Unseen Barrel
core_mechanics:
  - When mechanisms are not observable, prediction becomes fragile
  - Opacity increases the value of robust heuristics (via negativa, Lindy, barbell)
  - Risk can be transferred and hidden until it surfaces as a tail event
---

### Description

Opacity is the condition where you cannot see the full mechanism, causal chain, or risk distribution driving outcomes. In opaque domains, confident prediction is dangerous because the missing information is often exactly what matters in tail events. The practical response is to shift from predicting outcomes to controlling exposure and fragility.

---

### When to Avoid (or Use with Caution)

- When you can reduce opacity via direct observation, measurement, or experimentation—do so.
- When you’re using “opacity” as an excuse for not learning anything.

---

### Keywords for Situations

Unknown unknowns, hidden risk, delayed effects, model error, tail events, robustness, heuristics.

---

### Thinking Steps

1. **Admit what you can’t see**
   Identify the variables, mechanisms, or distributions you cannot observe or validate.
2. **Assume your narrative is wrong**
   Treat explanations as provisional; focus on what breaks if the story fails.
3. **Control exposure**
   Cap downside, avoid leverage, and maintain buffers where ruin can occur.
4. **Use time and selection**
   Prefer Lindy-validated tools and practices; treat longevity as evidence against fragility.
5. **Learn through bounded experiments**
   Reduce opacity with safe-to-fail trials rather than big irreversible commitments.

---

### Coaching Questions

- What part of the causal chain is invisible to us?
- If our model is wrong, what is the worst-case outcome?
- Where is the ruin boundary, and how do we cap exposure to it?
- What small experiment would reduce opacity the most?

