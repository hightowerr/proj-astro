# Mental Model Selection

## Context
This analysis runs after the 7 clarifying questions from the problem statement have been answered. The problem type has shifted: it was a product-definition blockage; it is now an implementation-sequencing challenge. Models that diagnose the original gap (Five Whys, Iceberg, Bottleneck, Via Negativa, Anti-Pattern, Goodhart) are no longer the primary lens needed. Models that structure correct, ordered execution are.

## Selection Funnel Summary

- **Categories scanned:** 15
- **Already applied across prior two analyses:** Iceberg Model, Solution-First Dynamic, Five Whys, Garbage In / Garbage Out, Via Negativa, Inversion, Second-Order Thinking, Leverage Points, Bottleneck Analysis, Leading vs. Lagging Indicators, Multiple Working Hypotheses, Presented vs. Discovered Problems, Anti-Pattern Thinking Tool, Goodhart's Law, Identifying Prior Questions
- **Fresh candidates deeply evaluated (full file read):** 5
  - Shape Up (`m33_shape_up_product_development_model.md`)
  - Necessity and Sufficiency (`m16_necessity_and_sufficiency.md`)
  - Multitracking (`m58_multitracking.md`)
  - Iterative Refinement / Porpoising (`m66_iterative_refinement_porpoising.md`)
  - Post-Implementation Review (`m08_post_implementation_review.md`)
- **Final selection:** 3

---

## Final Ranked Selection

### Rank 1 — Shape Up
**File:** `Mental_Models/Mental_Model_Economics/m33_shape_up_product_development_model.md`
**Category:** Systems Thinking / Product Development

**Rationale:** The spike documents are the shaping phase of Shape Up. Each spike produced what Shape Up calls a "pitch" — a resolved problem definition with known rabbit holes and explicit no-gos. The MoSCoW document is the output of a betting table. The work now entering implementation is exactly the "Building" phase. Shape Up provides the framework to:
- Convert each answered clarifying question into a scoped, time-bounded bet with a clear appetite
- Identify the rabbit holes still present inside the resolved scope (e.g., the currency-aware formatting edge cases, the type drift, the missing index)
- Name the explicit no-gos that protect scope (no fuzzy search, no payment lifecycle in daily log, no expiry line)
- Structure the build as vertical slices: one small working piece end-to-end first, not all layers of all features

This is the most directly actionable model for the current phase. The shaping work is done. Shape Up tells us exactly how to turn it into a sprint.

---

### Rank 2 — Necessity and Sufficiency
**File:** `Mental_Models/Mental_Model_General/m16_necessity_and_sufficiency.md`
**Category:** Logic / Reasoning

**Rationale:** Now that implementation is beginning, every feature has a gap between "started" and "correctly complete." Necessity and Sufficiency draws that line explicitly. For each dashboard feature, the model asks:
- What conditions are *necessary* — without which the feature is wrong or misleading?
- What conditions are *sufficient* — which together guarantee the feature is correct?

This is critical because the prior analysis established that the dashboard has already shipped features that are *partially correct* (the deposits-at-risk card exists but its currency is wrong). Each resolved clarifying question now has a correctness boundary that must be reached before the feature can be called done. Without this discipline, a fix can be partial and still ship — correct at the label level but still wrong at the data level.

Applied: shipping `High-Risk Customers` with a distinct-customer count but without the attention-window scope rule would be a case of having a necessary condition (dedupe by customer) without the sufficient conditions (window-scoped, booked-only).

---

### Rank 3 — Iterative Refinement (Porpoising)
**File:** `Mental_Models/Mental_Model_General/m66_iterative_refinement_porpoising.md`
**Category:** General / Problem Solving

**Rationale:** The problem-statement → 7 spikes → MoSCoW → implementation journey is a porpoising cycle. The model makes this explicit and, crucially, tells us that the next porpoise dive is not "finish everything" — it is "surface early from a small working slice to check that the understanding is still correct." The dashboard implementation should not run all 13 features to completion before checking. It should:
1. Implement one vertical slice (e.g., the two existing metric fixes + high-risk customer KPI)
2. Surface: does the real rendered output match the expected behaviour?
3. Refine the remaining scope based on what was learned
4. Dive again for the next slice

This prevents the same mistake that created the original problem (building a full design before validating the data model) from recurring inside the implementation phase.

---

## Eliminated Candidates

| Model | Reason Eliminated |
|---|---|
| Multitracking | The decision phase is over — all 7 questions are answered, so tracking multiple options simultaneously is no longer the right mode; sequencing execution is |
| Post-Implementation Review | Premature — the feature is not yet shipped; PIR is the correct tool after the first production deployment, not before |
