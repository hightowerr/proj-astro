# A Plan for Aligning on a Single Source of Truth for Promo Copy

**Objective for the Meeting:** To agree on a single tool, a clear data flow, and a phased migration plan for all promotional copy, ensuring this type of error cannot happen again.

---

### Proposed Agenda & Discussion Points

**1. Define the Landscape & Terminology**

*Goal: Ensure everyone is speaking the same language.*

*   **Action:** On a whiteboard, define each system. What is its exact purpose?
    *   **PST (Promotion Setup Tool):** The legacy tool?
    *   **PET (Promotion Enrichment Tool):** The newer, but "not web ready" tool?
    *   **New PV Tool:** Is this an updated version of PET? Let's clarify its official name.
    *   **SPE (Service Personalization Engine):** What is its role? Is it for *logic* (deciding who gets an offer) or *storage* (holding the copy)?
*   **Action:** Define the data fields. Agree on a canonical name for each piece of customer-facing copy (e.g., `basket_promo_text`, `pdp_banner_copy`).

**2. Decide on the Single Source of Truth (SSoT)**

*Goal: Choose ONE tool for managing promo copy going forward.*

*   **Action:** Evaluate the candidate tools (PST vs. the New PV Tool) against critical criteria. The winner is the SSoT.

| Criteria | PST (Legacy) | New PV Tool | Notes |
| :--- | :--- | :--- | :--- |
| **Web Ready & Stable?** | ? | ? | Can it reliably serve production traffic? |
| **Usable for Business Teams?** | ? | ? | Is the UI intuitive for non-technical users? |
| **Has a Robust API?** | ? | ? | Can engineers easily and reliably get data from it? |
| **Supports All Copy Needs?** | ? | ? | Does it have fields for all required promo copy? |
| **Clear Owner?** | ? | ? | Who owns the roadmap and provides support? |

**3. Architect the Future State**

*Goal: Agree on how data will flow from the SSoT to the customer.*

*   **Proposal (based on our analysis):**
    1.  **The SSoT Tool:** Business users input and manage ALL promo copy here. This is the single place for writing/editing text.
    2.  **The SPE (Service Personalization Engine):** Its role is **LOGIC ONLY**. It reads copy from the SSoT's API, applies its eligibility and personalization rules, and then passes the final, correct copy to the presentation layer.
    3.  **Presentation Layer (Basket, PDP):** This layer is "dumb." It receives the final, fully-formed copy from the SPE and simply displays it. It does not contain any logic for choosing between sources.

**4. Define the Migration Plan**

*Goal: Create a phased plan to move from the current state to the future state.*

*   **Phase 1: Freeze & Adopt (Next Week ->)**
    *   All **new** promotions MUST be created in the chosen SSoT.
    *   Place an immediate freeze on creating or editing promo copy in the legacy tool.
*   **Phase 2: Technical Integration (Short Term)**
    *   **Eng Task:** Modify the SPE to *only* read copy from the SSoT's API.
    *   **Eng Task:** Decommission all code that reads promo copy from the legacy tool.
*   **Phase 3: Content Migration (Medium Term)**
    *   **Business Task:** Create a plan to migrate all active, long-running promotions from the legacy tool into the SSoT.
    *   Set a firm kill date for the legacy tool.

**5. Agree on Next Steps & Ownership**

*Goal: Leave the meeting with a clear owner for each action item.*

*   **Decision:** Who is the final owner of the SSoT tool decision?
*   **Action Item:** `[Owner's Name]` to lead the technical integration plan. Due: `[Date]`.
*   **Action Item:** `[Owner's Name]` to create the content migration plan. Due: `[Date]`.
*   **Next Meeting:** Schedule a follow-up in one week to review progress on these action items.
