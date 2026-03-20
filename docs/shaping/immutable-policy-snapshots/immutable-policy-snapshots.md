# Spike: Immutable Policy Snapshots

## Status
- **Author:** Technical Researcher
- **Date:** 2026-03-20
- **Appetite:** 2 weeks (Implementation)

## Overview
Currently, the system implements policy snapshots via the `policy_versions` table. Every booking triggers a new row insertion in `policy_versions`, capturing the current state of `shop_policies` and applying any tier-based overrides. While this ensures immutability, it introduces significant data redundancy and relies on hardcoded defaults for critical cancellation parameters.

## 1. Implementation Approaches

### Approach A: Enhanced Snapshotting (Low Complexity)
Keep the current "insert-on-booking" strategy but complete the feature set.
- **Changes:** 
  - Add `cancel_cutoff_minutes` and `refund_before_cutoff` to the `shop_policies` table.
  - Update the settings UI to allow shop owners to configure these values.
  - Update `createAppointment` logic to capture these new fields in the `policy_versions` snapshot.
- **Complexity:** Low. Fixes the "incomplete" nature of current snapshots without changing the architecture.
- **Libraries:** None new (uses existing Drizzle/Zod).

### Approach B: Deduplicated Version Tracking (Medium Complexity)
Only create new policy versions when a shop's configuration actually changes.
- **Changes:**
  - Appointments reference a "Policy Template" (Deduplicated `policy_versions`).
  - When a shop owner saves settings, a new `policy_versions` record is created *only if* the values differ from the current version.
  - **Tier Handling:** Since tiers create variations (e.g., $0 deposit for Top tier), we deduplicate based on the *resultant* policy. For a shop with 3 tiers, there are at most 3 "active" policy versions at any time.
- **Complexity:** Medium. Requires change-detection logic and a more sophisticated query during booking.
- **Libraries:** `fast-json-stable-stringify` (for reliable object comparison).

### Approach C: JSONB Inline Snapshots (High Complexity/Alternative)
Eliminate the `policy_versions` table entirely in favor of data locality.
- **Changes:**
  - Add a `policy_snapshot` `jsonb` column directly to the `appointments` table.
  - Store the entire applied policy (base + overrides) as a blob.
- **Complexity:** Medium to High (due to migration effort).
- **Pros:** Zero joins to resolve policy; guaranteed immutability; simplifies "Plan" logic.
- **Cons:** Harder to aggregate/query policy usage across the platform; breaks normalized audit trails.
- **Libraries:** None new.

## 2. Specific Libraries Needed
- **Drizzle ORM & Zod:** (Existing) Core for schema management and validation.
- **fast-json-stable-stringify:** (Recommended for Approach B) To compare current vs. previous policy states without being affected by key ordering.

## 3. Deal-Breakers for 2-Week Appetite
- **Full Event Sourcing:** Attempting to implement a full event-store for all shop changes is out of scope.
- **Retroactive Data Migration:** If we change to Approach C (JSONB), migrating thousands of existing `policy_versions` links into JSON blobs might consume the entire appetite.
- **Dynamic Policy Engines:** Building a system where policies are "scripts" or complex rule engines.

## 4. Recommended Approach: Approach B (Deduplicated Version Tracking)

### Reasoning:
Approach B strikes the best balance between data efficiency and auditability. The current "insert for every booking" model will lead to table bloat (millions of identical rows). 

**Implementation Strategy:**
1. **Extend `shop_policies`:** Add the missing cancellation fields.
2. **Version Creation:** On settings save, check if the new policy hash differs from the latest version. If so, insert.
3. **Booking Logic:** 
   ```typescript
   // Find or create the version for the specific tier outcome
   const policyVersion = await findOrCreatePolicyVersion({
     shopId,
     ...basePolicy,
     ...tierOverrides
   });
   appointment.policyVersionId = policyVersion.id;
   ```
This keeps the `appointments` table clean while ensuring that the `policy_versions` table actually represents *distinct* policy states rather than just a log of bookings.

## 5. Implementation Plan (2-Week)
- **Week 1:** Database migrations for `shop_policies` and settings UI updates.
- **Week 2:** Deduplication logic in `createAppointment` and migration of existing "one-per-booking" records into shared versions.
