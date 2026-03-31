---
title: "2025-11-03 – Promo and Products API Integration"
date: 2025-11-03
lno_note_focus: "L"
tags:
  - day/2025-11-03
  - thread/2025-11-03-promo-products-api
  - topic/engineering/api
  - topic/product/recommendations
aliases: ["Promo Products API"]
status: processed
links: ["[[2025-11-03 – API Integration Strategy]]", "[[2025-11-03 – Data Sourcing and Confirmation]]", "[[2025-11-03 – New Endpoint Design]]", "[[2025-11-03 – Product Identification and Categorization]]"]
---

# 2025-11-03 – Promo and Products API Integration

> [!goal] **Goal**
> To define the technical approach for integrating product information into a recommendation service for promo and empty basket scenarios.

> [!summary] **TL;DR**
> - Discussion on combining a product recommendation API with availability orchestrator using PDP endpoint.
> - Proposal to create a new endpoint on the product recommendation service.
> - This new endpoint would first collect IDs/SKUs, then call PDP for prices and availability.
> - Need to confirm with the PDP team if their endpoint can be used on the basket page for collection/delivery info.

## Context (Minto Pyramid Principle)

- **Situation** — There's a need to display product information (collection, delivery, price) within a product recommendation service, potentially for empty basket scenarios.
- **Complication** — The current recommendation service lacks this information, and there's uncertainty about how to efficiently and reliably source it, especially regarding using existing PDP endpoints on the basket page.
- **Key Questions** — How can product collection/delivery information be obtained? Can the PDP endpoint be leveraged? What is the optimal API design for this integration?
- **Objective** — To outline a technical strategy for integrating product availability and pricing into the product recommendation service, addressing data sourcing and API design challenges.

## L/N/O Tasks

- [ ] **Task:** Confirm with the PDP team if their endpoint can be used on the basket page for collection and delivery information.
  - **L/N/O:** N
  - **Reasoning:** This task addresses a key uncertainty and potential **Bottleneck** for the proposed integration strategy. Without this confirmation, further development carries significant risk.
  - **Owner:** @PM
  - **Blockers:** `m32_bottlenecks.md`: Lack of clarity on PDP team's API usage policies.
  - **Impact:** `m05_second-order_thinking.md`: 1st order: Clarifies technical feasibility. 2nd order: Prevents rework if assumptions are wrong; could open up new integration patterns.
  - **Goal:** [[2025-11-03 – Promo and Products API Integration]]
- [ ] **Task:** Investigate how to get collection information, potentially by asking "credit rating investigators" (or the correct team).
  - **L/N/O:** N
  - **Reasoning:** This task addresses a specific knowledge gap identified in the discussion, which is a **Bottleneck** for understanding data sourcing.
  - **Owner:** @Engineering
  - **Blockers:** `m32_bottlenecks.md`: Unclear ownership or source of collection information.
  - **Impact:** `m05_second-order_thinking.md`: 1st order: Identifies correct data source. 2nd order: Ensures data accuracy; avoids building on incorrect assumptions.
  - **Goal:** [[2025-11-03 – Promo and Products API Integration]]
- [ ] **Task:** Design and create a new endpoint on the product recommendation service to fetch product IDs/SKUs.
  - **L/N/O:** L
  - **Reasoning:** `m21_leverage.md`: This new endpoint centralizes the logic for product identification, making the overall recommendation service more efficient and scalable.
  - **Owner:** @Engineering
  - **Blockers:** `m32_bottlenecks.md`: Agreement on the API contract and data format.
  - **Impact:** `m05_second-order_thinking.md`: 1st order: Enables the new recommendation flow. 2nd order: Could become a reusable pattern for other data enrichment needs; potential for performance improvements.
  - **Goal:** [[2025-11-03 – Promo and Products API Integration]]
- [ ] **Task:** Define the API contract for the new product recommendation endpoint, including inputs (IDs/SKUs) and expected outputs (prices, availability).
  - **L/N/O:** L
  - **Reasoning:** `m21_leverage.md`: A clear API contract is a force multiplier, allowing frontend and backend teams to work in parallel and reducing integration errors.
  - **Owner:** @Engineering
  - **Blockers:** `m32_bottlenecks.md`: Confirmation from PDP team on data availability and format.
  - **Impact:** `m05_second-order_thinking.md`: 1st order: Enables efficient development. 2nd order: Sets a standard for future API development; reduces technical debt.
  - **Goal:** [[2025-11-03 – Promo and Products API Integration]]

## Links
- [[2025-11-03 – API Integration Strategy]]
- [[2025-11-03 – Data Sourcing and Confirmation]]
- [[2025-11-03 – New Endpoint Design]]
- [[2025-11-03 – Product Identification and Categorization]]
