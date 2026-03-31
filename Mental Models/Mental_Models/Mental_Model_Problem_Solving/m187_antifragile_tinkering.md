---
model: Antifragile Tinkering (Bricolage)
category: ["Problem Solving", "Systems Thinking"]
detectors:
  - Planning is expensive, but learning-by-doing is cheap
  - You can run many small experiments but cannot confidently forecast outcomes
  - The domain rewards adaptation and trial-and-error
triggers:
  - Innovation, R&D, and product discovery
  - Building processes in uncertain environments
  - Any system where errors can be bounded and informative
failure_modes:
  - Scaling before learning (turning small errors into ruin)
  - Tinkering without constraints (unbounded downside experiments)
  - Mistaking narratives for selection; ignoring real-world feedback
aliases:
  - Bricolage
  - Trial-and-Error with Downside Caps
core_mechanics:
  - Many small, bounded errors provide information and improve the system
  - Optionality arises from the ability to abandon failed paths cheaply
  - Selection pressure replaces prediction: what works survives and is replicated
---

### Description

Antifragile tinkering is a method of progress that uses controlled trial-and-error: you run many small experiments with bounded downside so that failures teach without destroying you. Instead of relying on forecasts and designs that presume knowledge, you let selection and feedback drive improvement.

---

### When to Avoid (or Use with Caution)

- When failures cannot be bounded (safety-critical domains) unless you can fully sandbox.
- When you’re using tinkering as an excuse for randomness without learning signals.

---

### Keywords for Situations

Experimentation, iteration, learning, selection, optionality, safe-to-fail, feedback loops, discovery.

---

### Thinking Steps

1. **Define a bounded experiment**
   Make the maximum loss explicit (time, money, user impact); sandbox where possible.
2. **Increase trial count**
   Prefer many small attempts to a single “big plan” in uncertain domains.
3. **Instrument learning**
   Decide what you will observe that indicates improvement or harm.
4. **Exploit what works**
   Replicate and scale only after repeated survival under stressors.
5. **Prune aggressively**
   Stop failing paths early; keep optionality by avoiding sunk-cost attachment.
6. **Convert wins into robustness**
   Use gains to reduce fragility (buffers, redundancy) so future experiments remain survivable.

---

### Coaching Questions

- What is the smallest experiment that could produce a meaningful signal?
- What is the maximum loss, and is it truly capped?
- How quickly can we stop if things go wrong?
- What would we replicate if this succeeds—what is the scaling path?

