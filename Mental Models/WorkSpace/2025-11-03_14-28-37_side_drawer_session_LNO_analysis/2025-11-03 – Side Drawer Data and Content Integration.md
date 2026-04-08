---
title: "2025-11-03 – Side Drawer Data and Content Integration"
date: 2025-11-03
lno_note_focus: "N"
tags:
  - day/2025-11-03
  - thread/2025-11-03-side-drawer-component
  - topic/engineering/data
aliases: ["Side Drawer Data Integration"]
links: ["[[2025-11-03 – Side Drawer Component Design Session]]"]
---

# 2025-11-03 – Side Drawer Data and Content Integration

> [!goal] **Goal**
> To specify how the component will get its data.

> [!summary] **TL;DR**
> - The component will make a call to Akamai.
> - The backend service will fetch data from a "CPMS" service and Magnolia.
> - The component will receive product information via props to initiate the data fetch.

## Context (Minto Pyramid Principle)

- **Situation** — The side drawer needs to display rich content from multiple sources.
- **Complication** — The data fetching mechanism must be clearly defined, including the inputs required and the sources to be queried.
- **Key Questions** — What triggers the data fetch? What are the data sources? How is the data passed to the component?
- **Objective** — To outline the data flow and integration points for the side drawer component.

## Notes

- The microservice will call Akamai, which will in turn fetch data from a service referred to as "CPU miss".
- The service will also fetch content from Magnolia for the "same asking components".
- The frontend component will receive `products` as `props`.
- This product information will be used as input for the API request made by the component.

## Links

- [[2025-11-03 – Side Drawer Component Design Session]]
