## 🏗️ Leadership Update

| Field | Description |
|:--|:--|
| **Initiative Name** | Promo Code Entry in Basket |
| **Summary** | A feature to allow customers to enter promo codes directly in the basket to reduce friction and increase conversion. |
| **Metric Goal** | Increase promo code redemption rate from 66% and overall conversion rate. |
| **Current Progress** | In the planning and design phase. |
| **Next Milestone** | Launch A/B test on Argos post-peak. |

## ⚠️ Risk Report

| Field | Description |
|:--|:--|
| **Risk ID** | `backend-storage-complexity` |
| **Description** | Building a new backend storage solution for promo codes is complex, costly, and time-consuming. |
| **Context / Evidence** | The decision between local storage and a backend solution is a key open question. A backend solution is needed for app/web consistency, but the cost is high. See [[2025-10-21 – Technical Implementation Details]]. |
| **Mitigations / Actions** | A spike is needed to fully understand the effort and cost. |
| **Owner(s)** | Backend Team |
| **Next Steps / Date** | Conduct spike to evaluate options. |

| Field | Description |
|:--|:--|
| **Risk ID** | `inconsistent-logic-with-checkout` |
| **Description** | Divergence in promo code validation logic between the basket and checkout will lead to a poor user experience. |
| **Context / Evidence** | The basket and checkout experiences need to be seamless. See [[2025-10-21 – Open Questions & Risks]]. |
| **Mitigations / Actions** | Close collaboration and regular syncs with the checkout team. |
| **Owner(s)** | Product Manager, Checkout Team |
| **Next Steps / Date** | Schedule regular sync meetings with the checkout team. |

## 🚨 Bad News / Blocker Report

| Field | Description |
|:--|:--|
| **Blocker / Issue** | V5 UI Migration Dependency |
| **Description** | The UI for the new feature is designed for V5, but the V5 migration is not yet complete. |
| **Impact / Scope** | This could block the development of the feature or require building it with V4 components and then migrating it later, which is inefficient. |
| **Resolution / Workaround** | Get a clear timeline for the V5 migration. |
| **Help Needed By (Date)** | ASAP |
