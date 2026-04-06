---
title: 2025-11-04 – Wishlist Sync and Digital Catalogue Strategy
date: 2025-11-04
lno_note_focus: L
tags:
  - day/2025-11-04
  - thread/2025-11-04-q4-roadmap-strategy
  - topic/product/wishlist
  - topic/product/digital-catalogue
aliases:
  - Wishlist Sync MVP
links:
  - "[[0. AI-brain-project/2025-11-04_Q4_Roadmap_Strategy/2025-11-04 – Q4 Roadmap and Technical Strategy Discussion]]"
---

# 2025-11-04 – Wishlist Sync and Digital Catalogue Strategy

> [!goal] **Goal**
> To define the MVP for syncing web and app wishlists to support the new "Digital Catalogue" feature and fix critical data loss issues.

> [!summary] **TL;DR**
> - The wishlist sync is a priority for next quarter.
> - The MVP must include support for multiple wishlists and achieve parity with the app's current functionality.
> - A new backend service will be required.
> - The current wishlist UI is considered "ugly" and a redesign is desired, but may be a fast-follow.

## Context (Minto Pyramid Principle)

- **Situation** — The app team is building a "Digital Catalogue" which relies heavily on wishlist functionality. The current un-synced, cached approach on the app is causing data loss and a poor user experience.
- **Complication** — The scope of the MVP needs to be defined, balancing the need for a lean solution with the requirements of the Digital Catalogue and the desire for a UI redesign.
- **Key Questions** — What is the minimum viable product for wishlist sync? How do we handle the "Wishlist of Dreams" from the Digital Catalogue on the web? Can we do a UI refresh as a fast-follow?
- **Objective** — To write a document defining the MVP scope for the wishlist sync, get feedback, and get it prioritized for the next quarter.

## L/N/O Tasks

- [ ] **Task:** Write the MVP scope document for the Web/App Wishlist Sync.
  - **L/N/O:** L
  - **Reasoning:** `m21_leverage.md`: This document is a force multiplier that will align multiple teams (Web, App, Backend) on a critical, cross-functional initiative.
  - **Owner:** @PM
  - **Blockers:** `m32_bottlenecks.md`: Lack of clear decision on what to do with "Save for Later" and the priority of the Next.js migration.
  - **Impact:** `m05_second-order_thinking.md`: 1st order: A clear plan for the wishlist sync. 2nd order: Unblocks the Digital Catalogue, prevents future data loss incidents, and improves customer trust.
  - **Goal:** [[0. AI-brain-project/2025-11-04_Q4_Roadmap_Strategy/2025-11-04 – Wishlist Sync and Digital Catalogue Strategy]]
- [ ] **Task:** Investigate options for a "super MVP" UI refresh for the wishlist.
  - **L/N/O:** N
  - **Reasoning:** This is a neutral task to gather information. It doesn't have high leverage on its own, but it supports the larger goal of improving the wishlist experience.
  - **Owner:** @UX
  - **Blockers:** None
  - **Impact:** `m05_second-order_thinking.md`: 1st order: A set of options for a quick UI win. 2nd order: Could improve user satisfaction and engagement with the wishlist feature.
  - **Goal:** [[0. AI-brain-project/2025-11-04_Q4_Roadmap_Strategy/2025-11-04 – Wishlist Sync and Digital Catalogue Strategy]]
