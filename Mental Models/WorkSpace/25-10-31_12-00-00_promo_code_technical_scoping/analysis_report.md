
# Part 1: Initial Generation

```markdown
---
title: "2025-10-31 – Promo Code Technical Scoping"
date: 2025-10-31
lno_note_focus: "L"
tags:
  - day/2025-10-31
  - thread/2025-10-31-promo-code-scoping
  - topic/technical-scoping
  - initiative/promo-code
aliases: ["Promo Code Developer Chat"]
links: ["[[2025-10-31 – The Core Challenge of Persisting Promo Codes]]", "[[2025-10-31 – MVP Decision – Stateless Web-Only Promo Codes]]", "[[2025-10-31 – Long-Term Solution Considerations]]"]
---

# 2025-10-31 – Promo Code Technical Scoping

> [!goal] **Goal**
> To define the technical scope and feasibility for implementing promo codes in the basket, focusing on the challenges of cross-platform syncing and agreeing on a simple, low-risk MVP for Q4.

> [!summary] **TL;DR**
> - **Decision:** The MVP will be a stateless, web-only experience. Promo codes will *not* be synced between web and app.
> - **Core Problem:** Persisting applied promo codes is highly complex due to the stateless nature of the basket, the risk of data inconsistency with the promotions engine (SP), and the lack of a synced basket between web and app.
> - **MVP User Experience:** If a user applies a promo code and then changes anything in their basket (updates quantity, removes item), the code will be stripped, and they must re-apply it. This avoids showing incorrect discounts.
> - **Action:** The UI/design team needs to be engaged to create a message that clearly communicates this behavior to the customer.
> - **Long-term:** A proper persistent solution would require significant work, likely involving a new column in DynamoDB and using session cookies, but this is out of scope for now.

## 1) Input

Transcript of a technical discussion with developers about implementing promo codes, dated October 31, 2025.

## 2) Context (Minto Pyramid Principle)

- **Situation** — The team is scoping the work for adding promo code functionality to the basket.
- **Complication** — A key requirement question arose: should applied promo codes sync between the web and app experiences? The technical team identified significant challenges and risks with this approach.
- **Key Questions** — Is it technically feasible to sync promo codes? What are the risks of doing so? What is the simplest, safest way to deliver value in the short term?
- **Objective** — To make a clear decision on the MVP scope that minimizes complexity and risk, allowing the team to deliver a functional promo code feature in Q4.

## 3) L/N/O Tasks (grouped)

- [ ] **Task:** Formally decide and document that the promo code MVP will be a stateless, web-only experience.
  - **L/N/O:** L
  - **Reasoning:** This is a high-**Leverage** decision. By radically simplifying the scope and avoiding the **Bottleneck** of cross-platform syncing, it makes a complex project feasible for Q4. It avoids a huge amount of technical risk and complexity.
  - **Owner:** @PM
  - **Blockers:** None. This is a decision.
  - **Impact:** 1st order: The development team has a clear, simple scope to build against. 2nd order: The business gets a functional promo code feature delivered much faster than a more complex version, allowing for earlier value realization.
  - **Goal:** [[2025-10-31 – MVP Decision – Stateless Web-Only Promo Codes]]
- [ ] **Task:** Engage the UI/Design team (Jerry) to create a user-facing message explaining that changing the basket will require promo codes to be re-applied.
  - **L/N/O:** N
  - **Reasoning:** This is a necessary task to mitigate the user experience trade-offs of the simplified MVP. It's a neutral task required to ship the feature responsibly.
  - **Owner:** @PM
  - **Blockers:** Designer availability.
  - **Impact:** 1st order: A design is created. 2nd order: Customer confusion is reduced, preventing a negative user experience and reducing potential contacts to customer support.
  - **Goal:** [[2025-10-31 – MVP Decision – Stateless Web-Only Promo Codes]]
- [ ] **Task:** Confirm with the SP (promotions engine) team how they handle channel-specific (web vs. app) promo codes.
  - **L/N/O:** N
  - **Reasoning:** This is a necessary dependency clarification to ensure the technical solution is robust.
  - **Owner:** @DevelopmentTeam
  - **Blockers:** SP team availability.
  - **Impact:** 1st order: The team understands how the promotions engine identifies channels. 2nd order: This prevents bugs where a web-only code might be attempted on the app, or vice-versa, in future iterations.
  - **Goal:** [[2025-10-31 – Promo Code Technical Scoping]]

## 4) Links & Tags

- Child links: [[2025-10-31 – The Core Challenge of Persisting Promo Codes]], [[2025-10-31 – MVP Decision – Stateless Web-Only Promo Codes]], [[2025-10-31 – Long-Term Solution Considerations]]
- Tags: #day/2025-10-31, #thread/2025-10-31-promo-code-scoping, #topic/technical-scoping, #initiative/promo-code
```

```markdown
---
title: "2025-10-31 – The Core Challenge of Persisting Promo Codes"
date: 2025-10-31
lno_note_focus: "L"
tags:
  - day/2025-10-31
  - thread/2025-10-31-promo-code-scoping
  - topic/systems-thinking
  - topic/risk-analysis
aliases: ["Promo Code Syncing Problem"]
links: ["[[2025-10-31 – Promo Code Technical Scoping]]"]
---

# 2025-10-31 – The Core Challenge of Persisting Promo Codes

> [!goal] **Goal**
> To understand the fundamental technical reasons why syncing and persisting promo codes between web, app, and across user sessions is a highly complex and risky problem.

> [!summary] **TL;DR**
> - **Stateless Basket:** The basket is not designed to persist data. It is recalculated every time it is loaded to ensure prices and availability are fresh. Persisting a promo code violates this principle.
> - **Data Inconsistency Risk:** If a promo code is stored in the basket (e.g., in Redis) and that promotion expires in the promotions engine (SP), the basket will show an invalid state, leading to customer confusion and a broken experience.
> - **Invalid State Risk:** A user could apply a code, change the basket contents (e.g., change quantity, remove an item), making the code invalid, but a persisted state might still show the discount, leading to confusion and potential for customer service complaints.
> - **No App/Web Sync Layer:** There is currently no mechanism to sync basket data between web and app. The app basket is built from a simple payload of SKU and quantity, not a rich basket object.

## 1) Context (Minto Pyramid Principle)

- **Situation** — The initial product desire was for a seamless promo code experience that syncs across devices.
- **Complication** — The underlying architecture of the basket service is fundamentally stateless and not designed for this. The promotions engine (SP) is the source of truth, and storing a separate state in the basket introduces a high risk of data inconsistency.
- **Key Questions** — Why can't we just store the applied code? What happens if the promotion expires? What happens if the user changes their basket?
- **Objective** — To articulate the technical constraints and risks that make a simple-sounding feature request a complex and dangerous engineering problem.

## 2) Key Risks Identified

- **Risk of Inconsistent Data:** A code persisted in the basket's Redis cache could be out of sync with the promotions engine (SP), which is the true source of validity. This is the primary technical concern.
- **Risk of Invalid Basket State:** A user could change their basket, making a promotion invalid, but a poorly implemented persistence layer could still show the discount, leading to a confusing UX and customer complaints.
- **Risk of Malicious Activity:** The developers noted that because the basket gets a lot of bot activity, a complex persistence mechanism could be spammed or exploited.

## 3) Links & Tags
- Parent link: [[2025-10-31 – Promo Code Technical Scoping]]
- Tags: #day/2025-10-31, #thread/2025-10-31-promo-code-scoping, #topic/systems-thinking, #topic/risk-analysis
```

```markdown
---
title: "2025-10-31 – MVP Decision – Stateless Web-Only Promo Codes"
date: 2025-10-31
lno_note_focus: "L"
tags:
  - day/2025-10-31
  - thread/2025-10-31-promo-code-scoping
  - topic/decision-making
  - topic/mvp
aliases: ["Promo Code MVP Scope"]
links: ["[[2025-10-31 – Promo Code Technical Scoping]]"]
---

# 2025-10-31 – MVP Decision – Stateless Web-Only Promo Codes

> [!goal] **Goal**
> To define a simple, low-risk, stateless MVP for the promo code feature that can be delivered in Q4.

> [!summary] **TL;DR**
> - **Decision:** The MVP will be web-only and completely stateless.
> - **User Flow:**
>   1. User applies a promo code.
>   2. If the user changes *anything* about the basket (item quantity, removes item), the promo code is stripped from the basket.
>   3. The user must then re-apply the code manually.
> - **Rationale:** This is the simplest and safest approach. It completely avoids the data inconsistency problems and mirrors how the basket already works (recalculating everything on every change).
> - **Next Step:** The UI must be updated to clearly message this behavior to the user to avoid confusion.

## 1) Context (Minto Pyramid Principle)

- **Situation** — The team needs to deliver a promo code feature but has identified major risks with a complex, stateful solution.
- **Complication** — A simple solution is needed that still provides value to the customer.
- **Key Questions** — What is the simplest possible user experience we can build? How do we handle changes to the basket?
- **Objective** — To agree on an MVP scope that is technically simple, low-risk, and delivers the core value of applying a promo code.

## 2) L/N/O Tasks (grouped)

- [ ] **Task:** Update the feature requirements/tickets to reflect the agreed-upon stateless MVP scope.
  - **L/N/O:** N
  - **Reasoning:** This is a necessary documentation task to ensure the development team builds the correct feature.
  - **Owner:** @PM
  - **Blockers:** None.
  - **Impact:** 1st order: Tickets are accurate. 2nd order: The right feature gets built, avoiding wasted effort.
  - **Goal:** [[2025-10-31 – MVP Decision – Stateless Web-Only Promo Codes]]
- [ ] **Task:** Speak to Jerry about updating the designs to reflect the new user flow and messaging.
  - **L/N/O:** N
  - **Reasoning:** This is a required communication task to get the necessary design updates.
  - **Owner:** @PM
  - **Blockers:** Jerry's availability.
  - **Impact:** 1st order: Jerry is briefed. 2nd order: The designs are updated to support the MVP, ensuring a better user experience.
  - **Goal:** [[2025-10-31 – MVP Decision – Stateless Web-Only Promo Codes]]

## 3) Links & Tags
- Parent link: [[2025-10-31 – Promo Code Technical Scoping]]
- Tags: #day/2025-10-31, #thread/2025-10-31-promo-code-scoping, #topic/decision-making, #topic/mvp
```

```markdown
---
title: "2025-10-31 – Long-Term Solution Considerations"
date: 2025-10-31
lno_note_focus: "N"
tags:
  - day/2025-10-31
  - thread/2025-10-31-promo-code-scoping
  - topic/technical-debt
  - topic/future-state
aliases: ["Future of Promo Code Syncing"]
links: ["[[2025-10-31 – Promo Code Technical Scoping]]"]
---

# 2025-10-31 – Long-Term Solution Considerations

> [!goal] **Goal**
> To capture the ideas discussed for a potential long-term, stateful solution for persisting promo codes, to be filed as technical debt or a future enhancement.

> [!summary] **TL;DR**
> - A possible long-term solution involves storing the applied promo codes in a database.
> - This would likely require adding a new column to the existing DynamoDB table for item and quantity.
> - Alternatively, for a less persistent solution, the codes could be stored in the browser session or cookies.
> - This is out of scope for the current MVP.

## 1) Context (Minto Pyramid Principle)

- **Situation** — The team has decided on a simple, stateless MVP but also discussed what a more robust solution might look like in the future.
- **Complication** — These ideas should be captured so they are not lost, but clearly marked as out of scope for now.
- **Key Questions** — If we were to build this properly in the future, how might we do it?
- **Objective** — To document the high-level thoughts on a future stateful solution for promo codes.

## 2) Potential Future Approaches

- **Database Persistence:**
  - Add a new column to the DynamoDB table to store applied promo codes alongside the SKU and quantity.
  - This would be the most robust but also the most complex solution.
- **Session/Cookie Storage:**
  - Store the applied codes in the user's browser session or in cookies.
  - This would persist the codes for a single user on a single device for a limited time, but would not solve the cross-device sync problem.

## 3) Links & Tags
- Parent link: [[2025-10-31 – Promo Code Technical Scoping]]
- Tags: #day/2025-10-31, #thread/2025-10-31-promo-code-scoping, #topic/technical-debt, #topic/future-state
```

# Optional: Report Sections

## ⚠️ Risk Report

| Field | Description |
|:--|:--|
| **Risk ID** | `risk/promo-data-inconsistency` |
| **Description** | Persisting promo codes in the basket (e.g., Redis) creates a high risk of data being inconsistent with the promotions engine (SP), which is the source of truth. |
| **Context / Evidence** | Developer stated: "if we keep it there think that that will be an inconsistency at our end as well." Also: "tomorrow SP Justin removes their Cron job... but already has all the data."
| **Mitigations / Actions** | The team has decided to build a stateless MVP, where codes are *not* persisted. Every change to the basket will require the user to re-apply the code, ensuring the basket state is always fresh.
| **Owner(s)** | @DevelopmentTeam |
| **Next Steps / Date** | Proceed with the stateless MVP design. |
| **Risk ID** | `risk/promo-bot-spam` |
| **Description** | The promo code input field could be a target for bot activity and spam, where malicious actors try to brute-force or test many codes. |
| **Context / Evidence** | Developer stated: "this is a basket and we deal with bot activity there will be lot of spamming of our promotion code and we will deal with this... this will happen here to be sure." |
| **Mitigations / Actions** | This risk is accepted for the initial MVP. Checkout is expected to have the final validation on single-use codes. Further mitigation may be needed if this becomes a problem.
| **Owner(s)** | @DevelopmentTeam, @CheckoutTeam |
| **Next Steps / Date** | Monitor activity post-launch. |

## 🏗️ Leadership Update

| Field | Description |
|:--|:--|
| **Initiative Name** | Promo Codes in Basket (Q4 MVP) |
| **Summary** | A technical scoping session was held to define the MVP for Q4. Due to significant technical risks and complexity with syncing promo codes across devices, a decision was made to proceed with a simpler, web-only, stateless solution. |
| **Metric Goal** | Deliver a functional promo code feature to web customers in Q4 to enable promotional campaigns. |
| **Current Progress** | Technical scope for MVP has been defined and agreed upon with the development team. |
| **Next Milestone** | Update feature requirements and designs to reflect the simplified MVP scope. |

# Part 2: Review Analysis

---
title: "2025-10-31 – Review Analysis"
date: 2025-10-31
tags: [day/2025-10-31, thread/2025-10-31-promo-code-scoping]
---

# 2025-10-31 – Review Analysis

## Quality Assessment
The system successfully parsed the technical discussion and identified the key decision and the reasoning behind it. The core problem (statefulness vs. statelessness) was correctly identified as the central theme and a dedicated child note was created for it. The MVP decision is clearly captured, and the long-term ideas are separated out as future considerations. The risk report accurately captures the primary technical concerns raised by the developers (data inconsistency and bot spam).

## Critical Issues
No critical issues were found. The transcript was technical but the core decision points were clear.

## Recommendations
None. The generated notes provide a clear and accurate summary of the technical decisions and risks, which is fit for purpose.

# Part 3: Final Refined Notes

```markdown
---
title: "2025-10-31 – Promo Code Technical Scoping"
date: 2025-10-31
lno_note_focus: "L"
tags:
  - day/2025-10-31
  - thread/2025-10-31-promo-code-scoping
  - topic/technical-scoping
  - initiative/promo-code
aliases: ["Promo Code Developer Chat"]
links: ["[[2025-10-31 – The Core Challenge of Persisting Promo Codes]]", "[[2025-10-31 – MVP Decision – Stateless Web-Only Promo Codes]]", "[[2025-10-31 – Long-Term Solution Considerations]]"]
status: processed
---

# 2025-10-31 – Promo Code Technical Scoping

> [!goal] **Goal**
> To define the technical scope and feasibility for implementing promo codes in the basket, focusing on the challenges of cross-platform syncing and agreeing on a simple, low-risk MVP for Q4.

> [!summary] **TL;DR**
> - **Decision:** The MVP will be a stateless, web-only experience. Promo codes will *not* be synced between web and app.
> - **Core Problem:** Persisting applied promo codes is highly complex due to the stateless nature of the basket, the risk of data inconsistency with the promotions engine (SP), and the lack of a synced basket between web and app.
> - **MVP User Experience:** If a user applies a promo code and then changes anything in their basket (updates quantity, removes item), the code will be stripped, and they must re-apply it. This avoids showing incorrect discounts.
> - **Action:** The UI/design team needs to be engaged to create a message that clearly communicates this behavior to the customer.
> - **Long-term:** A proper persistent solution would require significant work, likely involving a new column in DynamoDB and using session cookies, but this is out of scope for now.

## 1) Input

Transcript of a technical discussion with developers about implementing promo codes, dated October 31, 2025.

## 2) Context (Minto Pyramid Principle)

- **Situation** — The team is scoping the work for adding promo code functionality to the basket.
- **Complication** — A key requirement question arose: should applied promo codes sync between the web and app experiences? The technical team identified significant challenges and risks with this approach.
- **Key Questions** — Is it technically feasible to sync promo codes? What are the risks of doing so? What is the simplest, safest way to deliver value in the short term?
- **Objective** — To make a clear decision on the MVP scope that minimizes complexity and risk, allowing the team to deliver a functional promo code feature in Q4.

## 3) L/N/O Tasks (grouped)

- [ ] **Task:** Formally decide and document that the promo code MVP will be a stateless, web-only experience.
  - **L/N/O:** L
  - **Reasoning:** This is a high-**Leverage** decision. By radically simplifying the scope and avoiding the **Bottleneck** of cross-platform syncing, it makes a complex project feasible for Q4. It avoids a huge amount of technical risk and complexity.
  - **Owner:** @PM
  - **Blockers:** None. This is a decision.
  - **Impact:** 1st order: The development team has a clear, simple scope to build against. 2nd order: The business gets a functional promo code feature delivered much faster than a more complex version, allowing for earlier value realization.
  - **Goal:** [[2025-10-31 – MVP Decision – Stateless Web-Only Promo Codes]]
- [ ] **Task:** Engage the UI/Design team (Jerry) to create a user-facing message explaining that changing the basket will require promo codes to be re-applied.
  - **L/N/O:** N
  - **Reasoning:** This is a necessary task to mitigate the user experience trade-offs of the simplified MVP. It's a neutral task required to ship the feature responsibly.
  - **Owner:** @PM
  - **Blockers:** Designer availability.
  - **Impact:** 1st order: A design is created. 2nd order: Customer confusion is reduced, preventing a negative user experience and reducing potential contacts to customer support.
  - **Goal:** [[2025-10-31 – MVP Decision – Stateless Web-Only Promo Codes]]
- [ ] **Task:** Confirm with the SP (promotions engine) team how they handle channel-specific (web vs. app) promo codes.
  - **L/N/O:** N
  - **Reasoning:** This is a necessary dependency clarification to ensure the technical solution is robust.
  - **Owner:** @DevelopmentTeam
  - **Blockers:** SP team availability.
  - **Impact:** 1st order: The team understands how the promotions engine identifies channels. 2nd order: This prevents bugs where a web-only code might be attempted on the app, or vice-versa, in future iterations.
  - **Goal:** [[2025-10-31 – Promo Code Technical Scoping]]

## 4) Links & Tags

- Child links: [[2025-10-31 – The Core Challenge of Persisting Promo Codes]], [[2025-10-31 – MVP Decision – Stateless Web-Only Promo Codes]], [[2025-10-31 – Long-Term Solution Considerations]]
- Tags: #day/2025-10-31, #thread/2025-10-31-promo-code-scoping, #topic/technical-scoping, #initiative/promo-code
```

```markdown
---
title: "2025-10-31 – The Core Challenge of Persisting Promo Codes"
date: 2025-10-31
lno_note_focus: "L"
tags:
  - day/2025-10-31
  - thread/2025-10-31-promo-code-scoping
  - topic/systems-thinking
  - topic/risk-analysis
aliases: ["Promo Code Syncing Problem"]
links: ["[[2025-10-31 – Promo Code Technical Scoping]]"]
---

# 2025-10-31 – The Core Challenge of Persisting Promo Codes

> [!goal] **Goal**
> To understand the fundamental technical reasons why syncing and persisting promo codes between web, app, and across user sessions is a highly complex and risky problem.

> [!summary] **TL;DR**
> - **Stateless Basket:** The basket is not designed to persist data. It is recalculated every time it is loaded to ensure prices and availability are fresh. Persisting a promo code violates this principle.
> - **Data Inconsistency Risk:** If a promo code is stored in the basket (e.g., in Redis) and that promotion expires in the promotions engine (SP), the basket will show an invalid state, leading to customer confusion and a broken experience.
> - **Invalid State Risk:** A user could apply a code, change the basket contents (e.g., change quantity, remove an item), making the code invalid, but a persisted state might still show the discount, leading to confusion and potential for customer service complaints.
> - **No App/Web Sync Layer:** There is currently no mechanism to sync basket data between web and app. The app basket is built from a simple payload of SKU and quantity, not a rich basket object.

## 1) Context (Minto Pyramid Principle)

- **Situation** — The initial product desire was for a seamless promo code experience that syncs across devices.
- **Complication** — The underlying architecture of the basket service is fundamentally stateless and not designed for this. The promotions engine (SP) is the source of truth, and storing a separate state in the basket introduces a high risk of data inconsistency.
- **Key Questions** — Why can't we just store the applied code? What happens if the promotion expires? What happens if the user changes their basket?
- **Objective** — To articulate the technical constraints and risks that make a simple-sounding feature request a complex and dangerous engineering problem.

## 2) Key Risks Identified

- **Risk of Inconsistent Data:** A code persisted in the basket's Redis cache could be out of sync with the promotions engine (SP), which is the true source of validity. This is the primary technical concern.
- **Risk of Invalid Basket State:** A user could change their basket, making a promotion invalid, but a poorly implemented persistence layer could still show the discount, leading to a confusing UX and customer complaints.
- **Risk of Malicious Activity:** The developers noted that because the basket gets a lot of bot activity, a complex persistence mechanism could be spammed or exploited.

## 3) Links & Tags
- Parent link: [[2025-10-31 – Promo Code Technical Scoping]]
- Tags: #day/2025-10-31, #thread/2025-10-31-promo-code-scoping, #topic/systems-thinking, #topic/risk-analysis
```

```markdown
---
title: "2025-10-31 – MVP Decision – Stateless Web-Only Promo Codes"
date: 2025-10-31
lno_note_focus: "L"
tags:
  - day/2025-10-31
  - thread/2025-10-31-promo-code-scoping
  - topic/decision-making
  - topic/mvp
aliases: ["Promo Code MVP Scope"]
links: ["[[2025-10-31 – Promo Code Technical Scoping]]"]
---

# 2025-10-31 – MVP Decision – Stateless Web-Only Promo Codes

> [!goal] **Goal**
> To define a simple, low-risk, stateless MVP for the promo code feature that can be delivered in Q4.

> [!summary] **TL;DR**
> - **Decision:** The MVP will be web-only and completely stateless.
> - **User Flow:**
>   1. User applies a promo code.
>   2. If the user changes *anything* about the basket (item quantity, removes item), the promo code is stripped from the basket.
>   3. The user must then re-apply the code manually.
> - **Rationale:** This is the simplest and safest approach. It completely avoids the data inconsistency problems and mirrors how the basket already works (recalculating everything on every change).
> - **Next Step:** The UI must be updated to clearly message this behavior to the user to avoid confusion.

## 1) Context (Minto Pyramid Principle)

- **Situation** — The team needs to deliver a promo code feature but has identified major risks with a complex, stateful solution.
- **Complication** — A simple solution is needed that still provides value to the customer.
- **Key Questions** — What is the simplest possible user experience we can build? How do we handle changes to the basket?
- **Objective** — To agree on an MVP scope that is technically simple, low-risk, and delivers the core value of applying a promo code.

## 2) L/N/O Tasks (grouped)

- [ ] **Task:** Update the feature requirements/tickets to reflect the agreed-upon stateless MVP scope.
  - **L/N/O:** N
  - **Reasoning:** This is a necessary documentation task to ensure the development team builds the correct feature.
  - **Owner:** @PM
  - **Blockers:** None.
  - **Impact:** 1st order: Tickets are accurate. 2nd order: The right feature gets built, avoiding wasted effort.
  - **Goal:** [[2025-10-31 – MVP Decision – Stateless Web-Only Promo Codes]]
- [ ] **Task:** Speak to Jerry about updating the designs to reflect the new user flow and messaging.
  - **L/N/O:** N
  - **Reasoning:** This is a required communication task to get the necessary design updates.
  - **Owner:** @PM
  - **Blockers:** Jerry's availability.
  - **Impact:** 1st order: Jerry is briefed. 2nd order: The designs are updated to support the MVP, ensuring a better user experience.
  - **Goal:** [[2025-10-31 – MVP Decision – Stateless Web-Only Promo Codes]]

## 3) Links & Tags
- Parent link: [[2025-10-31 – Promo Code Technical Scoping]]
- Tags: #day/2025-10-31, #thread/2025-10-31-promo-code-scoping, #topic/decision-making, #topic/mvp
```

```markdown
---
title: "2025-10-31 – Long-Term Solution Considerations"
date: 2025-10-31
lno_note_focus: "N"
tags:
  - day/2025-10-31
  - thread/2025-10-31-promo-code-scoping
  - topic/technical-debt
  - topic/future-state
aliases: ["Future of Promo Code Syncing"]
links: ["[[2025-10-31 – Promo Code Technical Scoping]]"]
---

# 2025-10-31 – Long-Term Solution Considerations

> [!goal] **Goal**
> To capture the ideas discussed for a potential long-term, stateful solution for persisting promo codes, to be filed as technical debt or a future enhancement.

> [!summary] **TL;DR**
> - A possible long-term solution involves storing the applied promo codes in a database.
> - This would likely require adding a new column to the existing DynamoDB table for item and quantity.
> - Alternatively, for a less persistent solution, the codes could be stored in the browser session or cookies.
> - This is out of scope for the current MVP.

## 1) Context (Minto Pyramid Principle)

- **Situation** — The team has decided on a simple, stateless MVP but also discussed what a more robust solution might look like in the future.
- **Complication** — These ideas should be captured so they are not lost, but clearly marked as out of scope for now.
- **Key Questions** — If we were to build this properly in the future, how might we do it?
- **Objective** — To document the high-level thoughts on a future stateful solution for promo codes.

## 2) Potential Future Approaches

- **Database Persistence:**
  - Add a new column to the DynamoDB table to store applied promo codes alongside the SKU and quantity.
  - This would be the most robust but also the most complex solution.
- **Session/Cookie Storage:**
  - Store the applied codes in the user's browser session or in cookies.
  - This would persist the codes for a single user on a single device for a limited time, but would not solve the cross-device sync problem.

## 3) Links & Tags
- Parent link: [[2025-10-31 – Promo Code Technical Scoping]]
- Tags: #day/2025-10-31, #thread/2025-10-31-promo-code-scoping, #topic/technical-debt, #topic/future-state
```
