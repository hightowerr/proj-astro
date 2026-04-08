---
title: "2025-11-03 – Side Drawer Technical Architecture"
date: 2025-11-03
lno_note_focus: "L"
tags:
  - day/2025-11-03
  - thread/2025-11-03-side-drawer-component
  - topic/engineering/architecture
aliases: ["Side Drawer Architecture"]
links: ["[[2025-11-03 – Side Drawer Component Design Session]]"]
---

# 2025-11-03 – Side Drawer Technical Architecture

> [!goal] **Goal**
> To define the backend architecture for the side drawer.

> [!summary] **TL;DR**
> - A new, separate microservice will be created.
> - It will run in the background and be exposed through an API gateway.
> - This service will be responsible for fetching all required data from downstream systems.

## Context (Minto Pyramid Principle)

- **Situation** — The side drawer component requires a backend to orchestrate data fetching.
- **Complication** — The team needs to decide on an architectural approach that is scalable and decoupled from the frontend.
- **Key Questions** — Should we build a new service? How will it be exposed to the frontend?
- **Objective** — To agree on a microservice-based architecture for the side drawer's backend.

## Notes

- The agreed approach is to create a component that is "just inflatable extended".
- A separate microservice will be created specifically for this component.
- This service will run in the background.
- It will be exposed to the frontend via an API gateway ("for the gateway my API gateway sorry").
- This architecture is intended to be a reusable pattern.

## Links

- [[2025-11-03 – Side Drawer Component Design Session]]
