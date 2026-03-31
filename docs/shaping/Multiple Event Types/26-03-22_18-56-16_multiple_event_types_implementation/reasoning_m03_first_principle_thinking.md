# Reasoning: First-Principle Thinking (Multiple Event Types)

Applying `m03_first-principle_thinking.md` to deconstruct the "1:1 Shop-to-Service" constraint and rebuild the booking architecture.

## 1. Identify the Problem/Goal (What?)
**Goal**: Allow a single shop to offer multiple distinct services (Event Types) with independent configurations.
**Urgency/Importance**: High (P0). Current 1:1 constraint is a "Table Stakes" blocker for market viability.
**Measurable Outcome**: 100% of benchmarked competitors support this; our platform supports 0. Success = 1:N relationship (1 Shop : N Event Types).

## 2. Clarify the System (How?)
**Current System Map**:
- `Shop` (Entity) → Contains `duration`, `price`, `deposit`, `buffer`, `minNotice`.
- `Booking` (Activity) → References `Shop` directly.
- `Availability` (Output) → Calculated based on `Shop` global settings.
**Blind Spot**: We assume a "Shop" *is* the "Service". In reality, a Shop *provides* many Services.

## 3. Deconstruct to Fundamentals (Why?)
**Invariant Truths**:
- **A Shop**: A business entity with an owner and a set of operating hours (Schedules).
- **An Event Type**: A template for a service. It has a duration (length) and a price.
- **A Slot**: A slice of time where a Shop is "open" and not already "booked".
- **A Booking**: An instance of an Event Type at a specific Slot for a specific Customer.
**The "Why" Chain**:
- Why can't we have two services? Because `duration` is a column on `Shop`.
- Why is it on `Shop`? Because the MVP assumed one service per shop.
- Does a Shop's identity depend on its service duration? No.
- **Fundamental Truth**: Service definition is distinct from Business identity.

## 4. Reconstruct Solutions (Solution)
**Reconstructed Schema**:
1. **`shops` Table**: (Identity & Global Settings)
   - `id`, `owner_id`, `slug`, `timezone`, `name`.
2. **`event_types` Table**: (Service Template)
   - `id`, `shop_id` (FK), `title`, `slug`, `duration`, `price`, `deposit_amount`, `buffer_time`, `min_notice`.
   - `is_active` (boolean).
3. **`appointments` Table**: (Instance)
   - `id`, `event_type_id` (FK), `start_time`, `end_time`, `customer_id`, `status`.

**Smallest Shippable Slice**:
- Migration of existing shop settings into a default `event_type` for each shop.
- Update `appointments` to reference `event_type_id` instead of (or in addition to) `shop_id`.
- UI: A "Services" tab in shop settings.

## 5. Stress-test (Devil's Advocate)
- **"And then what?"**: If we have 10 event types, how do we show them? (Need a selection step in the booking flow).
- **"What breaks?"**: Availability calculation currently reads `duration` from `Shop`. It must now accept a `duration` from the selected `event_type`.
- **Constraint**: Stripe payments. Does each `event_type` need its own Stripe product/price? (Preferably not, just pass the amount to the PaymentIntent).
- **Risk**: Migration. What happens to existing appointments? They should be linked to the "Default" event type created during migration.

## 6. Optimise and Integrate
- **Optimization**: Use a `scheduling_type` enum (as seen in Cal.com) to allow for future "Group" or "Round-robin" bookings without another schema change.
- **Integration**: Ensure the `slug` for an event type works as `shop-slug/service-slug`.
