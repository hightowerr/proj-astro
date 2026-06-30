- Date: 2026-06-29
- Spec: 10 (settings page), 12 (payment card), 15 (dashboard card), 16 (email)
- Description: Implementing agents consistently skipped visual polish details — watermark icons, accent stripes, background tokens, typography sizing, animation backgrounds, responsive breakpoints, email dark mode. Core business logic was clean; the gap is entirely in UI/design fidelity.
- Root cause: AGENT — agents prioritize "does it work?" over "does it match the spec's visual details?" Prose descriptions of visual details are low-signal to agents compared to code snippets.
- Suggested fix: Three potential mitigations:
  1. Include HTML mock file paths in agent prompts so agents can READ the design mock directly
  2. Extract a "visual checklist" from design briefs into each slice plan (concrete: "add `bg-al-surface-lowest` not `bg-white`", "add 4px left border `al-primary`")
  3. Run a dedicated "design conformance" pass after functional implementation (like the design-consistency waves that preceded this feature)
