# Mental Models Selected
**Job:** Appointments Page Implementation Analysis
**Date:** 2026-04-22

---

## 1. Bulletproof Problem Solving Cycle
**Why selected:** Provides the seven-step structured framework for this full analysis — defines the problem precisely, disaggregates into logic trees, prioritizes, and synthesizes into actionable findings.

**Application:** The problem was initially framed as "implement the Appointments section." Investigation revealed the page already exists. Porpoising (see model 5) refined the problem to a quality gap, not a build gap. This saved significant implementation risk.

---

## 2. Cognitive Load
**Why selected:** The page places two conceptually distinct tables on one screen — Appointments (transaction record) and Slot Recovery (operational log). Without strong visual separation, users must constantly re-orient, increasing cognitive load on every interaction.

**Application:**
- Each table needs a clear section header + description line (chunk the page into named zones)
- Visual separation must be achieved through background shifts (per design system), not borders
- The outcome cards function as "pre-orienting" summary data — they should land before the user hits the raw table, reducing scanning effort
- Empty states must explain context ("No slot openings yet" is insufficient — it doesn't tell the user *why* or *what will appear here when conditions are met*)

---

## 3. Von Restorff Effect (Isolation Effect)
**Why selected:** The spec explicitly calls out "outcome badge hierarchy" as a designer focus. This is a direct application of von Restorff: the financial outcome of an appointment must visually differentiate settled (good) from voided (bad) from unresolved (pending action required).

**Application:**
- `financialOutcome` values need a `FinancialOutcomeBadge` component with semantic color coding:
  - `settled` → success green (positive, low urgency)
  - `voided` → error red (negative, attention needed)
  - `unresolved` → muted/neutral (pending, no urgency)
  - `refunded` → warning amber (action taken, informational)
  - `disputed` → error red with higher salience than `voided` (active problem)
- Only 1–2 states should use high-salience color. Everything else should be muted.
- "Everything highlighted = nothing highlighted." Keep `settled` and `unresolved` visually quiet; reserve color for problem states.

---

## 4. Necessity and Sufficiency
**Why selected:** Helps distinguish what is required (necessary) vs. what guarantees the spec is met (sufficient).

**Application:**
- **Necessary but not sufficient:** The data queries return all needed fields. Having correct data is necessary but not sufficient to meet the spec — the visual presentation must also be correct.
- **Sufficient conditions for completion:** (1) `FinancialOutcomeBadge` renders semantic hierarchy, (2) Design system border violations are resolved, (3) Each section has a structural header, (4) Empty states are designed with explanatory copy, (5) The two-table page has clear tonal separation.
- **Gap identified:** Currently only the necessary conditions are met (data), not the sufficient ones (presentation).

---

## 5. Iterative Refinement (Porpoising)
**Why selected:** The initial problem statement ("implement the Appointments section") was imprecise. Investigation into the codebase revealed the page already exists. This required a porpoise — surfacing from the data to redefine the problem before diving into solutions.

**Application:**
- **Pass 1:** Assumed a build-from-scratch task → discovered page exists
- **Pass 2:** Investigated existing implementation → identified quality/compliance gaps
- **Pass 3:** Mapped gaps against design system docs → identified specific violations
- **Result:** Problem redefined as "close the visual and compliance gaps in an already-functional page"
- **Implication for implementation:** Changes are surgical, not wholesale. Target the presentation layer only.

---

## 6. Aesthetic-Usability Effect
**Why selected:** The page is functional. But functional-without-aesthetic polish creates a perception of lower quality and less trustworthiness — even if the data is correct. The Atelier design system exists precisely to apply this effect.

**Application:**
- Border violations (1px solid borders everywhere) make the page feel like a generic admin template rather than the "high-end invitation or boutique gallery catalog" described in DESIGN.md. This is the single highest-leverage aesthetic fix.
- The `financialOutcome` plain text gives the outcome column no visual weight — it is perceived as less reliable because it doesn't look authoritative.
- Fixing these aesthetic gaps will make the data itself feel more credible and the page feel purpose-built.
