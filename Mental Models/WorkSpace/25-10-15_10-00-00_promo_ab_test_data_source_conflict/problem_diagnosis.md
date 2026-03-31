# Problem Diagnosis: Promotional A/B Test Data Source Conflict (Updated)

## 1. Core Problem

The organization experienced a failure with a recent A/B test for promotional messaging in the shopping basket. The root cause was a technical conflict between two data sources: SBE and PDP. The test was pulled, and the immediate goal is to understand how to re-launch it successfully and align with the long-term data strategy.

## 2. Key Issues

*   **Data Source Conflict:** The A/B test failed due to data inconsistencies between the SBE and PDP systems. Specifically, a field named `is_coupon_eligible` (or similar) was missing from the SBE data feed but present in PDP's. This discrepancy prevented promotional offers from displaying correctly in the basket journey.
*   **Wasted Effort:** The failure resulted in the loss of engineering hours and planning effort.
*   **Strategic Direction:** A system named **DPMS** has been identified as the intended "single source of truth" for promotional data going forward. However, the current systems (SBE, PDP) are not yet aligned with this strategy.
*   **Irrelevant Tooling:** The initially mentioned "PV tool" has been confirmed as not relevant to solving this specific problem.

## 3. Desired Outcomes

*   **Short-term:** A clear path to successfully re-running the promotional copy A/B test, ensuring the required `is_coupon_eligible` field is present and consistent.
*   **Long-term:** A strategic plan to transition from the current conflicting data sources (SBE, PDP) to using DPMS as the single source of truth for all promotional data.
*   **Clarity:** A clear understanding of the steps required to align the basket's data consumption with the new DPMS-centric architecture.