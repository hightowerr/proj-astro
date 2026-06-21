# Prompt: Generate Product Definition Document

You are auditing an existing codebase and any available business context (README, marketing copy, onboarding flows, legal notices, env config). Produce a single markdown document that answers: **what is this product, who is it for, what must the site do, and what is explicitly excluded.**

This document sits above the architecture doc. It defines the business constraints that architecture implements and code standards enforce. Do not describe how the system is built — describe what it must accomplish and why.

---

## 1. Company / Product Identity

State the facts that ground every downstream decision:

- Product or company name
- Legal entity type and registration (if applicable)
- Regulatory status or compliance regime (if applicable — e.g., FCA, HIPAA, SOC 2, PCI-DSS)
- Founding date or launch date
- One-paragraph commercial proposition: what the business does, the problem it solves, and how it makes money

If regulatory requirements exist, they must appear here first — not as an afterthought in a later section.

## 2. Target Audience

Name the specific user, not a vague persona. Answer:

- **Who** is the primary user? (Job title, industry, context of use)
- **Who is explicitly not** the target? (Prevents scope drift toward adjacent audiences)
- **What is their goal** when they arrive? (The job-to-be-done, not a feature list)
- **Conversion funnel**: Define the stages from first visit to desired action (e.g., land → understand → trust → contact). Assign a time target to the full funnel if applicable (e.g., "under 3 minutes to form submission").

## 3. Core Features (In Scope)

Numbered list of everything the product must do in its current version. Group by concern (e.g., content, interaction, compliance, infrastructure). For each feature:

- One-line description of the capability
- Why it exists (the business reason, not the technical mechanism)
- Any hard constraints (e.g., "risk warning must appear verbatim", "email must be delivered within 60 seconds")

Include compliance-driven features inline — not in a separate section. If a regulator requires it, say so next to the feature.

## 4. Exclusions (Out of Scope)

Numbered list of things a reasonable contributor or stakeholder might suggest but that are **deliberately excluded**. For each:

- What was excluded
- Why (one sentence — cost, complexity, regulatory risk, premature, or not aligned with current audience)

> This section prevents scope creep. If it's not listed here or in §3, it hasn't been decided yet — flag it as an open question.

## 5. Key Decisions & Rationale

For any non-obvious technology, vendor, or approach choice that a future contributor might question, record:

| Decision | Alternative considered | Why this was chosen | When to revisit |
|----------|----------------------|--------------------|-----------------| 

Format as a table. Keep entries to choices that affect the product's capability or constraints — not routine library picks. Use a callout box for decisions with especially important context:

> **Example:**  
> ℹ️ **Why no CMS?** Content changes are infrequent (quarterly) and developer-managed. A CMS would add auth, hosting, and content modelling overhead for ~10 pages of static copy. Revisit if content update frequency exceeds monthly.

## 6. Success Criteria

Numbered list of measurable outcomes that define whether the product is working. Each criterion must be:

- **Testable** — a human or automated check can verify it
- **Time-bound or threshold-based** — not "good performance" but "Lighthouse mobile ≥ 90"
- **Attributed** — state what system or process is responsible for meeting it

Cover at minimum:
- Business outcome (leads, conversions, revenue, engagement — whatever applies)
- Technical quality (performance, uptime, error rate)
- Compliance (if applicable — audit checklist, required disclosures, data handling)
- Operational readiness (what's needed for handoff or transfer of ownership)

## 7. Tone, Voice & Content Constraints

If the product has specific content rules, capture them here:

- Brand voice (formal, conversational, technical)
- Required legal copy (disclaimers, risk warnings — provide verbatim text)
- Content that must not change without approval (regulatory disclosures, pricing claims)
- Languages / localization requirements

Skip this section entirely if the product has no content constraints beyond standard web copy.

## 8. Tech Stack (Justification Only)

Lightweight table — enough to explain **why** each choice was made, not how it works. The architecture doc owns the detail.

| Layer | Choice | Why (one sentence) |
|-------|--------|-------------------|

Include explicit exclusions here too (e.g., "No CMS — see §5").

This table must be a strict subset of the architecture doc's stack table. If they diverge, the architecture doc is authoritative for implementation detail; this doc is authoritative for the business reason behind the choice.

---

## Output Rules

- Lead with business reality, not technical detail. A non-technical stakeholder should understand §1–§6 without reading code.
- Every exclusion (§4) must state why — bare lists without rationale are not useful.
- Every success criterion (§6) must be verifiable. "Improve SEO" is not a criterion. "Lighthouse SEO score ≥ 90" is.
- If regulatory or compliance requirements exist, they must appear in §1, be reflected in §3 features, and have corresponding success criteria in §6. Do not isolate them into a single section.
- Record decisions (§5) only when the alternative was seriously considered. Don't log obvious choices.
- If something is ambiguous or missing from the codebase, say so — don't invent business context.
- Prefer tables and lists over paragraphs.
- Target 100–200 lines. This is a framing document, not a spec.
- Relationship to other docs: This is document #1 in the reading order. State explicitly which downstream docs it constrains (architecture, code standards, etc.) in a one-line note at the top.
