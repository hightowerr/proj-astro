# Reasoning: Minimum Viable Task (m027_minimum_viable_task.md)

## 1. Define the Goal
Successfully deliver "Shop-level Customizable Reminder Timing" in 1-2 weeks, meeting the needs of 80% of businesses including recruiters.

## 2. Identify the Bottleneck
The bottleneck is the **cron job logic and database migration**. If we overcomplicate the "multiple windows" logic, we risk performance issues and logic bugs.

## 3. Reduce Scope (What's the MVT?)
The MVT is NOT the full settings page + cron job. The MVT is **modifying the cron job to support a dynamic interval from a single shop setting** (e.g., replace hardcoded 24h with a database value).

### MVT Decomposition:
- **Task 1: The "24h Default" Migration.** Create the `reminderTimings` column and populate with `["24h"]` for all shops.
- **Task 2: The "Variable Single" Cron.** Update the query to fetch the first timing from `reminderTimings` and use it.
- **Task 3: The "Multiple" Cron.** Update logic to iterate through up to 3 timings (Max-3 constraint).
- **Task 4: The "Minimal UI".** Simple list of checkboxes in the existing settings page.

## 4. Set a Constraint
- **Constraint:** NO custom interval input. Use only the 7-8 presets.
- **Constraint:** Max 3 reminders per appointment. (Avoid spam and complexity).
- **Deliverable boundary:** A working "1h + 24h" reminder flow verified by tests.

## 5. Execute Immediately
The next smallest action is to **update the database schema to include the settings column** with a migration script. This establishes the data model foundation.

## 6. Reflect and Iterate (Feedback Loops)
- **Feedback Loop:** Check if the recruiter persona is satisfied with "15m" or "10m" (preset).
- **Reflection:** Does the cron job slow down significantly when checking 3 windows per appointment? (Test with 10k mock appointments).
- **Outcome vs. Output:** The goal is *not* "7 presets," but "Shop owners can choose timing." If 5 presets cover 90%, use 5 to reduce UI clutter.

## 7. MVT Summary (The Plan)
1. **Migration:** Add `reminderTimings: string[]` (default `["24h"]`).
2. **Cron:** Update logic to iterate over the array, checking the logging table for `appointment_id + timing_interval`.
3. **UI:** Checkbox list in Shop Settings.
