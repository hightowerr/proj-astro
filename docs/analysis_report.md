# Analysis Report: Immutable Policy Snapshot Strategy

## Executive Summary
After analyzing the three architectural approaches proposed in the "Immutable Policy Snapshots" spike, the recommended path is **Approach B: Deduplicated Version Tracking**. 

By applying the lenses of **Technical Debt**, **Caching**, and **Trade-offs**, it is clear that Approach B provides the most robust balance of long-term scalability and immediate reliability. It "pays down" the structural debt of the current system (which suffers from exponential row growth) while maintaining a clean, normalized audit trail necessary for financial dispute resolution.

## Problem Statement
The current system captures shop policies (cancellation rules, deposits) at the time of booking by creating a new `policy_versions` record for every appointment. This leads to:
1. **Redundancy:** Millions of identical rows for stable shop policies.
2. **Incompleteness:** Missing critical fields (`cancel_cutoff_minutes`), forcing the use of brittle hardcoded defaults in code.
3. **Inefficiency:** Scaling bottlenecks as the database grows linearly with bookings rather than policy changes.

## Individual Model Analysis

### Model 1: Technical Debt
- **Rationale for Selection:** The current system exhibits classic symptoms of "structural debt" (redundancy) and "functional debt" (missing fields).
- **Analysis & Findings:** Approach B is the most effective way to pay down this debt. Approach A only fixes the functional gap but allows the structural balloon payment to grow. Approach C (JSONB) incurs a "big bang" migration risk that is too high for the 2-week implementation appetite. Approach B refactors with the intent of "Separation of Concerns," ensuring that future changes don't re-incur the same redundancy.

### Model 2: Caching
- **Rationale for Selection:** Deduplication is fundamentally a memoization (caching) strategy for expensive-to-duplicate data.
- **Analysis & Findings:** Approach B correctly identifies the "Cache Key" as the unique combination of shop ID, base policy, and tier overrides. The recommendation to use `fast-json-stable-stringify` is a critical guardrail against "cache fragmentation" caused by key-ordering variance. This approach yields a predicted "Cache Hit Ratio" of 99.9%+, dramatically reducing database load.

### Model 3: Trade-offs & Opportunity Cost
- **Rationale for Selection:** Architectural decisions are always a balance of competing values (Simplicity vs. Efficiency vs. Locality).
- **Analysis & Findings:** Approach B trades "Developer Simplicity" for "Storage Efficiency" and "Audit Clarity." The opportunity cost of Approach A (Storage) and Approach C (Queryability/Migration Risk) was deemed higher than the cost of building the `findOrCreatePolicyVersion` logic required for Approach B.

## Synthesis & Integrated Insights
The synthesis of these models reveals a "Latticework" of architectural truth for this system:
1. **The Invalidation Paradox:** In a financial system, "invalidating" a policy version is impossible (it must remain immutable for the appointment). Therefore, the "Cache" (Deduplicated versions) must be persistent and indexed by a stable hash.
2. **Structural Integrity vs. Locality:** While JSONB (Approach C) offers the best locality, the "Technical Debt" lens highlights that breaking normalization standards early in a platform's life creates a "maintenance tax" on future reporting and analytics that outweighs the performance gain.
3. **Appetite-Driven Design:** Approach B fits the "Medium Complexity" / "2-week appetite" sweet spot. It provides a "Stabilization" phase (completing the schema) followed by an "Optimization" phase (deduplication) that yields immediate ROI.

## Actionable Options & Recommendations
1. **Execute Approach B:** Implement "Deduplicated Version Tracking."
2. **Phase 1 (Stabilize):** Add `cancel_cutoff_minutes` and `refund_before_cutoff` to the schema and UI.
3. **Phase 2 (Optimize):** Implement the `findOrCreatePolicyVersion` logic using `fast-json-stable-stringify` and a stable hashing algorithm (e.g., SHA256) for lookups.
4. **Phase 3 (Cleanup):** Run a background migration to merge existing identical `policy_versions` and update appointment references.

## References
- `Prompts/Mental Models/immutable-policy-snapshots.md`
- `Mental_Models/Mental_Model_SysThinking/m17_technical_debt.md`
- `Mental_Models/Mental_Model_Information/m27_caching.md.md`
- `Mental_Models/Mental_Model_Economics/m51_trade-offs.md`
