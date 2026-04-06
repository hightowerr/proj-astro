---
title: 2025-11-10 – Wishlist Item Limit
date: 2025-11-10
lno_note_focus: N
tags:
  - day/2025-11-10
  - thread/2025-11-10-tech-wishlist
  - topic/engineering/feature
aliases:
  - Wishlist Limit 2025-11-10
status: processed
links:
  - "[[2025-11-10 – Tech & Wishlist Sync Planning]]"
---

# 2025-11-10 – Wishlist Item Limit

> [!goal] **Goal**
> To define the requirement and technical approach for adding an item limit to the new wishlist.

> [!summary] **TL;DR**
> 
> - The current wishlist hangs after ~105 items are added.
> - A limit of 50 distinct items (quantity does not count) is proposed for the new wishlist.
> - This is to prevent performance degradation and mitigate bot activity.
> - The proposed technical solution is to add a configurable limit in the coding gateway.

## 1) Context (Minto Pyramid Principle)

- **Situation** — The new wishlist is being designed, and performance characteristics are being considered.
- **Complication** — Testing revealed that the current wishlist implementation hangs with a large number of items (~105). This, combined with potential bot activity, poses a risk to the new system.
- **Key Questions** — Should we impose a limit? What should the limit be? How should it be implemented?
- **Objective** — To agree on adding a configurable 50-item limit to the wishlist and to define the implementation at the gateway level.

## 2) Structured Tasks

- [ ] **Task:** Add a configurable item limit (defaulting to 50) to the wishlist in the coding gateway.
  - **L/N/O:** N
  - **Reasoning:** This is a necessary task to prevent a known failure mode. The cost of **Inversion** (`m07_inversion.md`) is poor performance and system instability, leading to a bad user experience.
  - **Owner:** @Mahini
  - **Blockers:** None.
  - **Impact:** 1st order: The system will reject attempts to add more than 50 items. 2nd order: System stability is protected, and a potential vector for bot abuse is closed off.
  - **Goal:** [[2025-11-10 – Tech & Wishlist Sync Planning]]
