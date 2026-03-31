  Review this shaping document like a senior engineer doing a risk-first design review.

  ### Primary goal:
  Find concrete bugs, contradictions, unsafe assumptions, migration risks, and missing
  implementation details. Do not summarize the doc first. Lead with findings.

  ### Review method:
  1. Read the shaping doc.
  2. Cross-check its claims against the current codebase where relevant.
  3. Focus on places where the proposal disagrees with existing behavior, data model
  constraints, routing, or control flow.
  4. Prefer high-signal findings over broad commentary.

  ### Output format:
  1. Findings first, ordered by severity.
  2. For each finding, include:
     - why it is a problem
     - the exact shaping doc line/file reference
     - the exact code reference(s) that conflict with it
     - the likely regression or implementation failure
  3. Then list open questions/assumptions.
  4. Then give a very short change-summary only if useful.

  ### Scope:
  - Prioritize:
    - schema and migration safety
    - booking and availability logic
    - policy snapshot correctness
    - payment/deposit semantics
    - onboarding/control-flow realism
    - slot recovery and downstream effects
    - internal contradictions inside the shaping doc
  - Call out if the proposal claims something is “resolved” but the actual
  implementation still makes it risky.
  - Call out impossible or misleading states in the proposal.
  - Call out when a requirement is marked satisfied but the shape does not actually
  satisfy it.

  ### Important constraints:
  - Be skeptical.
  - Do not accept the document’s framing at face value.
  - Do not spend time praising strengths.
  - If there are no findings, say that explicitly and list residual risks/testing gaps.

  ### Context:
  - This repo uses Next.js 16, Drizzle, PostgreSQL.
  - Existing behavior matters more than proposal intent.
  - Historical compatibility and migration safety matter.
  - Review against the actual current code, not an imagined architecture.

  Please review:
  [path to shaping doc]