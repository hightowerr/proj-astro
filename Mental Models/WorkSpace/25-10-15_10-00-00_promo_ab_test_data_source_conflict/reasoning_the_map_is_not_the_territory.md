# Reasoning File 1: The Map Is Not the Territory

This document applies the mental model "The Map Is Not the Territory" to the promotional A/B test failure.

## Analysis using Thinking Steps

### 1. Identify Your Map

The primary "map" the team was using was a set of flawed assumptions:

*   **The Map of Data Equivalence:** The belief that promotional data from the SBE system was functionally identical to the data from the PDP system for the purposes of the A/B test.
*   **The Map of System Robustness:** The assumption that the existing architecture was resilient enough to support a new promotional copy variation without requiring a deep data validation effort.

### 2. Acknowledge its Limitations

This map was a dangerous oversimplification. It completely ignored the complex reality of the technical landscape:

*   It failed to account for the separate histories, development teams, and intended purposes of the SBE and PDP systems.
*   It glossed over the high probability of discrepancies in data schemas, fields, and update cycles that naturally occur in legacy systems.
*   The missing `is_coupon_eligible` field is the specific, painful detail that this simplified map failed to represent.

### 3. Seek Out the "Territory"

The team discovered the territory in a reactive and costly way: through the public failure of the A/B test. The bug report and subsequent investigation was a forced exploration of the real-world landscape.

A proactive approach to exploring the territory *before* the next test should involve:

*   **Data Schema Audits:** A direct, technical comparison of the data schemas for promotions from SBE, PDP, and the future source, DPMS.
*   **Sample Data Comparison:** Running scripts to compare the live data for a significant sample of promotions across all relevant systems to find other potential inconsistencies.
*   **Human-to-Human Exploration:** Interviewing the engineers and managers responsible for SBE, PDP, and DPMS to understand the known limitations, intended use cases, and political history of each system.

### 4. Compare and Contrast

*   **The Map:** "Data from SBE and PDP is the same for our needs."
*   **The Territory:** "SBE data is missing the critical `is_coupon_eligible` field, which makes it incompatible with the basket journey's requirements without modification."

*   **The Map:** "We are ready to launch this test."
*   **The Territory:** "Our system has undeclared data dependencies that will cause new features to fail in unexpected ways."

### 5. Update Your Map

To move forward, the team must discard the old map and adopt a new, more accurate one:

*   **New Map v1:** "SBE and PDP are distinct legacy systems. They cannot be trusted to be in sync. Any data used from either must be explicitly validated against the requirements of the basket journey."
*   **New Map v2 (Strategic):** "The single source of truth is DPMS. All future development, including A/B tests, must be designed and validated against the data provided by DPMS, not legacy systems. The primary goal is to migrate away from SBE/PDP, not to perpetuate their use."

This updated understanding provides a clear directive: before the next test, an accurate, shared diagram of the current promotional data flow must be created and validated by all stakeholders.
