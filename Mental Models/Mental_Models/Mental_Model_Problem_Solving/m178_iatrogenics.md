---
model: Iatrogenics
category: ["Problem Solving", "Systems Thinking"]
detectors:
  - Interventions keep multiplying while outcomes worsen
  - “Fixes” create side effects that require more fixes
  - Experts act confidently in domains with high complexity and low predictability
triggers:
  - Policy, organizational change, and complex-system interventions
  - Medicine/health, operations, and incident response
  - When the urge to “do something” dominates the evidence
failure_modes:
  - Treating the absence of action as failure, even when doing harm is more likely than helping
  - Overfitting to noisy signals and over-intervening
  - Using a clean narrative to justify interventions in opaque systems
aliases:
  - Harm Done by the Healer
  - Generalized Iatrogenics (broader)
core_mechanics:
  - In complex systems, interventions can create harm that exceeds intended benefits
  - Noise can be mistaken for signal, causing overreaction and fragilization
  - Prefer subtractive action and small, bounded experiments over large top-down fixes
---

### Description

Iatrogenics is harm caused by the attempt to help: the “healer” (doctor, policy maker, manager, expert) introduces side effects and fragility through intervention. In complex systems, the consequences of action are hard to predict, and repeated “optimization” can suppress beneficial variability and create hidden tail risks.

---

### When to Avoid (or Use with Caution)

- In true emergencies where inaction is clearly worse and the intervention is well-understood.
- When you have strong causal evidence and bounded side effects (rare in complex systems).

---

### Keywords for Situations

Side effects, over-intervention, noise vs signal, fragilization, expert problem, “first do no harm.”

---

### Thinking Steps

1. **Classify the domain**
   Is this a complex, adaptive system (people, markets, ecosystems) or a controlled, engineered one?
2. **List plausible side effects**
   For each proposed action, enumerate second-order consequences, especially those that add fragility.
3. **Prefer omission when uncertainty is high**
   If you can’t estimate net benefit reliably, default to via negativa: remove known harms first.
4. **Intervene in small, bounded ways**
   Use experiments with clear stop conditions and capped downside instead of “big bang” fixes.
5. **Separate signal from noise**
   Avoid reacting to short-term fluctuations; require persistent evidence before escalating action.
6. **Measure iatrogenic damage**
   Track metrics for unintended harm and include them in success criteria, not just “intended outcomes.”

---

### Coaching Questions

- What harm could this intervention create, and how would we notice early?
- If we did nothing, what would the system likely do on its own?
- What is the smallest action that reveals whether we’re helping or harming?
- Are we mistaking short-term noise for a problem that needs intervention?

