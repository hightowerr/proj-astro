# Reasoning: Shape Up (Multiple Event Types)

Applying `m33_shape_up_product_development_model.md` to frame, scope, and plan for a successful "Multiple Event Types" implementation.

## 1. Frame
- **Problem**: Shop owners are forced to choose one service or create multiple shops. This is a non-starter for most service businesses.
- **Workflow**: Shop Owner (Setup) → Service Definition → Customer Selection → Booking Flow.
- **Why Now**: Critical blocker for product-market fit. Competitors already have this.

## 2. Shape
- **Appetite**: 6-week "Big Batch" (including schema change, migration, and UI updates).
- **Solution Sketch**:
  - Breadboard: `Shop Settings` → `Services Tab` → `List/Add/Edit Services`.
  - Customer Breadboard: `Shop Slug` → `Select Service` → `Select Time` (based on service duration) → `Checkout`.
- **Unknowns & Rabbit Holes**: 
  - **Overlapping Services**: What if a shop offers "Men's Cut" and "Beard Trim"? Can they be booked together? (No-go for MVP).
  - **Shared Resources**: What if multiple staff members offer different services? (No-go for MVP).
  - **Migration**: Ensuring existing appointments don't break. (Resolved by linking them to the "initial" event type).
- **No-gos**: 
  - No service bundles/add-ons in this cycle.
  - No per-service scheduling (use global shop hours for all).
  - No service-specific staff assignment yet.

## 3. Bet
- **Selection Criteria**: This feature is the highest priority for the current roadmap.
- **Feasibility**: High. The core booking logic exists; we're just adding a layer of abstraction.
- **Commitment**: Full 6-week cycle with a dedicated team (1 Backend, 1 Frontend).

## 4. Build
- **Smallest Vertical Slice**:
  - Step 1: Create `event_types` table and a migration script.
  - Step 2: Update the `Booking` flow to take an `event_type_id` and use its duration for the slot search.
  - Step 3: Add a "Services" tab to the Shop Dashboard.
  - Step 4: Add a "Service Selection" page to the customer booking flow.
- **Progress Tracking**: Use Hill Charts (e.g., "Schema/Migration" is currently 'uphill'; "Selection UI" is 'downhill').

## 5. Finish & Ship
- **Punch List**:
  - Validate all old appointments still show up.
  - Ensure Stripe payments correctly use the new `EventType` price.
  - Verify that "Buffer Time" is correctly added to each service.
- **Outcome**: A shop owner can now offer a 30-min haircut and a 2-hour color session on the same page.
