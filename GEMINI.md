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

---

### WHEN IT GETS LONG - SPLIT IT:

Create these files as needed

CLAUDE.md (the hub)
├── "See docs/context/product-rules.md for customer lifecycles and business logic"
├── "See docs/context/backend-architecture.md for automated jobs and database rules"
├── "See docs/context/env-setup.md for required services and environment variables"
├── "See docs\design-system\design-system.md for UI components and tone of voice"
└── "See docs\design-system\DESIGN.md for brand guidelines"