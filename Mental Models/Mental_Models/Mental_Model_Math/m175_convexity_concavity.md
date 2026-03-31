---
model: Convexity vs. Concavity (Fragility Detection)
category: ["Math", "Risk"]
detectors:
  - Outcomes worsen disproportionately when stress increases (nonlinear harm)
  - Small errors are tolerable but rare events create ruin
  - “Average conditions” look safe but variability kills
triggers:
  - Assessing exposures to volatility
  - Evaluating risk models and “stability” claims
  - Choosing between steady-state optimization vs variability tolerance
failure_modes:
  - Assuming linearity (“more is more”) when the response is nonlinear
  - Mistaking the average outcome for the outcome under variability
  - Hiding fragility by smoothing metrics or aggregating
aliases:
  - Positive vs Negative Convexity
  - Smiles and Frowns
  - Jensen’s Inequality (intuition)
core_mechanics:
  - Nonlinear responses make the average of outcomes differ from outcome at the average input
  - Concave exposures are harmed by variability; convex exposures benefit from variability
  - Fragility corresponds to negative convexity effects (bad under dispersion); antifragility to positive
---

### Description

Convexity/concavity is a practical lens for detecting fragility: when a system’s response to stress is nonlinear, variability matters more than the average. Concave (“frowny”) exposures are harmed by dispersion around the average; convex (“smiley”) exposures benefit from dispersion. This helps explain why “stability” can be dangerous: suppressed variability can hide accumulating fragility until a discontinuous break.

---

### When to Avoid (or Use with Caution)

- When you cannot observe outcomes with enough fidelity to infer the curvature.
- When you’re using convexity language as jargon without mapping real payoffs.

---

### Keywords for Situations

Nonlinearity, variability, dispersion, tail risk, asymmetry, Jensen’s inequality intuition, “smiles vs frowns.”

---

### Thinking Steps

1. **Choose the stress variable**
   Pick the input that varies (load, demand, leverage, time under stress, dosage).
2. **Map outcomes at multiple points**
   Ask: what happens at low, medium, and high stress—not just at the average?
3. **Check for disproportionate harm**
   If harm accelerates as stress increases, you likely have concavity (fragility).
4. **Compare “average input” vs “average outcome”**
   Would variability around the average produce worse outcomes than steady conditions?
5. **Convert concavity into convexity**
   Cap downside (limits, buffers, kill-switches), and keep upside open (options, scalability).
6. **Prefer variability where you are convex**
   Use small stressors/trials in areas where failure is bounded and informative.

---

### Coaching Questions

- Where does a small increase in stress cause a disproportionate jump in damage?
- What fails abruptly rather than gradually?
- Are you safe because the average is safe—or only because variability is currently suppressed?
- How can you cap the downside while keeping upside available?

