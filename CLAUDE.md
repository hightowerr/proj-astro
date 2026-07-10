@AGENTS.md

## Application Building Context

Read these files **in order** before implementing or making any architectural decision:

1. `docs/context/project-overview.md` — product definition, goals, features, and scope
2. `docs/context/architecture-context.md` — system structure, boundaries, storage model, and invariants
3. `docs/context/ui-context.md` — theme, colors, typography, canvas design, and component conventions
4. `docs/context/code-standards.md` — implementation rules and conventions
5. `docs/context/ai-workflow-rules.md` — development workflow, scoping rules, and delivery approach
6. `docs/context/progress-tracker.md` — current phase, completed work, open questions, and next steps

Update `docs/context/progress-tracker.md` after each meaningful implementation change. If implementation changes the architecture, scope, or standards in the context files, update the relevant file before continuing.

The design system (CSS tokens, component previews, JSX examples) lives in `docs/design-system`.

## Environment

- **Platform:** WSL2 / Ubuntu on Windows — use bash/Unix commands only
- **Package manager:** `pnpm` (never `npm`)
- **Paths:** forward slashes; never Windows-style paths

## Feature Engineering Loop

Follow `AI engineering feature loop.md` for all feature builds. It defines a 5-phase cycle:
SHAPE → IMPLEMENT → VERIFY → DRIFT AUDIT → RETRO.

**Session start** — read these before doing anything:
1. `docs/loops/feature-loop-contract.md` — current wave, phase, and backlog
2. `docs/loops/work-log.md` (last 10 entries) — what happened in recent sessions
3. `docs/signals/` — drift, friction, and patterns from prior runs

**Non-negotiable rules**:
- NEVER self-verify — implementing agents do not test their own work. Verification is Phase 3, run by a separate agent in a fresh session.
- Run `pnpm check` (lint + typecheck) after EVERY slice, not after the whole wave. Fast feedback catches errors before they compound.
- Log friction to `docs/signals/friction/` when implementation hits unexpected walls. Log spec deviations — never silently accept shortcuts.
- Classify spec drift as EVOLUTION or SHORTCUT in Phase 4. If shortcuts > 50% of divergences, flag it — the system is drifting.
- Append a structured entry to `docs/loops/work-log.md` when your session ends: what you picked up, what you did, what you couldn't resolve.
- Phase 1 (SHAPE) MUST invoke the `/shaping` skill. All shaping work follows its methodology — R/S notation, fit checks, breadboarding, multi-level document consistency.
- Phase 5 (RETRO) MUST apply queued architecture updates. Check the build order / specs for "Architecture Context Updates Needed" sections (new invariants, flow changes, env vars, routes) and apply them to the relevant context files. Do not defer — the loop is not complete until context files reflect the implementation.

---

### WHEN IT GETS LONG - SPLIT IT:

Create these files as needed

CLAUDE.md (the hub)
├── "See docs/context/product-rules.md for customer lifecycles and business logic"
├── "See docs/context/backend-architecture.md for automated jobs and database rules"
├── "See docs/context/env-setup.md for required services and environment variables"
├── "See docs/design-system/design-system.md for UI components and tone of voice"
├── "See docs/design-system/DESIGN.md for brand guidelines"
├── "See AI engineering feature loop.md for the full build workflow"
└── "See docs/loops/feature-loop-contract.md for current build state"
