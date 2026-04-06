---
title: "2025-11-03 – Product Identification and Categorization"
date: 2025-11-03
lno_note_focus: "N"
tags:
  - day/2025-11-03
  - thread/2025-11-03-promo-products-api
  - topic/product/recommendations
aliases: ["Product ID & Category"]
links: ["[[2025-11-03 – Promo and Products API Integration]]"]
---

# 2025-11-03 – Product Identification and Categorization

> [!goal] **Goal**
> To discuss methods for identifying and categorizing products for recommendations.

> [!summary] **TL;DR**
> - The system can use category ID or product ID for flagging.
> - Consider the scenario of an empty basket (not logged in or simply empty).
> - Question whether recommendations are user-related in an empty basket.

## Context (Minto Pyramid Principle)

- **Situation** — Product recommendations need to be tailored, especially in scenarios like an empty basket.
- **Complication** — The method for identifying products (ID vs. category) and the relevance of user-specific data in an empty basket are open questions.
- **Key Questions** — Should product ID or category ID be used? Are recommendations user-related if the basket is empty or the user is not logged in?
- **Objective** — To determine the most effective way to identify and categorize products for recommendations, considering different user states and basket contents.

## Notes
- The discussion explores using either a category ID or a product ID to flag products for recommendations.
- A specific scenario considered is an empty basket, where the user might not be logged in or simply has no items.
- A question is raised about whether recommendations in an empty basket should be user-related, implying a need to define the scope of personalization in such cases.

## Links
- [[2025-11-03 – Promo and Products API Integration]]
