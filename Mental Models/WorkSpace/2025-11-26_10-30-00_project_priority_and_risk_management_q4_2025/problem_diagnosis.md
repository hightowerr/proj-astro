### Problem Diagnosis: Project Priority and Risk Management

**1. Core Problem:**
The team is facing a complex challenge of balancing immediate system stability concerns with a demanding feature roadmap, all while navigating resource constraints and hard deadlines. There is a need to establish a clear, defensible set of priorities and a strategic plan to mitigate risks associated with both technical debt (memory leaks, old APIs) and new feature development.

**2. Key Challenges:**

*   **Technical Risk & Stability:**
    *   A recent production incident caused by a memory leak has created a "change-averse" atmosphere.
    *   The upcoming Black Friday traffic spike poses a significant threat to the service's stability.
    *   There's uncertainty whether recent fixes are sufficient to handle the peak load.

*   **Competing Priorities & "Glass Balls":**
    *   Multiple projects are labeled "glass balls" (critical), creating priority conflicts.
        *   **Hard Deadlines:** Argos Pay, `cargo-scout` removal, Bosun migrations, Warranty API v4 upgrade.
        *   **Strategic Importance:** Wishlist MVP (which itself depends on a Next.js migration).
    *   Other valuable features (promo codes, threshold offers, empty cart recommendations) are competing for resources.

*   **Resource & Team Constraints:**
    *   The team is "tight on capacity."
    *   A key team member is leaving.
    *   There's a reliance on contractors, which presents challenges for building long-term leadership and ownership.
    *   An expansion plan is in the works but is for the next financial year, offering no immediate relief.

*   **Dependency Management:**
    *   The roadmap is a web of dependencies (e.g., Wishlist MVP -> Next.js migration, `cargo-scout` -> Argos Pay, UI features -> Fable v5 migration).
    *   This makes sequencing and parallelizing work difficult.

**3. Desired Outcome:**
To develop a clear, actionable, and prioritized roadmap for Q4 2025 and early Q1 2026 that:
*   Maximizes the chances of maintaining system stability through the Black Friday peak.
*   Ensures all hard-deadline projects are delivered.
*   Makes strategic progress on key initiatives like the Wishlist MVP and Next.js migration.
*   Provides clarity on what will be intentionally delayed.
*   Is realistic given the team's current capacity.
