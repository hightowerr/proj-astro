# Reasoning: Modularity (Multiple Event Types)

Applying `m01_modularity.md` to design the "Event Types" system as a set of self-contained, interchangeable components.

## 1. Clarify Outcomes & Constraints
**Outcome**: A "plug-and-play" service model where new event types can be added without affecting existing shop-level logic.
**Constraint**: Must maintain 100% backward compatibility with the existing booking engine during transition.

## 2. Cluster Functions
**Natural Seams**:
- **Service Configuration**: (Cohesion: High) Duration, Price, Deposit, Rules.
- **Availability Engine**: (Cohesion: High) Calendar slots, shop hours, overlapping appointments.
- **Payment Processing**: (Cohesion: Medium) Stripe interaction, deposits vs. full payments.
**Decoupling Strategy**: Move "Service Configuration" out of the "Shop" entity and into its own "EventType" module.

## 3. Define Interfaces First
The `EventType` module should expose a standard interface for the `Availability` and `Booking` engines:
- `getEffectiveDuration()`: returns duration + buffer.
- `getRequiredDeposit()`: returns the amount to charge upfront.
- `getMinNoticeRequirement()`: returns the lead time needed.
- `getPricingDetails()`: returns amount and currency.
**Logical Boundary**: The `Shop` only knows which `EventTypes` it offers. The `Booking` only knows which `EventType` it belongs to.

## 4. Assess Tradeoffs Explicitly
**Interface Overhead**:
- **Complexity**: Introducing a new table and selection step in the UI.
- **Latency**: Negligible (one extra join).
**Gains**:
- **Flexibility**: Can now support services of varying lengths (30 min vs 2 hours).
- **Independent Upgrades**: Can add "Event Type Specific Rules" (e.g., only on Tuesdays) without changing the `Shop` schema.

## 5. Plan for Maintainability
**Interchangeability**: Shop owners can toggle services (is_active) or update details without breaking historical appointments (which should capture a "snapshot" of the service details at booking time).

## 6. Stage Modularization (Incremental)
1. **Module 1 (Storage)**: Create `event_types` table.
2. **Module 2 (Migration)**: Sync existing shop settings to the new table.
3. **Module 3 (Selection UI)**: Add a service picker to the customer flow.
4. **Module 4 (Integration)**: Update the backend to use `EventType` for calculations.

## 7. Prototype & Test Boundaries
**The Seam**: Availability calculation.
**Test**: Ensure that if "Haircut" (30 min) and "Color" (120 min) are offered, the availability engine correctly calculates gaps based on the *selected* service.

## 8. Evolve the Platform
**Future Innovation**: Once modularized, we can easily add "Multi-Staff" or "Team" models where an `EventType` is assigned to specific team members, or "Bundle" event types that wrap multiple basic event types.
