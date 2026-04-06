# Problem Diagnosis: Multiple Event Types Implementation

## Stated Problem
The platform currently restricts each shop to a single event type. Market standards and business requirements (e.g., haircut vs. color session) necessitate the ability to offer multiple distinct services, each with its own configuration (duration, price, deposit, buffer, notice).

## Core Challenges
- **Schema Coupling**: Scheduling and pricing attributes are tied directly to the `shop` entity, rather than a separate `eventTypes` entity.
- **Workflow Impact**: The entire booking flow, availability calculation, and UI for shop settings assume a 1:1 relationship between shop and service.
- **Technical Barrier**: The current database schema lacks the relational model needed to support many-to-one service-to-shop mapping.

## Goals
- Decouple service attributes from the shop entity.
- Implement a flexible `eventTypes` model.
- Enable customers to select from multiple services during the booking process.
- Maintain consistency with competitor standards (Calendly, Cal.com).

## Impact
Without this feature, the platform is non-viable for most service-based businesses, representing a critical blocker for product-market fit.
