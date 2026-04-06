---
title: 2025-11-10 – Wishlist Sanitization
date: 2025-11-10
lno_note_focus: N
tags:
  - day/2025-11-10
  - thread/2025-11-10-tech-wishlist
  - topic/engineering/feature
aliases:
  - Wishlist Sanitization 2025-11-10
status: processed
links:
  - "[[2025-11-10 – Tech & Wishlist Sync Planning]]"
---

# 2025-11-10 – Wishlist Sanitization

> [!goal] **Goal**
> To define a housekeeping process for removing obsolete or invalid items from user wishlists.

> [!summary] **TL;DR**
> 
> - Currently, when an item is removed from the product catalog (PDP), it is not deleted from the wishlist database, only hidden on the UI.
> - This has resulted in ~7GB of obsolete data since 2017.
> - A sanitization process is needed to permanently remove these invalid items from the database.
> - The proposed solution is to create an endpoint that checks item validity against the PDP and removes them if they are no longer available.

## 1) Context (Minto Pyramid Principle)

- **Situation** — User wishlists contain items that are no longer available for sale.
- **Complication** — The current system does not have a cron job or other process to clean this data, leading to database bloat (~7GB) and a confusing user experience where items appear with a "!" icon.
- **Key Questions** — How can we permanently remove invalid items? Should this be a batch job or a real-time check?
- **Objective** — To create a sanitization mechanism that removes invalid items from the wishlist database, likely via a dedicated endpoint that can be called as needed.

## 2) Structured Tasks

- [ ] **Task:** Create a sanitization endpoint to remove obsolete/invalid items from the wishlist database.
  - **L/N/O:** N
  - **Reasoning:** This is a necessary "housekeeping" task. It reduces **Friction** (`m17_friction-and-viscosity.md`) in the system caused by data bloat and improves the user experience.
  - **Owner:** @Mahini
  - **Blockers:** None.
  - **Impact:** 1st order: Invalid items are removed. 2nd order: Database performance improves, storage costs are reduced, and the user experience is cleaner.
  - **Goal:** [[2025-11-10 – Tech & Wishlist Sync Planning]]
