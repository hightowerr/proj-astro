# Analysis Report: Multiple Event Types Implementation

## Executive Summary
The platform currently suffers from a critical 1:1 coupling between the "Shop" entity and "Service" attributes. This architectural debt prevents businesses from listing multiple services, making the product non-viable for its target market. By applying First-Principle Thinking, Modularity, and Shape Up, we recommend a 6-week "Big Batch" project to decouple service definitions from the shop, migrate existing data, and implement a modular "EventType" system. This will bring the platform to parity with market leaders like Cal.com and Calendly.

## Problem Statement
Shop owners need the ability to offer multiple services with varying durations, prices, and rules from a single booking page. Currently, the system's schema and logic limit each shop to a single event type, creating a critical competitive disadvantage and a blocker for user adoption.

## Individual Model Analysis

### Model 1: First-Principle Thinking (`m03_first-principle_thinking.md`)
- **Rationale for Selection**: To deconstruct the "Shop is the Service" assumption and rebuild the core schema based on invariant business truths.
- **Analysis & Findings**: The analysis identified that "Service" attributes (duration, price, deposit) are fundamentally distinct from "Shop" attributes (owner, slug, timezone). The current schema is an artifact of MVP-stage simplicity rather than a business requirement.
- **Key Insight**: We must create a many-to-one relationship between `EventTypes` and `Shops` to reflect the reality of service businesses.

### Model 2: Modularity (`m01_modularity.md`)
- **Rationale for Selection**: To design the new `EventType` system as a set of self-contained units that plug into the existing booking engine with minimal friction.
- **Analysis & Findings**: By defining clear interfaces (e.g., `getEffectiveDuration()`, `getRequiredDeposit()`), the booking engine can remain agnostic to the internal complexity of a service.
- **Key Insight**: A modular design allows for future enhancements (e.g., service-specific rules or team member assignments) without further schema refactoring.

### Model 3: Shape Up Product Development Model (`m33_shape_up_product_development_model.md`)
- **Rationale for Selection**: To scope the project effectively, identify potential "rabbit holes," and define a "Smallest Shippable Slice."
- **Analysis & Findings**: The analysis framed the project as a 6-week "Big Batch." It identified "Shared Resources" and "Service Bundles" as major rabbit holes that must be explicitly excluded from the MVP.
- **Key Insight**: Success depends on a clean migration of existing data into a default "EventType" for every shop, ensuring zero downtime for current users.

## Synthesis & Integrated Insights
The synthesis of these models reveals a clear path forward:
1. **The Structural Shift**: First-principles thinking confirms that the schema *must* change. Modularity tells us *how* to change it without breaking the system. Shape Up tells us *what* to exclude to ensure we ship.
2. **Backward Compatibility**: The modular interface approach, combined with a default-migration strategy, ensures that existing appointments and shops continue to function seamlessly.
3. **Competitive Parity**: Moving to an `EventType` model aligns the platform with the architectural standards of industry leaders, enabling rapid feature parity in the future.

## Actionable Options & Recommendations
**Recommendation: Proceed with a 6-week "Multiple Event Types" project.**

### Implementation Steps:
1. **Schema Refactor**: Create the `event_types` table and add `event_type_id` to the `appointments` table.
2. **Data Migration**: Automatically populate the new table using existing shop-level settings.
3. **Availability Engine Update**: Modify the slot-finding logic to accept a duration from the selected `event_type`.
4. **UI Updates**:
   - Shop Dashboard: Add a "Services" tab for managing event types.
   - Booking Flow: Add a "Service Selection" step before the calendar view.
5. **Validation**: Confirm that all legacy appointments are correctly linked and that multiple services of different durations can be booked on the same shop page.

## References
- Cal.com Open Source Schema (https://github.com/calcom/cal.com)
- Calendly Managed Events Documentation
- "Shape Up" by Ryan Singer (Basecamp)
