# Analysis Report: Promotional A/B Test Data Strategy

## Executive Summary

The recent failure of a promotional A/B test was not a simple bug, but a symptom of a deeper issue: a flawed and fragmented understanding of the company's data landscape. The immediate cause was a missing data field (`is_coupon_eligible`), but the root cause is a reliance on inconsistent, legacy data sources (SBE and PDP) whose actual implementation (the "territory") does not match the team's mental model (the "map").

This report recommends a two-phase approach. **In the short-term**, the immediate goal of re-running the A/B test should be achieved by creating a new, direct data pipeline from the basket to the strategic "single source of truth," **DPMS**. **In the long-term**, this new pipeline should be used as the foundation to completely migrate the basket away from legacy data sources.

The core recommendation is to **stop patching the legacy systems** and instead **invest all effort in aligning with the future DPMS-centric architecture**. The next A/B test should not be on promotional copy, but a technical test of the new DPMS data pipeline itself to validate its reliability and performance before a full rollout.

## Problem Statement

The organization experienced a costly failure of a promotional copy A/B test in the shopping basket. This was caused by inconsistent data between two legacy systems, SBE and PDP, specifically a missing `is_coupon_eligible` field from the SBE feed. This has led to wasted engineering effort and has surfaced a critical strategic question about which system should be the "single source of truth" for promotional data, with the DPMS system being the intended but not yet implemented solution.

## Individual Model Analysis

### Model 1: The Map Is Not the Territory

*   **Rationale for Selection:** This model was chosen because the problem originated from a flawed understanding of the technical environment.
*   **Analysis & Findings:** The team operated on a "map" where data from SBE and PDP were assumed to be interchangeable. The failed test revealed the "territory": these systems are inconsistent, and the team's mental model was dangerously inaccurate. The key takeaway is that before any new solution is built, a new, accurate map of the data landscape must be created and validated.

### Model 2: First-Principle Thinking

*   **Rationale for Selection:** This model was chosen to cut through the legacy complexity and design a correct long-term solution.
*   **Analysis & Findings:** By breaking the problem down, we determined that the basket's fundamental need is for accurate data, and the fundamental source for that data is DPMS. Reasoning from this first principle leads to a clear conclusion: the basket must connect directly to DPMS. Any effort spent patching or reconciling the legacy SBE/PDP systems is a waste of resources that delays the correct strategic outcome.

### Model 3: Inversion

*   **Rationale for Selection:** This model was chosen to rigorously stress-test the new plan and ensure its success by proactively identifying failure points.
*   **Analysis & Findings:** By asking "How could the migration to DPMS fail?", we identified numerous risks beyond the initial data field issue. These include potential performance bottlenecks with the new API, incomplete data in DPMS itself, and process failures like poor communication with stakeholders or the DPMS team. This analysis produced a concrete "avoidance list" which serves as a risk mitigation plan.

## Synthesis & Integrated Insights

The three models weave together to tell a clear story and provide a unified path forward:

1.  **The Map is Not the Territory** explains *why* the failure occurred: the team's mental model was wrong. It diagnoses the root cause as a knowledge gap.
2.  **First-Principle Thinking** provides the *solution*: ignore the confusing legacy systems and build the most direct path to the goal by connecting directly to the strategic source of truth, DPMS.
3.  **Inversion** provides the *action plan*: it takes the solution from First-Principle Thinking and makes it robust by forcing the team to anticipate and mitigate the risks (technical, process, and people-related) that could derail it.

The integrated insight is this: **The problem is not a bug to be fixed, but a system to be redesigned.** The failed A/B test is a gift of feedback, revealing the deep-seated issues of technical debt and fragmented data ownership. Attempting to simply "fix" the bug by patching the SBE feed would be a critical error, ensuring that this exact class of problem will happen again. The only logical path is to accelerate the transition to the new, unified system (DPMS).

## Actionable Options & Recommendations

### Recommendation: Two-Phase DPMS Migration & Test

This is the highly recommended path.

**Phase 1: Technical A/B Test (The Pipeline Test)**

1.  **Build the Adapter:** Dedicate engineering resources to building a small, isolated service that connects the basket directly to the DPMS API. This service will fetch all necessary promotional data.
2.  **Validate the Data:** Before the test, perform the risk mitigation steps identified by the Inversion analysis. Validate the DPMS schema, test its performance, and create a data quality checklist.
3.  **Deploy & Test the Pipeline:** Launch a technical A/B test where:
    *   **Group A (Control):** Continues to receive promotional data from the old, legacy systems.
    *   **Group B (Variant):** Receives promotional data from the new DPMS pipeline.
4.  **Measure & Decide:** The goal of this test is *not* to measure conversion uplift, but to prove the reliability, accuracy, and performance of the DPMS pipeline. If successful, proceed to Phase 2.

**Phase 2: Promotional Copy A/B Test**

1.  **Switch to DPMS:** Once the pipeline is proven, make it the default data source for 100% of traffic. The legacy connections can now be marked for deprecation.
2.  **Run the Intended Test:** With a reliable data source now in place, re-launch the original A/B test comparing the old promotional copy to the new, longer-form copy. You can now be confident that the results of this test will be meaningful.

### Option 2: The Short-Term Patch (Not Recommended)

*   **Action:** Invest engineering time to add the `is_coupon_eligible` field to the SBE feed.
*   **Pros:** Might seem faster to get the original A/B test live.
*   **Cons:** This is a classic short-term fix that creates long-term pain. It adds to technical debt, reinforces reliance on a legacy system, and does nothing to prevent the next, slightly different data inconsistency from causing another failure. **This option actively works against the company's stated strategy of migrating to DPMS.**
