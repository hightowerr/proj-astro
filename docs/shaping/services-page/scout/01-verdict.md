# Verdict

## Stack recommendation

Keep this on the existing stack: `Next.js 16 App Router + one client split-pane shell + Server Actions + local editor state + Vitest/Playwright`, because the repo already has the data model, auth, and CRUD primitives and the main work is interaction state, not infrastructure.

## Confidence

Medium

## Biggest risk identified

The real risk is not schema or deployment. It is interaction correctness: unsaved-change protection, create-mode transitions, and `Restore` semantics all intersect with the current hidden/direct-link booking behavior.

## Suggested appetite adjustment

If the current appetite is under 3 days, raise it to 3 days or cut polish. This fits in 2 days only if we keep:

- one active draft only
- no per-row draft persistence
- a simple discard-confirmation flow
- no extra permissions or staff-assignment work

## Key competitor insight

Competitors keep pushing “service/event type” editing into sprawling multi-surface flows. Our advantage is to keep create, edit, restore, and copy-link in one place with one draft model, instead of splitting them across card menus, tabs, team settings, and advanced editors.

## Recommended product posture

- Treat this as an interaction-heavy authenticated dashboard feature, not a content page.
- Keep the route server-rendered for initial data, then hand off to a single client island for selection, dirty state, and confirmation flows.
- Use Server Actions for create, update, and restore. Do not introduce SWR or optimistic cache layers for this bet.
