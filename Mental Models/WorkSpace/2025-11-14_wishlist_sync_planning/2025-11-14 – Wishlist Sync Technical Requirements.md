---
title: 2025-11-14 – Wishlist Sync Technical Requirements
date: 2025-11-14
lno_note_focus: N
tags:
  - day/2025-11-14
  - thread/2025-11-14-wishlist-sync
  - topic/technical-discovery
  - topic/database-migration
aliases:
  - Wishlist Sync Tech Spec
links:
  - "[[0. AI-brain-project/2025-11-14_wishlist_sync_planning/2025-11-14 – Wishlist Sync Feature Planning Meeting]]"
---

# 2025-11-14 – Wishlist Sync Technical Requirements

> [!goal] **Goal**
> To define the technical investigation areas required to achieve a synchronized wishlist experience, focusing on database migration, guest user handling, and ensuring the integrity of critical downstream systems like CRM.

> [!summary] **TL;DR**
> - **Primary Technical Path:** App teams will migrate their wishlist data to the central web wishlist database.
> - **Action:** A technical spike is required to define the migration strategy, data format, and effort.
> - **Critical Risk:** The migration must flawlessly merge existing user wishlists without any data loss.
> - **Key Challenge:** The system must handle merging wishlists for users who are logged out and then sign in.
> - **Downstream System:** The solution must ensure that app-native CRM notifications (e.g., price drops) continue to function correctly for items added from any platform.

## 1) Context (Minto Pyramid Principle)

- **Situation** — The app and web platforms use separate, non-communicating databases for wishlists.
- **Complication** — To sync the lists, a single source of truth is required. The proposed solution is to make the web's database that source, which necessitates a complex data migration from the apps. This migration carries significant risk to user data.
- **Key Questions** — How can we migrate app data to the web database? What data format is needed? How do we merge guest and logged-in states? How do we prevent breaking existing CRM notification triggers?
- **Objective** — Outline the critical technical questions that must be answered in a discovery spike to de-risk the project and create a viable implementation plan.

## 2) L/N/O Tasks (grouped)

- [ ] **[L]** **Task:** Design the data migration strategy, including the process for merging app and web wishlists based on customer IDs.
  - **L/N/O:** L
  - **Reasoning:** This is the core technical enabler for the entire initiative. Getting this right is a massive force multiplier (`m21_leverage.md`) for all future wishlist-related features.
  - **Owner:** @WebEngTeam
  - **Blockers:** Requires a clear data schema and export format from the @AppEngTeam.
  - **Impact:** 1st order: Synced wishlists. 2nd order: Reduced customer frustration, enabled cross-platform features, unified data for analytics.
  - **Goal:** [[0. AI-brain-project/2025-11-14_wishlist_sync_planning/2025-11-14 – Wishlist Sync Feature Planning Meeting]]
- [ ] **[N]** **Task:** Define the logic for merging a guest user's wishlist with their account wishlist upon login.
  - **L/N/O:** N
  - **Reasoning:** This is a required, standard feature for a seamless user experience, but it doesn't fundamentally change the system's leverage. It's expected behavior.
  - **Owner:** @WebEngTeam
  - **Blockers:** None identified.
  - **Impact:** Prevents users from "losing" items they added while logged out, which is a major point of friction (`m17_friction-and-viscosity.md`).
  - **Goal:** [[0. AI-brain-project/2025-11-14_wishlist_sync_planning/2025-11-14 – Wishlist Sync Feature Planning Meeting]]
- [ ] **[N]** **Task:** Verify that the synced wishlist solution does not break existing app-native CRM notifications.
  - **L/N/O:** N
  - **Reasoning:** This is a critical risk mitigation task. Failure to do this could lead to a catastrophic failure of an existing feature (`m44_multiply_by_zero.md`).
  - **Owner:** @AppEngTeam, @WebEngTeam
  - **Blockers:** Requires understanding the exact event triggers the CRM system uses.
  - **Impact:** Prevents loss of a revenue-driving and user-engaging feature.
  - **Goal:** [[0. AI-brain-project/2025-11-14_wishlist_sync_planning/2025-11-14 – Wishlist Sync Feature Planning Meeting]]

## 3) Technical Investigation Areas

### Database Migration
- **Status:** A spike is planned to scope this effort.
- **Proposal:** App teams (iOS and Android) to migrate their wishlist data to the web's wishlist database.
- **Risk:** **Data Loss.** The migration must be perfect. Any loss of customer wishlist data is considered a catastrophic failure. A rollback plan is essential.
- **Action:** The spike must produce a document detailing the required data format (e.g., JSON export with customer IDs) and the step-by-step migration process.

### Guest & Logged-In Merging
- **Requirement:** The behavior must be consistent with the basket. When a user logs in, any items in their "guest" wishlist (stored locally or in a temporary profile) must be merged with their account's wishlist.
- **Question:** Does this logic need to be built on the app side, web side, or both?

### CRM & Downstream Systems
- **Context:** The app currently sends native push notifications for events like price drops on wishlisted items. This is a key engagement and revenue feature.
- **Risk:** **Broken Notifications.** If the new, unified wishlist system doesn't fire the same events that the app's native CRM integration expects, this functionality will break. This is a high-impact, "multiply by zero" risk.
- **Action:** The spike must involve investigating the current notification triggers. We need to confirm that after migration, adding an item on the web will still correctly trigger a price drop notification on the app.

### Android Platform
- **Requirement:** For the sync to be truly effective, the Android app must support multiple wishlists to achieve parity with iOS and the proposed web functionality.
- **Question:** What is the level of effort for the Android team to build this? Does the sync MVP depend on this, or can it be handled gracefully (e.g., all lists get bundled into one on Android initially)?

## 4) Links & Tags

- **Parent:** [[0. AI-brain-project/2025-11-14_wishlist_sync_planning/2025-11-14 – Wishlist Sync Feature Planning Meeting]]
- **Tags:** #day/2025-11-14, #thread/2025-11-14-wishlist-sync, #topic/technical-discovery, #topic/database-migration
