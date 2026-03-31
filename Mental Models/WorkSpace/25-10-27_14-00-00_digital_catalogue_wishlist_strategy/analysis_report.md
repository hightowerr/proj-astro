# Part 1: Initial Generation

```markdown
---
title: "2025-10-27 – Digital Catalogue & Wishlist Sync Strategy"
date: 2025-10-27
lno_note_focus: "L"
tags:
  - day/2025-10-27
  - thread/2025-10-27-digital-catalogue
  - topic/strategy
  - initiative/digital-catalogue
  - initiative/wishlist
aliases: ["Digital Catalogue & Wishlist Sync Discussion"]
links: ["[[2025-10-27 – Digital Catalogue Vision & Features]]", "[[2025-10-27 – The Critical Blocker – Unsynced Wishlists]]", "[[2025-10-27 – Defining the Wishlist Sync MVP]]", "[[2025-10-27 – The Order Summary Calculation Problem]]"]
---

# 2025-10-27 – Digital Catalogue & Wishlist Sync Strategy

> [!goal] **Goal**
> To align on the strategic vision for the app-only Digital Catalogue and, more critically, to define the scope of the foundational Wishlist Sync MVP required to make it viable.

> [!summary] **TL;DR**
> - **Digital Catalogue Vision:** An app-only, personalized, and inspirational content hub (the "new for you page") designed to give customers a unique reason to download and repeatedly use the app. Targeted for a Q1 pre-Easter launch.
> - **Critical Blocker:** The entire Digital Catalogue strategy is fundamentally blocked by the fact that web and app wishlists do not sync. The current app wishlist is a temporary, device-level cache, which has already led to a major incident where users lost their entire wishlists.
> - **MVP Decision:** The immediate priority is to define and build a backend solution to properly sync wishlists between web and app. The MVP for this sync must, at a minimum, support multiple named wishlists and ensure feature parity with the current app experience.
> - **Action:** The Basket PM will write the MVP scope document for the Web/App Wishlist Sync and share it for feedback, targeting the work for the next quarter.
> - **Related Issue:** A separate, but newly discovered, critical issue exists where incorrect basket subtotals are sent to downstream systems like Argos Pay, which needs to be addressed urgently.

## 1) Input

Transcript of a strategy discussion about the Digital Catalogue and Wishlist Syncing, dated October 27, 2025.

## 2) Context (Minto Pyramid Principle)

- **Situation** — The business is developing a new, app-only "Digital Catalogue" experience to drive engagement. The core interaction of this feature is adding items to a wishlist.
- **Complication** — The underlying wishlist functionality is not fit for purpose. It doesn't sync between web and app, and the app implementation is a fragile, device-level cache that has already caused a major data-loss incident for customers.
- **Key Questions** — What is the vision for the Digital Catalogue? What is the minimum viable product for syncing wishlists to support this? What are the risks if we don't fix the underlying wishlist problem?
- **Objective** — To align on the critical need to prioritize the Wishlist Sync project and to define the scope of its MVP to unblock the Digital Catalogue initiative and fix a major customer-facing issue.

## 3) L/N/O Tasks (grouped)

- [ ] **Task:** Write the MVP scope document for the Web/App Wishlist Sync.
  - **L/N/O:** L
  - **Reasoning:** This is the highest **Leverage** task. According to **`m32_bottlenecks.md`**, the lack of a synced wishlist is the primary **Bottleneck** for the entire Digital Catalogue strategy. This document is the first step to removing that bottleneck. The cost of **Inversion** is the failure of a major strategic initiative and continued exposure to data-loss incidents for customers.
  - **Owner:** @PM (Basket)
  - **Blockers:** None to writing the doc, but requires input from the app team.
  - **Impact:** 1st order: A clear scope is defined and agreed upon. 2nd order: The development team can begin work on the backend solution, unblocking the Digital Catalogue and dramatically improving the customer experience.
  - **Goal:** [[2025-10-27 – Defining the Wishlist Sync MVP]]
- [ ] **Task:** Investigate the technical details and user impact of the incorrect order summary calculation.
  - **L/N/O:** L
  - **Reasoning:** This is a high-**Leverage** task because it addresses a newly discovered, high-impact bug. The cost of **Inversion** is sending incorrect financial information to customers via Argos Pay, which could have legal and significant customer trust implications (a "multiply by zero" event).
  - **Owner:** @PM (Basket)
  - **Blockers:** None mentioned.
  - **Impact:** 1st order: The full scope and risk of the bug are understood. 2nd order: A fix can be prioritized, preventing a major customer-facing incident.
  - **Goal:** [[2025-10-27 – The Order Summary Calculation Problem]]

## 4) Links & Tags

- Child links: [[2025-10-27 – Digital Catalogue Vision & Features]], [[2025-10-27 – The Critical Blocker – Unsynced Wishlists]], [[2025-10-27 – Defining the Wishlist Sync MVP]], [[2025-10-27 – The Order Summary Calculation Problem]]
- Tags: #day/2025-10-27, #thread/2025-10-27-digital-catalogue, #topic/strategy, #initiative/digital-catalogue, #initiative/wishlist
```

```markdown
---
title: "2025-10-27 – Digital Catalogue Vision & Features"
date: 2025-10-27
lno_note_focus: "N"
tags:
  - day/2025-10-27
  - thread/2025-10-27-digital-catalogue
  - topic/product-vision
  - initiative/digital-catalogue
aliases: ["The Digital Catalogue Experience"]
links: ["[[2025-10-27 – Digital Catalogue & Wishlist Sync Strategy]]"]
---

# 2025-10-27 – Digital Catalogue Vision & Features

> [!goal] **Goal**
> To provide a unique, app-only experience that gives customers a reason to download and repeatedly engage with the app through personalized and inspirational content.

> [!summary] **TL;DR**
> - **Concept:** An app-only, editorial-style content hub, branded as the "Digital Catalogue" to evoke nostalgia.
> - **Content:** A mix of hyper-personalized product recommendations (at SKU and category level) and thematic, mission-based content (e.g., "Gift Ideas").
> - **Key Interaction:** The primary CTA is to add items to a wishlist, specifically a new, auto-created list called "Your Wishlist of Dreams."
> - **Launch Target:** Q1, pre-Easter.

## 1) Context (Minto Pyramid Principle)

- **Situation** — The business wants to give customers a compelling, unique reason to download and use the native app.
- **Complication** — A simple "for you" page is not enough of a marketing hook. The experience needs a stronger brand and a more inspirational, editorial feel.
- **Key Questions** — How do we make the app experience unique? How do we balance personalization with discovery for other shopping missions (like gifting)?
- **Objective** — To create a beautiful, engaging, and valuable app-only feature that drives downloads and repeat usage.

## 2) Key Features

- **App-Only:** This experience will not be on the web.
- **Personalization:** Leverages existing personalization data to show relevant products, but also includes non-personalized content for discovery.
- **Gifting Focus:** Tabs for different gifting "missions" (e.g., gifts for her, gifts under £10).
- **Editorial Feel:** Stripped-back UI, focusing on inspirational imagery and video content rather than price.
- **"Wishlist of Dreams":** A new, default wishlist created automatically when a user saves an item from the catalogue, playing on the nostalgia of the old print catalogue.

## 3) Links & Tags
- Parent link: [[2025-10-27 – Digital Catalogue & Wishlist Sync Strategy]]
- Tags: #day/2025-10-27, #thread/2025-10-27-digital-catalogue, #topic/product-vision, #initiative/digital-catalogue
```

```markdown
---
title: "2025-10-27 – The Critical Blocker – Unsynced Wishlists"
date: 2025-10-27
lno_note_focus: "L"
tags:
  - day/2025-10-27
  - thread/2025-10-27-digital-catalogue
  - topic/risk-management
  - topic/technical-debt
aliases: ["The Wishlist Problem"]
links: ["[[2025-10-27 – Digital Catalogue & Wishlist Sync Strategy]]"]
---

# 2025-10-27 – The Critical Blocker – Unsynced Wishlists

> [!goal] **Goal**
> To articulate the severity of the current wishlist implementation and why it is a critical blocker for any future wishlist-dependent features, including the Digital Catalogue.

> [!summary] **TL;DR**
> - **Core Problem:** Web and App wishlists are completely separate and do not sync.
> - **App Implementation is a Fragile Cache:** All wishlist data on the app is stored in the device's local cache. If the cache is cleared, the user's wishlist is **permanently lost**.
> - **Past Incident:** This exact data-loss scenario has already happened, causing a major customer-facing incident.
> - **Cross-Device Failure:** A user signed into their account on a new device will not see their wishlist, as it's tied to the original device's cache.
> - **Conclusion:** The current implementation is not fit for purpose and must be replaced with a proper backend solution before any new features are built on top of it.

## 1) Context (Minto Pyramid Principle)

- **Situation** — The Digital Catalogue relies on the wishlist as its primary call to action.
- **Complication** — The underlying wishlist technology is fundamentally broken from a cross-platform perspective. It is not a persistent, account-level feature, but a temporary, device-level cache.
- **Key Questions** — Why can't we build the Digital Catalogue on the current wishlist? What happened during the last incident? What is the true customer experience across multiple devices?
- **Objective** — To establish that fixing the wishlist backend is not an optional enhancement but a critical prerequisite to unblock the Digital Catalogue and prevent future data-loss incidents.

## 2) Key Risks

- **Data Loss:** The current cache-based approach is fragile and has already led to users permanently losing their wishlists.
- **Customer Frustration:** Users expect their data to be tied to their account, not their device. The current experience is confusing and frustrating, eroding trust.
- **Strategic Failure:** The entire Digital Catalogue initiative, which is a major strategic push for the app, cannot succeed if the core wishlist functionality is unreliable and not synced with the web.

## 3) Links & Tags
- Parent link: [[2025-10-27 – Digital Catalogue & Wishlist Sync Strategy]]
- Tags: #day/2025-10-27, #thread/2025-10-27-digital-catalogue, #topic/risk-management, #topic/technical-debt
```

```markdown
---
title: "2025-10-27 – Defining the Wishlist Sync MVP"
date: 2025-10-27
lno_note_focus: "L"
tags:
  - day/2025-10-27
  - thread/2025-10-27-digital-catalogue
  - topic/mvp
  - initiative/wishlist
aliases: ["Wishlist Sync MVP Scope"]
links: ["[[2025-10-27 – Digital Catalogue & Wishlist Sync Strategy]]"]
---

# 2025-10-27 – Defining the Wishlist Sync MVP

> [!goal] **Goal**
> To define the minimum viable scope for a new, synced, backend-driven wishlist solution that can be delivered in the next quarter.

> [!summary] **TL;DR**
> - **Core Requirement:** A backend solution is needed to store wishlist data at the account level, not the device level.
> - **MVP Scope:** At a minimum, the new solution must support multiple, named wishlists (feature parity with the current app) and sync them between web and app.
> - **Out of Scope (for now):** The ability to add items to a *specific* named wishlist from the web is not required for MVP, as the web currently only has a single wishlist concept.
> - **Key Features to Retain:** The ability to "combine wishlists" and the "notify on price drop" toggle must be investigated and likely retained.

## 1) Context (Minto Pyramid Principle)

- **Situation** — The team has agreed that syncing wishlists is a top priority.
- **Complication** — The team needs to define what a "Minimum Viable Product" for this sync looks like to make the project achievable in the next quarter.
- **Key Questions** — What is the minimum feature set we need to support? What can be deferred? How does this interact with the "Wishlist of Dreams" concept from the Digital Catalogue?
- **Objective** — To create a clear MVP document that the backend team can use to build the new service.

## 2) L/N/O Tasks (grouped)

- [ ] **Task:** Write the MVP scope document for the Web/App Wishlist Sync.
  - **L/N/O:** L
  - **Reasoning:** This is the primary **Bottleneck** to starting development. This document will provide the clarity needed for the engineering team to act.
  - **Owner:** @PM (Basket)
  - **Blockers:** None.
  - **Impact:** 1st order: A clear plan is created. 2nd order: Development can begin on the highest priority strategic project for the next quarter.
  - **Goal:** [[2025-10-27 – Defining the Wishlist Sync MVP]]
- [ ] **Task:** Investigate usage data for the "combine wish lists" feature to determine its inclusion in the MVP.
  - **L/N/O:** N
  - **Reasoning:** This is a data-gathering task to inform the MVP scope and prevent scope creep if the feature is not used.
  - **Owner:** @PM
  - **Blockers:** The feature may not be tagged for analytics.
  - **Impact:** 1st order: A data-informed decision is made. 2nd order: The MVP is kept as lean as possible.
  - **Goal:** [[2025-10-27 – Defining the Wishlist Sync MVP]]
- [ ] **Task:** Confirm that the "notify on price drop" feature will be retained and how it will function in the new synced architecture.
  - **L/N/O:** N
  - **Reasoning:** This is a requirement-gathering task to ensure feature parity and avoid a negative customer experience.
  - **Owner:** @PM
  - **Blockers:** The technical implementation may be complex.
  - **Impact:** 1st order: The feature's future is decided. 2nd order: A key marketing and user-retention tool is preserved.
  - **Goal:** [[2025-10-27 – Defining the Wishlist Sync MVP]]

## 3) Links & Tags
- Parent link: [[2025-10-27 – Digital Catalogue & Wishlist Sync Strategy]]
- Tags: #day/2025-10-27, #thread/2025-10-27-digital-catalogue, #topic/mvp, #initiative/wishlist
```

```markdown
---
title: "2025-10-27 – The Order Summary Calculation Problem"
date: 2025-10-27
lno_note_focus: "L"
tags:
  - day/2025-10-27
  - thread/2025-10-27-digital-catalogue
  - topic/risk-management
  - topic/bug
aliases: ["Basket Subtotal Bug"]
links: ["[[2025-10-27 – Digital Catalogue & Wishlist Sync Strategy]]"]
---

# 2025-10-27 – The Order Summary Calculation Problem

> [!goal] **Goal**
> To understand and address the critical bug where the basket subtotal does not correctly filter by fulfilment type, causing incorrect totals to be sent to downstream systems like Argos Pay.

> [!summary] **TL;DR**
> - **The Bug:** The basket sends the *entire* basket total to the SBE service, without filtering for fulfilment type. This means a basket containing a delivery-only item (like a sofa) will have that item's price included in the total sent to Argos Pay, even if the user has selected Click & Collect.
> - **Impact:** This causes Argos Pay to return an incorrect financing plan, as it is calculated on the wrong total. This is a major customer-facing issue and a potential legal/financial risk.
> - **Urgency:** This has been an issue for a long time but has only been surfaced now due to the Argos+ work. It needs to be addressed urgently.

## 1) Context (Minto Pyramid Principle)

- **Situation** — During a discussion about the Digital Catalogue, a separate, long-standing bug was raised regarding the basket's order summary calculation.
- **Complication** — The basket does not filter its contents by fulfilment type before calculating the total that is sent to other services. This means ineligible items are included in financial calculations.
- **Key Questions** — Why has this not been caught before? What is the full impact on Argos Pay and Argos+? How quickly can we fix this?
- **Objective** — To raise the alarm on this critical bug and get it prioritized for an immediate fix.

## 2) Links & Tags
- Parent link: [[2025-10-27 – Digital Catalogue & Wishlist Sync Strategy]]
- Tags: #day/2025-10-27, #thread/2025-10-27-digital-catalogue, #topic/risk-management, #topic/bug
```

# Optional: Report Sections

## ⚠️ Risk Report

| Field | Description |
|:--|:--|
| **Risk ID** | `risk/wishlist-data-loss` |
| **Description** | The current app wishlist is a device-level cache, not a persistent, account-level feature. This has already led to a major incident where users permanently lost their wishlists. |
| **Context / Evidence** | Speaker notes: "as soon as your cash is cleared that's it like he's gone... I don't know if you know about the incident that we had would wish this reason... it means that any any time in a customer absent an item to their wishes that all of that data is stored on the customer's device." |
| **Mitigations / Actions** | The only mitigation is to build a proper backend solution that syncs the wishlist to the user's account. This is being scoped as the "Wishlist Sync MVP." |
| **Owner(s)** | @PM (Basket) |
| **Next Steps / Date** | Prioritize the Wishlist Sync MVP for the next quarter. |
| **Risk ID** | `risk/incorrect-financial-calculations` |
| **Description** | The basket sends an incorrect subtotal to downstream systems (like Argos Pay) because it doesn't filter by fulfilment type. This can result in incorrect financial plans being offered to customers. |
| **Context / Evidence** | Speaker notes: "if you then send that to Argos pay they're gonna send you a plan that's gotta be wrong because it's going to say you qualify for something that you actually move down qualify for." |
| **Mitigations / Actions** | This needs to be investigated urgently to understand the full impact and to scope a fix. |
| **Owner(s)** | @PM (Basket) |
| **Next Steps / Date** | Raise as a critical bug and schedule a follow-up technical discussion. |

## 🏗️ Leadership Update

| Field | Description |
|:--|:--|
| **Initiative Name** | Digital Catalogue & Wishlist Strategy |
| **Summary** | A strategic review has revealed that the flagship "Digital Catalogue" app initiative is critically blocked by the lack of a persistent, cross-platform wishlist. The current app wishlist is a fragile, device-level cache that has already caused customer data loss. |
| **Metric Goal** | Unblock the Digital Catalogue and eliminate the risk of customer data loss by building a backend-driven, synced wishlist. |
| **Current Progress** | The problem has been identified and a decision has been made to prioritize the Wishlist Sync project for the next quarter. The MVP scope is now being defined. |
| **Next Milestone** | Delivery of the Wishlist Sync MVP scope document. |

## 🚨 Bad News / Blocker Report

| Field | Description |
|:--|:--|
| **Blocker / Issue** | Wishlist Architecture Blocks Digital Catalogue |
| **Description** | The entire Digital Catalogue project, a major strategic initiative for the app, is blocked by the fact that the underlying wishlist service is not fit for purpose. It does not sync between web and app. |
| **Impact / Scope** | This blocks a Q1 launch of the Digital Catalogue. It also represents a significant ongoing risk of customer data loss and a poor cross-device user experience. |
| **Resolution / Workaround** | There is no workaround. A new backend service for wishlists must be built. The Basket team is taking the lead on scoping the MVP for this. |
| **Help Needed By (Date)** | **2025-11-10:** The MVP scope needs to be defined and agreed upon so that it can be factored into planning for the next quarter. |

# Part 2: Review Analysis

---
title: "2025-10-27 – Review Analysis"
date: 2025-10-27
tags: [day/2025-10-27, thread/2025-10-27-digital-catalogue]
---

# 2025-10-27 – Review Analysis

## Quality Assessment
The system successfully identified the two distinct but related topics of the conversation: the forward-looking Digital Catalogue vision and the immediate, critical problem with the underlying Wishlist architecture. It correctly structured the notes to reflect that the Wishlist issue is a blocker for the Catalogue vision. Task and report generation were accurate, correctly identifying the high-impact, high-urgency nature of both the Wishlist Sync and the Order Summary bug.

## Critical Issues
No critical issues were found. The transcript was clear enough to distinguish between the aspirational/visionary parts of the conversation and the urgent technical problems.

## Recommendations
None. The generated notes provide a clear summary and action plan.

# Part 3: Final Refined Notes

```markdown
---
title: "2025-10-27 – Digital Catalogue & Wishlist Sync Strategy"
date: 2025-10-27
lno_note_focus: "L"
tags:
  - day/2025-10-27
  - thread/2025-10-27-digital-catalogue
  - topic/strategy
  - initiative/digital-catalogue
  - initiative/wishlist
aliases: ["Digital Catalogue & Wishlist Sync Discussion"]
links: ["[[2025-10-27 – Digital Catalogue Vision & Features]]", "[[2025-10-27 – The Critical Blocker – Unsynced Wishlists]]", "[[2025-10-27 – Defining the Wishlist Sync MVP]]", "[[2025-10-27 – The Order Summary Calculation Problem]]"]
status: processed
---

# 2025-10-27 – Digital Catalogue & Wishlist Sync Strategy

> [!goal] **Goal**
> To align on the strategic vision for the app-only Digital Catalogue and, more critically, to define the scope of the foundational Wishlist Sync MVP required to make it viable.

> [!summary] **TL;DR**
> - **Digital Catalogue Vision:** An app-only, personalized, and inspirational content hub (the "new for you page") designed to give customers a unique reason to download and repeatedly use the app. Targeted for a Q1 pre-Easter launch.
> - **Critical Blocker:** The entire Digital Catalogue strategy is fundamentally blocked by the fact that web and app wishlists do not sync. The current app wishlist is a temporary, device-level cache, which has already led to a major incident where users lost their entire wishlists.
> - **MVP Decision:** The immediate priority is to define and build a backend solution to properly sync wishlists between web and app. The MVP for this sync must, at a minimum, support multiple named wishlists and ensure feature parity with the current app experience.
> - **Action:** The Basket PM will write the MVP scope document for the Web/App Wishlist Sync and share it for feedback, targeting the work for the next quarter.
> - **Related Issue:** A separate, but newly discovered, critical issue exists where incorrect basket subtotals are sent to downstream systems like Argos Pay, which needs to be addressed urgently.

## 1) Input

Transcript of a strategy discussion about the Digital Catalogue and Wishlist Syncing, dated October 27, 2025.

## 2) Context (Minto Pyramid Principle)

- **Situation** — The business is developing a new, app-only "Digital Catalogue" experience to drive engagement. The core interaction of this feature is adding items to a wishlist.
- **Complication** — The underlying wishlist functionality is not fit for purpose. It doesn't sync between web and app, and the app implementation is a fragile, device-level cache that has already caused a major data-loss incident for customers.
- **Key Questions** — What is the vision for the Digital Catalogue? What is the minimum viable product for syncing wishlists to support this? What are the risks if we don't fix the underlying wishlist problem?
- **Objective** — To align on the critical need to prioritize the Wishlist Sync project and to define the scope of its MVP to unblock the Digital Catalogue initiative and fix a major customer-facing issue.

## 3) L/N/O Tasks (grouped)

- [ ] **Task:** Write the MVP scope document for the Web/App Wishlist Sync.
  - **L/N/O:** L
  - **Reasoning:** This is the highest **Leverage** task. According to **`m32_bottlenecks.md`**, the lack of a synced wishlist is the primary **Bottleneck** for the entire Digital Catalogue strategy. This document is the first step to removing that bottleneck. The cost of **Inversion** is the failure of a major strategic initiative and continued exposure to data-loss incidents for customers.
  - **Owner:** @PM (Basket)
  - **Blockers:** None to writing the doc, but requires input from the app team.
  - **Impact:** 1st order: A clear scope is defined and agreed upon. 2nd order: The development team can begin work on the backend solution, unblocking the Digital Catalogue and dramatically improving the customer experience.
  - **Goal:** [[2025-10-27 – Defining the Wishlist Sync MVP]]
- [ ] **Task:** Investigate the technical details and user impact of the incorrect order summary calculation.
  - **L/N/O:** L
  - **Reasoning:** This is a high-**Leverage** task because it addresses a newly discovered, high-impact bug. The cost of **Inversion** is sending incorrect financial information to customers via Argos Pay, which could have legal and significant customer trust implications (a "multiply by zero" event).
  - **Owner:** @PM (Basket)
  - **Blockers:** None mentioned.
  - **Impact:** 1st order: The full scope and risk of the bug are understood. 2nd order: A fix can be prioritized, preventing a major customer-facing incident.
  - **Goal:** [[2025-10-27 – The Order Summary Calculation Problem]]

## 4) Links & Tags

- Child links: [[2025-10-27 – Digital Catalogue Vision & Features]], [[2025-10-27 – The Critical Blocker – Unsynced Wishlists]], [[2025-10-27 – Defining the Wishlist Sync MVP]], [[2025-10-27 – The Order Summary Calculation Problem]]
- Tags: #day/2025-10-27, #thread/2025-10-27-digital-catalogue, #topic/strategy, #initiative/digital-catalogue, #initiative/wishlist
```

```markdown
---
title: "2025-10-27 – Digital Catalogue Vision & Features"
date: 2025-10-27
lno_note_focus: "N"
tags:
  - day/2025-10-27
  - thread/2025-10-27-digital-catalogue
  - topic/product-vision
  - initiative/digital-catalogue
aliases: ["The Digital Catalogue Experience"]
links: ["[[2025-10-27 – Digital Catalogue & Wishlist Sync Strategy]]"]
---

# 2025-10-27 – Digital Catalogue Vision & Features

> [!goal] **Goal**
> To provide a unique, app-only experience that gives customers a reason to download and repeatedly engage with the app through personalized and inspirational content.

> [!summary] **TL;DR**
> - **Concept:** An app-only, editorial-style content hub, branded as the "Digital Catalogue" to evoke nostalgia.
> - **Content:** A mix of hyper-personalized product recommendations (at SKU and category level) and thematic, mission-based content (e.g., "Gift Ideas").
> - **Key Interaction:** The primary CTA is to add items to a wishlist, specifically a new, auto-created list called "Your Wishlist of Dreams."
> - **Launch Target:** Q1, pre-Easter.

## 1) Context (Minto Pyramid Principle)

- **Situation** — The business wants to give customers a compelling, unique reason to download and use the native app.
- **Complication** — A simple "for you" page is not enough of a marketing hook. The experience needs a stronger brand and a more inspirational, editorial feel.
- **Key Questions** — How do we make the app experience unique? How do we balance personalization with discovery for other shopping missions (like gifting)?
- **Objective** — To create a beautiful, engaging, and valuable app-only feature that drives downloads and repeat usage.

## 2) Key Features

- **App-Only:** This experience will not be on the web.
- **Personalization:** Leverages existing personalization data to show relevant products, but also includes non-personalized content for discovery.
- **Gifting Focus:** Tabs for different gifting "missions" (e.g., gifts for her, gifts under £10).
- **Editorial Feel:** Stripped-back UI, focusing on inspirational imagery and video content rather than price.
- **"Wishlist of Dreams":** A new, default wishlist created automatically when a user saves an item from the catalogue, playing on the nostalgia of the old print catalogue.

## 3) Links & Tags
- Parent link: [[2025-10-27 – Digital Catalogue & Wishlist Sync Strategy]]
- Tags: #day/2025-10-27, #thread/2025-10-27-digital-catalogue, #topic/product-vision, #initiative/digital-catalogue
```

```markdown
---
title: "2025-10-27 – The Critical Blocker – Unsynced Wishlists"
date: 2025-10-27
lno_note_focus: "L"
tags:
  - day/2025-10-27
  - thread/2025-10-27-digital-catalogue
  - topic/risk-management
  - topic/technical-debt
aliases: ["The Wishlist Problem"]
links: ["[[2025-10-27 – Digital Catalogue & Wishlist Sync Strategy]]"]
---

# 2025-10-27 – The Critical Blocker – Unsynced Wishlists

> [!goal] **Goal**
> To articulate the severity of the current wishlist implementation and why it is a critical blocker for any future wishlist-dependent features, including the Digital Catalogue.

> [!summary] **TL;DR**
> - **Core Problem:** Web and App wishlists are completely separate and do not sync.
> - **App Implementation is a Fragile Cache:** All wishlist data on the app is stored in the device's local cache. If the cache is cleared, the user's wishlist is **permanently lost**.
> - **Past Incident:** This exact data-loss scenario has already happened, causing a major customer-facing incident.
> - **Cross-Device Failure:** A user signed into their account on a new device will not see their wishlist, as it's tied to the original device's cache.
> - **Conclusion:** The current implementation is not fit for purpose and must be replaced with a proper backend solution before any new features are built on top of it.

## 1) Context (Minto Pyramid Principle)

- **Situation** — The Digital Catalogue relies on the wishlist as its primary call to action.
- **Complication** — The underlying wishlist technology is fundamentally broken from a cross-platform perspective. It is not a persistent, account-level feature, but a temporary, device-level cache.
- **Key Questions** — Why can't we build the Digital Catalogue on the current wishlist? What happened during the last incident? What is the true customer experience across multiple devices?
- **Objective** — To establish that fixing the wishlist backend is not an optional enhancement but a critical prerequisite to unblock the Digital Catalogue and prevent future data-loss incidents.

## 2) Key Risks

- **Data Loss:** The current cache-based approach is fragile and has already led to users permanently losing their wishlists.
- **Customer Frustration:** Users expect their data to be tied to their account, not their device. The current experience is confusing and frustrating, eroding trust.
- **Strategic Failure:** The entire Digital Catalogue initiative, which is a major strategic push for the app, cannot succeed if the core wishlist functionality is unreliable and not synced with the web.

## 3) Links & Tags
- Parent link: [[2025-10-27 – Digital Catalogue & Wishlist Sync Strategy]]
- Tags: #day/2025-10-27, #thread/2025-10-27-digital-catalogue, #topic/risk-management, #topic/technical-debt
```

```markdown
---
title: "2025-10-27 – Defining the Wishlist Sync MVP"
date: 2025-10-27
lno_note_focus: "L"
tags:
  - day/2025-10-27
  - thread/2025-10-27-digital-catalogue
  - topic/mvp
  - initiative/wishlist
aliases: ["Wishlist Sync MVP Scope"]
links: ["[[2025-10-27 – Digital Catalogue & Wishlist Sync Strategy]]"]
---

# 2025-10-27 – Defining the Wishlist Sync MVP

> [!goal] **Goal**
> To define the minimum viable scope for a new, synced, backend-driven wishlist solution that can be delivered in the next quarter.

> [!summary] **TL;DR**
> - **Core Requirement:** A backend solution is needed to store wishlist data at the account level, not the device level.
> - **MVP Scope:** At a minimum, the new solution must support multiple, named wishlists (feature parity with the current app) and sync them between web and app.
> - **Out of Scope (for now):** The ability to add items to a *specific* named wishlist from the web is not required for MVP, as the web currently only has a single wishlist concept.
> - **Key Features to Retain:** The ability to "combine wishlists" and the "notify on price drop" toggle must be investigated and likely retained.

## 1) Context (Minto Pyramid Principle)

- **Situation** — The team has agreed that syncing wishlists is a top priority.
- **Complication** — The team needs to define what a "Minimum Viable Product" for this sync looks like to make the project achievable in the next quarter.
- **Key Questions** — What is the minimum feature set we need to support? What can be deferred? How does this interact with the "Wishlist of Dreams" concept from the Digital Catalogue?
- **Objective** — To create a clear MVP document that the backend team can use to build the new service.

## 2) L/N/O Tasks (grouped)

- [ ] **Task:** Write the MVP scope document for the Web/App Wishlist Sync.
  - **L/N/O:** L
  - **Reasoning:** This is the primary **Bottleneck** to starting development. This document will provide the clarity needed for the engineering team to act.
  - **Owner:** @PM (Basket)
  - **Blockers:** None.
  - **Impact:** 1st order: A clear plan is created. 2nd order: Development can begin on the highest priority strategic project for the next quarter.
  - **Goal:** [[2025-10-27 – Defining the Wishlist Sync MVP]]
- [ ] **Task:** Investigate usage data for the "combine wish lists" feature to determine its inclusion in the MVP.
  - **L/N/O:** N
  - **Reasoning:** This is a data-gathering task to inform the MVP scope and prevent scope creep if the feature is not used.
  - **Owner:** @PM
  - **Blockers:** The feature may not be tagged for analytics.
  - **Impact:** 1st order: A data-informed decision is made. 2nd order: The MVP is kept as lean as possible.
  - **Goal:** [[2025-10-27 – Defining the Wishlist Sync MVP]]
- [ ] **Task:** Confirm that the "notify on price drop" feature will be retained and how it will function in the new synced architecture.
  - **L/N/O:** N
  - **Reasoning:** This is a requirement-gathering task to ensure feature parity and avoid a negative customer experience.
  - **Owner:** @PM
  - **Blockers:** The technical implementation may be complex.
  - **Impact:** 1st order: The feature's future is decided. 2nd order: A key marketing and user-retention tool is preserved.
  - **Goal:** [[2025-10-27 – Defining the Wishlist Sync MVP]]

## 3) Links & Tags
- Parent link: [[2025-10-27 – Digital Catalogue & Wishlist Sync Strategy]]
- Tags: #day/2025-10-27, #thread/2025-10-27-digital-catalogue, #topic/mvp, #initiative/wishlist
```

```markdown
---
title: "2025-10-27 – The Order Summary Calculation Problem"
date: 2025-10-27
lno_note_focus: "L"
tags:
  - day/2025-10-27
  - thread/2025-10-27-digital-catalogue
  - topic/risk-management
  - topic/bug
aliases: ["Basket Subtotal Bug"]
links: ["[[2025-10-27 – Digital Catalogue & Wishlist Sync Strategy]]"]
---

# 2025-10-27 – The Order Summary Calculation Problem

> [!goal] **Goal**
> To understand and address the critical bug where the basket subtotal does not correctly filter by fulfilment type, causing incorrect totals to be sent to downstream systems like Argos Pay.

> [!summary] **TL;DR**
> - **The Bug:** The basket sends the *entire* basket total to the SBE service, without filtering for fulfilment type. This means a basket containing a delivery-only item (like a sofa) will have that item's price included in the total sent to Argos Pay, even if the user has selected Click & Collect.
> - **Impact:** This causes Argos Pay to return an incorrect financing plan, as it is calculated on the wrong total. This is a major customer-facing issue and a potential legal/financial risk.
> - **Urgency:** This has been an issue for a long time but has only been surfaced now due to the Argos+ work. It needs to be addressed urgently.

## 1) Context (Minto Pyramid Principle)

- **Situation** — During a discussion about the Digital Catalogue, a separate, long-standing bug was raised regarding the basket's order summary calculation.
- **Complication** — The basket does not filter its contents by fulfilment type before calculating the total that is sent to other services. This means ineligible items are included in financial calculations.
- **Key Questions** — Why has this not been caught before? What is the full impact on Argos Pay and Argos+? How quickly can we fix this?
- **Objective** — To raise the alarm on this critical bug and get it prioritized for an immediate fix.

## 2) Links & Tags
- Parent link: [[2025-10-27 – Digital Catalogue & Wishlist Sync Strategy]]
- Tags: #day/2025-10-27, #thread/2025-10-27-digital-catalogue, #topic/risk-management, #topic/bug
```