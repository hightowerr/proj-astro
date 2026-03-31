---
title: 2025-11-14 – Wishlist Sync User Flows Analysis
date: 2025-11-14
lno_note_focus: N
tags:
  - day/2025-11-14
  - thread/2025-11-14-wishlist-sync
  - topic/product-planning
  - topic/user-experience
aliases:
  - Wishlist Sync UX
links:
  - "[[0. AI-brain-project/2025-11-14_wishlist_sync_planning/2025-11-14 – Wishlist Sync Feature Planning Meeting]]"
---

# 2025-11-14 – Wishlist Sync User Flows Analysis

> [!goal] **Goal**
> To define and analyze the proposed user experience for the Wishlist Sync MVP, focusing on the cross-platform user journey and the compromises needed due to the web's technical limitations.

> [!summary] **TL;DR**
> - **Core User Journey:** A user's wishlists will be visible and consistent across both app and web.
> - **Web MVP Compromise:** Due to a blocker on the Product Detail Page (PDP), the web will use a "default" wishlist. Users won't be able to select a specific list to add to from the web PDP.
> - **"Wishlist of Dreams":** This special list, created via the Digital Catalogue on the app, will be visible on the web but will be read-only from the PDP.
> - **Blocker:** The inability for the web PDP to support an "add to specific list" feature is the primary constraint forcing this compromised MVP experience.
> - **Platform Gap:** Android currently lacks multi-list functionality, which will lead to an inconsistent experience until it's built.

## 1) Context (Minto Pyramid Principle)

- **Situation** — The goal is a seamless, synchronized wishlist experience. However, the app supports multiple, named wishlists, while the web has technical constraints.
- **Complication** — The web's Product Detail Page (PDP) team cannot currently support a feature allowing users to choose which wishlist to add an item to. This prevents the web from having true feature parity with the app's multi-list creation and management capabilities.
- **Key Questions** — How can we present a coherent UX on the web without the "add to specific list" feature? How will the "Wishlist of Dreams" behave on the web? What is the desired experience on Android?
- **Objective** — Define an MVP user flow that works around the PDP limitation while still delivering the core value of a synced, cross-platform wishlist.

## 2) L/N/O Tasks (grouped)

- [ ] **[L]** **Task:** Design and validate the "default wishlist" user experience on the web.
  - **L/N/O:** L
  - **Reasoning:** This design is the key that unlocks the entire MVP. It works around a major bottleneck (`m32_bottlenecks.md`) and allows the project to move forward without being blocked by an external team's roadmap.
  - **Owner:** @WebDesignTeam (Clear)
  - **Blockers:** Dependent on stakeholder (product, engineering) agreement that this compromise is acceptable for the MVP.
  - **Impact:** 1st order: Allows the sync feature to launch. 2nd order: Starts delivering user value sooner and provides a platform to build on once the PDP limitation is removed.
  - **Goal:** [[0. AI-brain-project/2025-11-14_wishlist_sync_planning/2025-11-14 – Wishlist Sync Feature Planning Meeting]]
- [ ] **[N]** **Task:** Plan the future-state user experience for when the PDP "add to specific list" feature becomes available.
  - **L/N/O:** N
  - **Reasoning:** This is important for long-term vision but is not on the critical path for the MVP. It's standard future-state planning.
  - **Owner:** @WebDesignTeam
  - **Blockers:** None.
  - **Impact:** Ensures the MVP is a step towards a cohesive final design, not a throwaway solution.
  - **Goal:** [[0. AI-brain-project/2025-11-14_wishlist_sync_planning/2025-11-14 – Wishlist Sync Feature Planning Meeting]]
- [ ] **[N]** **Task:** Define the user experience on Android, both for the MVP (if multi-list is not ready) and the target state.
  - **L/N/O:** N
  - **Reasoning:** This is required for platform parity but is a separate stream of work from the core sync logic.
  - **Owner:** @AppTeam
  - **Blockers:** Engineering effort on the Android team.
  - **Impact:** A consistent experience across all platforms will improve user satisfaction and reduce confusion.
  - **Goal:** [[0. AI-brain-project/2025-11-14_wishlist_sync_planning/2025-11-14 – Wishlist Sync Feature Planning Meeting]]

## 3) Proposed MVP User Experience

### Web Experience
1.  **Viewing Wishlists:**
    - The user navigates to their wishlist page on the web.
    - They see a list of all their wishlists, identical to what they see on the app. This includes any custom-named lists and the "Wishlist of Dreams."
2.  **Adding to Wishlist (The Compromise):**
    - The user is on a Product Detail Page (PDP) and clicks the "favorite" (heart) icon.
    - **Blocker:** The system cannot ask "Which list do you want to add this to?"
    - **MVP Behavior:** The item is automatically added to a single, non-editable "Default Wishlist."
    - This "Default Wishlist" is visible alongside all other lists.
3.  **Managing Wishlists:**
    - Users can view all lists.
    - The ability to create, rename, or delete lists on the web would be part of a later phase, as the primary interaction (adding items) is constrained.

### App Experience (iOS)
- No change. The user can create multiple lists, name them, and choose a specific list when adding an item. These lists will now be visible on the web.

### "Wishlist of Dreams" (Digital Catalogue)
- This list is created on the app when a user favorites an item in the Digital Catalogue.
- On the web, this list will appear just like any other.
- A user cannot add items to it directly from the web PDP; they would have to use the app or potentially move items into it from their Default Wishlist on the web wishlist page (if that management feature is built).

### Android Experience
- **Current State:** Only a single wishlist is supported.
- **MVP Problem:** If an iOS user creates multiple lists, how do they appear on Android?
- **Proposed MVP Behavior (to be confirmed):** All items from all lists are bundled and appear in the single Android wishlist. This is not ideal but may be a necessary starting point.
- **Target State:** Android must build multi-list functionality to achieve a consistent cross-platform experience.

## 4) Links & Tags

- **Parent:** [[0. AI-brain-project/2025-11-14_wishlist_sync_planning/2025-11-14 – Wishlist Sync Feature Planning Meeting]]
- **Tags:** #day/2025-11-14, #thread/2025-11-14-wishlist-sync, #topic/product-planning, #topic/user-experience
