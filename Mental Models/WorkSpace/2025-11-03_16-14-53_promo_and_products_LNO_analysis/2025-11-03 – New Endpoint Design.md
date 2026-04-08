---
title: "2025-11-03 – New Endpoint Design"
date: 2025-11-03
lno_note_focus: "L"
tags:
  - day/2025-11-03
  - thread/2025-11-03-promo-products-api
  - topic/engineering/api
aliases: ["New Endpoint Design"]
links: ["[[2025-11-03 – Promo and Products API Integration]]"]
---

# 2025-11-03 – New Endpoint Design

> [!goal] **Goal**
> To propose the design for a new API endpoint.

> [!summary] **TL;DR**
> - Create a new endpoint on the product recommendation service.
> - This endpoint will first be called to collect IDs/SKUs.
> - Subsequently, it will call the PDP endpoint to retrieve prices and availability.
> - Avoid creating endpoints in "air sites" (likely a transcription error for "other sites" or "external sites").

## Context (Minto Pyramid Principle)

- **Situation** — The product recommendation service needs to provide detailed product information.
- **Complication** — Directly integrating with PDP for every recommendation might be inefficient, and there's a desire to avoid creating new endpoints in unrelated services.
- **Key Questions** — Where should the new endpoint reside? What should its responsibilities be? How should it interact with existing services?
- **Objective** — To design a new, dedicated endpoint within the product recommendation service that efficiently aggregates product data.

## Notes
- The proposal is to create a new endpoint specifically on the product recommendation service.
- This new endpoint would serve as an orchestrator: first collecting product IDs/SKUs, and then calling the PDP endpoint to retrieve prices and availability information.
- There's a stated preference to avoid creating new endpoints in "air sites" (interpreted as other, potentially unrelated, services or external systems), suggesting a desire to keep the new functionality within the recommendation service's domain.

## Links
- [[2025-11-03 – Promo and Products API Integration]]
