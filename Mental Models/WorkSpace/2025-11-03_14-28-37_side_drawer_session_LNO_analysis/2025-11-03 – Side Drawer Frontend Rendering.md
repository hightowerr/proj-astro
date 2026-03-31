---
title: "2025-11-03 – Side Drawer Frontend Rendering"
date: 2025-11-03
lno_note_focus: "N"
tags:
  - day/2025-11-03
  - thread/2025-11-03-side-drawer-component
  - topic/engineering/frontend
aliases: ["Side Drawer Rendering"]
links: ["[[2025-11-03 – Side Drawer Component Design Session]]"]
---

# 2025-11-03 – Side Drawer Frontend Rendering

> [!goal] **Goal**
> To describe how the frontend will display the side drawer content.

> [!summary] **TL;DR**
> - The frontend will decode a JSON object received from the microservice.
> - This JSON will contain data from Magnolia.
> - Content will be displayed in "cards" based on a specified sequence.

## Context (Minto Pyramid Principle)

- **Situation** — The side drawer component needs to render content fetched from the backend.
- **Complication** — The rendering logic needs to be defined, including how to handle the data format and display the content.
- **Key Questions** — What data format will the frontend receive? How will the content be structured visually?
- **Objective** — To specify the frontend rendering process for the side drawer content.

## Notes

- After the API call returns, the frontend will decode the JSON object from Magnolia.
- The content will be displayed as a series of "cards".
- The sequence of these cards will be based on a property named `sequence ret` (likely "sequence returned").
- The component is currently based on an existing component, `fabrics ended at moment Lisa from cons` (this seems like a transcription error, but indicates an existing component is being used as a base).

## Links

- [[2025-11-03 – Side Drawer Component Design Session]]
