---
title: 2025-11-14 – Wishlist Sync Feature Planning Meeting
date: 2025-11-14
lno_note_focus: L
tags:
  - day/2025-11-14
  - thread/2025-11-14-wishlist-sync
  - topic/product-planning
  - topic/technical-discovery
aliases:
  - Wishlist Sync Planning
links:
  - "[[2025-11-14 – Wishlist Sync Technical Requirements]]"
  - "[[2025-11-14 – Wishlist Sync User Flows Analysis]]"
  - "[[2025-11-14 – Stakeholder Actions and Dependencies]]"
---

# 2025-11-14 – Wishlist Sync Feature Planning Meeting

> [!goal] **Goal**
> To align on the minimum viable product (MVP) and technical approach for synchronizing customer wishlists between the web and mobile app platforms, ensuring a seamless user experience and supporting the upcoming "Digital Catalogue" feature.

> [!summary] **TL;DR**
> - The core objective is to sync wishlists across App & Web to resolve a major customer pain point.
> - A key dependency is the "Digital Catalogue" feature, which will create a special "Wishlist of Dreams."
> - **Technical Approach:** The leading proposal is for the mobile apps to migrate to the web's existing wishlist database. A technical spike is planned to assess this.
> - **UX Blocker:** The web's Product Detail Page (PDP) cannot currently support adding items to a *specific* wishlist, complicating a full multi-list experience on the web.
> - **MVP Proposal:** Implement a "default" wishlist on the web for all new additions, while still displaying app-created lists (like "Wishlist of Dreams").
> - **Critical Risk:** Data integrity during migration is non-negotiable; losing customer wishlists would be a catastrophic failure.

## 1) Context (Minto Pyramid Principle)

- **Situation** — The wishlist functionality on the web and mobile apps are disconnected, leading to customer frustration. A new "Digital Catalogue" feature is being developed on the app which will introduce a "Wishlist of Dreams," increasing the need for a synchronized experience.
- **Complication** — The web and app teams use separate databases. Furthermore, the web PDP has technical limitations that prevent adding items to a specific, user-chosen wishlist, which is a core feature of the app's multi-list functionality.
- **Key Questions** — What is the simplest technical path to synchronization? How can we provide a coherent user experience despite the PDP limitation? What are the risks and dependencies for the proposed database migration?
- **Objective** — Define the scope of an MVP for wishlist sync, identify the technical and design actions required, and align on the path forward for the cross-platform feature.

## 2) L/N/O Tasks (grouped)

- [ ] **[L]** Define the technical approach for database migration and sync logic. #lno/l
- [ ] **[L]** Finalize the MVP user experience for web, balancing technical constraints with user needs. #lno/l
- [ ] **[N]** Conduct a technical spike to determine the feasibility and requirements of the database migration. #lno/n
- [ ] **[N]** Align with the PDP team on their roadmap and potential for enabling "add to specific list" functionality. #lno/n
- [ ] **[N]** Ensure Android platform develops multi-list capability to align with the synced experience. #lno/n
- [ ] **[O]** Document all decisions and actions to ensure stakeholder alignment. #lno/o

## 3) Meeting Notes & Signals

- **Participants:** Sophia (Web Basket PM), Shannon (Digital Catalogue), Greg (Web Eng), App Team representatives.
- **Core Problem:** Customers are frustrated that wishlists are not synced between app and web.
- **Leadership: Initiative:** Wishlist Sync (App & Web). **Goal:** Unify the customer wishlist experience across all platforms to reduce user friction and support new features.
- **Blocker:** The web PDP team has previously indicated they cannot support adding an item to a *specific* wishlist. This is a major blocker for achieving true multi-list parity on the web.
- **Proposed Solution (Web):**
    - Create a "default" wishlist on web. Any item favorited on web goes into this list.
    - App-created lists (including the "Wishlist of Dreams" from the Digital Catalogue) would be visible on the web, but not directly addable-to from the PDP.
- **Technical Strategy:**
    - **Status:** The web team is proposing the app migrates its data to the web's wishlist database. A spike is planned to investigate this.
    - **Risk:** A migration must be seamless. Sophia emphasized that losing customer data is unacceptable ("break so"). The migration must merge lists based on Customer ID.
    - **Question:** How will guest/logged-out user wishlists be handled when they log in? The expectation is they merge, similar to the basket.
- **Dependencies & Actions:**
    - The web team's spike needs to define the data format required from the app team for migration.
    - **Action:** Greg to talk to Faye (PDP contact) to get an updated status on their ability to support the feature.
    - **Action:** Greg to talk to Clear (Design) about the "default list" MVP compromise.
    - **Action:** App team to investigate adding multi-list functionality to Android.
- **Additional Concerns:**
    - **Risk:** CRM integration needs to be verified. Price drop notifications, which are currently native to the app, must continue to work for items added via the web after the sync. This is a potential "multiply by zero" issue if it breaks.

## 4) Links & Tags

- **Children:** [[2025-11-14 – Wishlist Sync Technical Requirements]], [[2025-11-14 – Wishlist Sync User Flows Analysis]], [[2025-11-14 – Stakeholder Actions and Dependencies]]
- **Tags:** #day/2025-11-14, #thread/2025-11-14-wishlist-sync, #topic/product-planning, #topic/technical-discovery
