# Mental Models Selected: Multiple Event Types Implementation

From an initial list of 12 candidates, 7 were deeply evaluated, and the final 3 were selected based on their power to address the technical, architectural, and project management facets of this transition.

## Ranked List of Chosen Models

1. **First-Principle Thinking** (`m03_first-principle_thinking.md`)
2. **Modularity** (`m01_modularity.md`)
3. **Shape Up Product Development Model** (`m33_shape_up_product_development_model.md`)

## Rationale for Selection

### 1. First-Principle Thinking
**Why**: The current system is constrained by a "1:1 shop-to-service" assumption. First-principle thinking will help us deconstruct the problem to its irreducible truths (e.g., "a booking is a reserved block of time for a specific outcome") and rebuild the schema without the baggage of the current implementation. It directly addresses the "Point of Cause (POC)" identified in the source document: the coupling of attributes to the shop entity.

### 2. Modularity
**Why**: To solve the "Many-to-One" requirement, we need to treat `eventTypes` as self-contained units with high internal cohesion (duration, price, rules) and low external coupling (interfaces with the shop and calendar). This model will guide the creation of "simple, stable interfaces" between the new service entity and the existing booking engine.

### 3. Shape Up Product Development Model
**Why**: This is a major feature ("P0 Table Stakes") that could easily become a "rabbit hole." Using the Shape Up framework, we can "Shape" the project by setting a clear "Appetite" (e.g., a 6-week Big Batch), defining the "Smallest Shippable Slice" (e.g., basic multi-service selection without complex bundles), and identifying "No-gos" to prevent scope creep.
