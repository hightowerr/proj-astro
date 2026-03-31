---
model: Fragile–Robust–Antifragile (The Triad)
category: ["Systems Thinking", "Risk"]
detectors:
  - People use “resilient” or “robust” when they mean “antifragile”
  - Systems are designed to resist shocks but not to learn from them
  - Performance is judged in calm conditions rather than under stress
triggers:
  - Risk reviews and post-mortems
  - System design (orgs, products, portfolios, habits)
  - Choosing between stabilization vs variability tolerance
failure_modes:
  - Treating robustness as sufficient when upside from variability is available
  - Trying to make everything antifragile (some components should be robust or deliberately fragile)
  - Misclassifying because you look only at average outcomes, not tail behavior
aliases:
  - The Triad
  - Damocles–Phoenix–Hydra (metaphor)
core_mechanics:
  - Fragile: harmed by volatility; dislikes disorder
  - Robust/Resilient: resists shocks and stays roughly the same
  - Antifragile: benefits from volatility and improves under stressors
---

### Description

The Triad is a simple map for classifying things by their response to stressors: fragile things break under disorder, robust/resilient things resist and remain, and antifragile things *gain* from disorder. The triad is useful because it orients decisions away from “predict and optimize” and toward “inspect exposure and redesign it.”

---

### When to Avoid (or Use with Caution)

- When the system is multi-layered and you label the whole system with a single word without checking parts vs whole.
- When “antifragile” becomes marketing; classification requires an explicit stress-response test.

---

### Keywords for Situations

Stressors, volatility, robustness, resilience, antifragility, fragility, exposure, layers, path dependence.

---

### Thinking Steps

1. **Name the stressor**
   What variation hits the system (errors, load, volatility, time, competition)?
2. **Observe response**
   Under that stressor, does it degrade, stay the same, or improve?
3. **Check for layers**
   Does the whole benefit while parts break (or vice versa)? Separate component-level from system-level classification.
4. **Classify**
   Fragile / Robust / Antifragile relative to that stressor (classification is stressor-specific).
5. **Choose the design goal**
   Decide whether you want robustness (no change) or antifragility (improvement) for this component.
6. **Redesign exposure**
   Remove fragility (downside caps, redundancy) and add convexity (optionality, safe-to-fail variation) where appropriate.

---

### Coaching Questions

- Which stressor are we classifying against (time, volatility, errors)?
- Does the system improve under stress, or does it merely survive?
- Which parts should be robust even if the whole seeks antifragility?
- What change would move this one notch to the right on the triad?

