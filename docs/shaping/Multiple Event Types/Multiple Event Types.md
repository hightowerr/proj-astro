**A) Goal(s)**
* Shop owners can offer multiple distinct services/event types from a single booking page.
* Each event type can be configured with its own specific duration, price, deposit amount, buffer time, and minimum notice requirements.

**B) Barrier(s)**
* **Single Event Type Constraint**
  * Description: The current system architecture and database schema only support a single event type per shop, preventing the addition or selection of multiple services.
  * Type: Technical limitation
  * Confidence: High

**C) Current Situation (facts)**
* The platform currently only supports configuring and booking one single event type per shop.
* 100% of benchmarked competitors (Calendly, Timely, Cal.com) support multiple event types natively.

**D) Standard / Expectation**
* A standard scheduling platform must allow service businesses to list and book multiple types of services (e.g., a 30-minute haircut vs. a 2-hour color session) on a single booking interface.

**E) Discrepancy**
Standard: Platform handles multiple distinct services per business | Current: Platform allows only one service type per business | Gap: Hardcoded limitation preventing multi-service booking flows.

**F) Extent (problem characteristics)**
* **When does it happen?** During shop setup and when customers attempt to book.
* **How often?** Consistently for any business attempting to offer more than one service.
* **Where?** Across the database schema, shop settings UI, booking flow, and calendar availability calculations.
* **Since when?** System inception / current baseline.
* **Trend:** → (Static limitation)
* **Who/what is affected?** Shop owners (cannot list full services) and their customers (cannot select specific services).
* **Type of issue/defect?** Missing P0 "Table Stakes" feature.

**G) Point of Cause (POC)**
* The application lacks an `eventTypes` relational model; scheduling and pricing attributes are currently coupled too broadly to the shop entity rather than specific service offerings. 

**H) Impact / Severity**
* **High**
* Why it matters: It is a critical blocker for product-market fit. Service businesses inherently offer multiple services; without this capability, the software cannot be realistically adopted by the target market.

**I) Draft Problem Statement**
Shop owners need the ability to offer multiple services with varying durations, prices, and rules from a single booking page. Currently, the system's schema and logic limit each shop to a single event type. This gap prevents standard service businesses from accurately listing their offerings, making the platform non-viable for general adoption and placing it at a critical competitive disadvantage.

**J) Clarifying Questions**
*(None needed; the scope and gap are clearly defined in the source document.)*

**K) Confidence**
* **High**: The source document explicitly outlines the missing feature, its priority (P0), the business justification, and the technical scope of the limitation.