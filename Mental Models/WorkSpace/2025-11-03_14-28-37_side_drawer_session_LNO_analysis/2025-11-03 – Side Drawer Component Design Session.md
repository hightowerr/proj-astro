---
title: "2025-11-03 – Side Drawer Component Design Session"
date: 2025-11-03
lno_note_focus: "L"
tags:
  - day/2025-11-03
  - thread/2025-11-03-side-drawer-component
  - topic/engineering/architecture
  - topic/product/feature
aliases: ["Side Drawer Session"]
links: ["[[2025-11-03 – Side Drawer Value Proposition and Usage]]", "[[2025-11-03 – Side Drawer Technical Architecture]]", "[[2025-11-03 – Side Drawer Data and Content Integration]]", "[[2025-11-03 – Side Drawer Frontend Rendering]]"]
status: processed
---

# 2025-11-03 – Side Drawer Component Design Session

> [!goal] **Goal**
> To align on the technical approach for a reusable "Side Drawer" component for the Argos website.

> [!summary] **TL;DR**
> - The side drawer will be a reusable component across PMP, PDP, Basket, and Checkout.
> - The architecture involves a new microservice to fetch data via Akamai from a "CPU miss" service and Magnolia.
> - The component will be exposed via an API gateway.
> - The frontend will take product data as props, make the call, and render content cards from the returned JSON.

## Context (Minto Pyramid Principle)

- **Situation** — The Argos team needs to build a "Side Drawer" component that can be used on multiple pages (PMP, PDP, Basket, Checkout).
- **Complication** — The technical solution needs to be agreed upon, involving a new microservice, data fetching from multiple sources (CPU miss, Magnolia), and a clear interface for frontend consumption. The discussion is happening with stakeholders from different teams.
- **Key Questions** — How will the component fetch data? What is the high-level architecture? How will content be rendered?
- **Objective** — To define and agree upon the initial technical design for the side drawer component.

## L/N/O Tasks

- [ ] **Task:** Create a new microservice for the side drawer component.
  - **L/N/O:** L
  - **Reasoning:** `m21_leverage.md`: This creates a reusable, decoupled service that can be used by multiple frontends, providing a high-leverage point for future features.
  - **Owner:** @Engineering
  - **Blockers:** `m32_bottlenecks.md`: Decision on the final architecture and agreement from all stakeholder teams.
  - **Impact:** `m05_second-order_thinking.md`: 1st order: A working side drawer. 2nd order: A new pattern for creating content-driven components is established; potential for more microservices to be created, increasing system complexity.
  - **Goal:** [[2025-11-03 – Side Drawer Component Design Session]]
- [ ] **Task:** Define the API contract for the side drawer microservice.
  - **L/N/O:** L
  - **Reasoning:** `m21_leverage.md`: A well-defined contract is a force multiplier, allowing frontend and backend teams to work independently.
  - **Owner:** @Engineering
  - **Blockers:** `m32_bottlenecks.md`: Agreement on the data structure from Magnolia and the "CPU miss" service.
  - **Impact:** `m05_second-order_thinking.md`: 1st order: Frontend and backend teams can build against a stable interface. 2nd order: The API could become a standard for similar components, but a poorly designed one could create long-term technical debt.
  - **Goal:** [[2025-11-03 – Side Drawer Component Design Session]]
- [ ] **Task:** Integrate the side drawer component into PMP, PDP, Basket, and Checkout pages.
  - **L/N/O:** N
  - **Reasoning:** This is the necessary work to realize the value of the component, but it's the expected, routine part of the project.
  - **Owner:** @FrontendTeams
  - **Blockers:** `m32_bottlenecks.md`: The component itself needs to be built and the API available.
  - **Impact:** `m05_second-order_thinking.md`: 1st order: The side drawer appears on the pages. 2nd order: Potential for performance impact on host pages; user behavior might change in unexpected ways.
  - **Goal:** [[2025-11-03 – Side Drawer Component Design Session]]

## Links
- [[2025-11-03 – Side Drawer Value Proposition and Usage]]
- [[2025-11-03 – Side Drawer Technical Architecture]]
- [[2025-11-03 – Side Drawer Data and Content Integration]]
- [[2025-11-03 – Side Drawer Frontend Rendering]]
