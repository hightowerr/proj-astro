---
title: "2025-11-03 – API Integration Strategy"
date: 2025-11-03
lno_note_focus: "L"
tags:
  - day/2025-11-03
  - thread/2025-11-03-promo-products-api
  - topic/engineering/api
aliases: ["API Integration Strategy"]
links: ["[[2025-11-03 – Promo and Products API Integration]]"]
---

# 2025-11-03 – API Integration Strategy

> [!goal] **Goal**
> To outline the strategy for integrating product information APIs.

> [!summary] **TL;DR**
> - Consider using the PDP endpoint to get collection and delivery information.
> - The PDP page currently gets this information from "beat PDP" (likely a transcription error for "the PDP").
> - The idea is to combine the product recommendation API with an "availability orchestrator".

## Context (Minto Pyramid Principle)

- **Situation** — The product recommendation service needs to acquire collection and delivery information for products.
- **Complication** — There are multiple potential sources for this data, including existing PDP endpoints and an "availability orchestrator."
- **Key Questions** — Which API should be used? How should the existing components interact?
- **Objective** — To define a clear strategy for integrating relevant APIs to source product collection and delivery data.

## Notes
- There is a discussion around how to combine a product recommendation API with an "availability orchestrator."
- The idea of using a PDP endpoint to get collection and delivery information is explored, as the PDP page itself seems to obtain this data (potentially from "beat PDP").
- The transcript raises a question about whether PDP pages have a direct integration with an availability orchestrator.

## Links
- [[2025-11-03 – Promo and Products API Integration]]
