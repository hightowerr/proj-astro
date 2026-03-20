# Analysis Report: Customizable Reminder Timing Shaping

## Executive Summary
The "Customizable Reminder Timing" feature is a high-impact, table-stakes upgrade that addresses the "one-size-fits-all" limitation of the current notification system. By applying a multi-dimensional analysis using mental models, we've identified that the key to success is **disciplined scope management** and **robust failure avoidance**. Our recommendation is to proceed with the 1-2 week bet by focusing on a **Max-3 preset interval model** that includes a **10-minute** option for call-based businesses (Recruiters). This approach avoids technical debt, prevents user spam, and ensures timely delivery within the strategic window.

## Problem Statement
Shop owners currently have no control over reminder timing (hardcoded to a 24h window), which alienates diverse business models (prep-heavy therapists, quick-ping stylists, and time-sensitive recruiters). We need a flexible, shop-level configuration using preset intervals while maintaining a strict 1-2 week development cycle.

---

## Individual Model Analysis

### Model 1: Inversion
- **Rationale for Selection:** The primary risks are "too much complexity" and "system failure" (spam/silence). Inversion helps us anticipate these by defining what would guarantee a failure.
- **Analysis & Findings:**
  - **Spam Risk:** Identifying that 7 concurrent reminders would be a "guaranteed failure" for user experience.
  - **Timezone Trap:** Using the wrong timezone (server vs. shop) is a "guaranteed failure" for reliability.
  - **Avoidance List:**
    1. Limit to Max 3 reminders per appointment.
    2. Enforce `shop.timezone` for all cron calculations.
    3. Ensure a default "24h" migration so existing functionality doesn't break.
    4. Reject custom inputs to protect the 1-2 week appetite.

### Model 2: Procrustean Bed
- **Rationale for Selection:** Forcing all businesses into "preset buckets" risks cutting off the needs of high-value segments like recruiters.
- **Analysis & Findings:**
  - **The Recruiter Persona:** A "15-minute" preset might be a "stretch" when 10-minutes is the industry standard (e.g., Calendly).
  - **The Therapist Persona:** "48h" and "1w" fit well, but the system must handle the "already passed" edge case (booking within the window).
  - **Recommendation:** Add/Swap to a "10-minute" preset to avoid the Procrustean "forced fit" for recruiters without adding logic complexity.

### Model 3: Minimum Viable Task (MVT)
- **Rationale for Selection:** To meet a strict 1-2 week appetite, we must find the smallest unit of progress.
- **Analysis & Findings:**
  - **The Bottleneck:** The multi-window cron logic is the core technical risk.
  - **The MVT Strategy:**
    1. **Data Model First:** Migration to add the `reminderTimings` array (default `["24h"]`).
    2. **Iterative Cron:** Update logic to iterate over the array but verify against the logging table `appointment_id + interval`.
    3. **Minimalist UI:** Simple checkbox list in existing settings.

---

## Synthesis & Integrated Insights
The synthesis of these models reveals a "Goldilocks Zone" for the implementation:
1. **Standardization vs. Flexibility:** We use **Standardized Presets** (Inversion/Procrustean Bed) to keep the UI lean and predictable, but we **tune the presets** (Procrustean Bed) to fit the recruiter persona better (10m vs 15m).
2. **Complexity Management:** We use the **MVT** approach to prioritize the "Data + Cron" foundation, while using **Inversion** to set hard "Max-3" guardrails that prevent the system from becoming a "Spam Engine."
3. **Strategic Alignment:** The 1-2 week appetite is protected by explicitly rejecting "custom intervals" and "per-event overrides" as "guaranteed failure points" for the schedule.

---

## Actionable Options & Recommendations

1. **Adopt "Max 3" Policy:** Restrict the UI to allow only 3 active reminder intervals.
2. **Optimize Presets for Call-Based Businesses:** Include `10m`, `1h`, `2h`, `4h`, `24h`, `48h`, `1w` as the preset list.
3. **Use Interval-Aware Logging:** The "sent" logging table must now track `appointment_id` AND the specific `interval` sent (e.g., `appointment_123_10m`, `appointment_123_24h`) to ensure idempotency across multiple reminders.
4. **Implement "Default-to-24h" Migration:** Ensure all existing shops are migrated with the current 24h behavior to avoid silent failures.
5. **Phase 1 Only:** Reiterate to stakeholders that custom inputs and per-event logic are Phase 2.

---

## References
- `m07_inversion.md`
- `m184_procrustean_bed.md`
- `m027_minimum_viable_task.md`
- `customizable-reminder-timing-shaping.md`
