# Feature Engineering Loop v2

A closed engineering loop for building features with AI agents. Not a linear procedure — a cycle with a trigger, decision points, and an exit condition. Each run compounds into the next via shared signals and retrospectives.

Sources: [Feature Loop Systems Review](wiki/synthesis/feature-loop-systems-review.md) — analysis from loop engineering trilogy + Donella Meadows' systems dynamics.

---

## Prerequisite Folder Structure

Scaffold this once before the first run. The loop assumes these paths exist.

```
project-root/
├── docs/
│   ├── context/
│   │   ├── architecture-context.md    ← system structure, boundaries, invariants
│   │   ├── code-standards.md          ← implementation rules, conventions
│   │   ├── ui-context.md              ← theme, colors, typography, components
│   │   ├── progress-tracker.md        ← current phase, completed work, open items
│   │   └── current-issues.md          ← parking lot for unknowns and TODOs
│   │
│   ├── design-system/                 ← CSS tokens, component previews, JSX examples
│   │
│   ├── shaping/
│   │   └── <feature-name>/
│   │       ├── feature-brief.md       ← raw feature request / user story
│   │       ├── specs/                 ← individual HTML spec files (one per component/slice)
│   │       └── shape/
│   │           ├── <feature>-shape.md         ← shaping document (Phase 1 output)
│   │           ├── spike-<topic>.md           ← spike findings (Phase 1 output)
│   │           ├── <feature>-slices.md        ← slicing document (Phase 1 output)
│   │           └── wave-<N>/                  ← per-wave implementation plans
│   │               ├── <slice-name>-plan.md   ← individual slice plans
│   │               └── wave-<N>-summary.md    ← wave completion summary
│   │
│   ├── loops/
│   │   ├── feature-loop-contract.md   ← active loop state (current wave, backlog, timeline)
│   │   └── work-log.md                ← append-only structured log of agent sessions
│   │
│   └── signals/
│       ├── README.md                  ← signal schema (what goes where, format)
│       ├── drift/                     ← spec divergence logs (WHY it diverged)
│       ├── friction/                  ← recurring implementation pain points
│       └── patterns/                  ← reusable solutions discovered during implementation
│
├── CLAUDE.md                          ← agent rules (must reference this loop)
└── src/ or app/                       ← implementation code
```

### Codebase readiness checklist

Verify before the first run. If any fail, fix them first — the loop depends on these.

- [ ] **Dev server**: one command starts the app (`npm run dev` or equivalent). Agent must be able to spin up without cognitive load.
- [ ] **Lint + type-check**: `npm run lint` and `npm run type-check` (or equivalent) run clean with zero pre-existing errors. New errors must be attributable to new code only.
- [ ] **Playwright MCP**: installed and configured. The verify phase depends on browser automation.
- [ ] **Git worktrees**: repo supports worktrees for parallel agent isolation. Parallel agents MUST NOT share a working directory.

---

## CLAUDE.md Template

The agent rules file must reference this loop, the context files, and the three non-negotiable rules. Copy and adapt this to your project.

```markdown
# CLAUDE.md

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
- Run lint + type-check after EVERY slice, not after the whole wave. Fast feedback catches errors before they compound.
- Log friction to `docs/signals/friction/` when implementation hits unexpected walls. Log spec deviations — never silently accept shortcuts.
- Classify spec drift as EVOLUTION or SHORTCUT in Phase 4. If shortcuts > 50% of divergences, flag it — the system is drifting.
- Append a structured entry to `docs/loops/work-log.md` when your session ends: what you picked up, what you did, what you couldn't resolve.

## When It Gets Long — Split It

Create these files as needed:

CLAUDE.md (the hub)
├── "See docs/context/project-overview.md for product definition and scope"
├── "See docs/context/architecture-context.md for system structure and invariants"
├── "See docs/context/code-standards.md for implementation rules"
├── "See docs/design-system/design-system.md for UI components and tone of voice"
├── "See docs/design-system/DESIGN.md for brand guidelines"
├── "See AI engineering feature loop.md for the full build workflow"
└── "See docs/loops/feature-loop-contract.md for current build state"
```

---

## Loop Contract

Update `docs/loops/feature-loop-contract.md` at the start and end of every run.

```markdown
# Feature Loop Contract

## Goal
All specs in <feature-name> wave <N> are implemented, independently verified,
drift-audited with zero unresolved conflicts, and retrospective logged.

## Current state
- Feature: <feature-name>
- Wave: <N> of <total>
- Phase: SHAPE | IMPLEMENT | VERIFY | DRIFT AUDIT | RETRO | COMPLETE
- Specs in scope: <list or link to wave folder>

## Backlog
- Waves remaining: <list>
- Blocked specs: <list with reason>

## Timeline
| Date | Wave | Phase | Duration | Notes |
|------|------|-------|----------|-------|
| ...  | ...  | ...   | ...      | ...   |

## References
- Architecture: docs/context/architecture-context.md
- Design system: docs/design-system/
- Progress: docs/context/progress-tracker.md
- Issues: docs/context/current-issues.md
- Signals: docs/signals/
- Work log: docs/loops/work-log.md
```

---

## The Loop

```
TRIGGER ──→ 1. SHAPE ──→ 2. IMPLEMENT ──→ 3. VERIFY ──→ 4. DRIFT AUDIT ──→ 5. RETRO
  ▲                          │                 │               │
  │                    per-slice:          if issues:      if conflicts:
  │                    lint + type-check   → fix issues    → fix specs
  │                    (fast feedback)     → back to 2     → back to 3
  │                                                             │
  └─────────────────── next wave ◄──────────────────────────────┘
                                                          EXIT when:
                                                          all waves done
```

### TRIGGER

Human kicks off a wave. Update the loop contract with current state.

---

### Phase 1 — SHAPE

**Purpose**: Plan the work. Highest-leverage phase — information flows before implementation.

**Prompt**:
```
Read docs/loops/feature-loop-contract.md to orient yourself.
Read docs/signals/ — check drift/, friction/, patterns/ for lessons from prior runs.
Read docs/loops/work-log.md — last 10 entries for recent context.

## Inputs
Read these feature specs: [docs/shaping/<feature>/specs/]

## Workflow (follow in order)

### 0. Invoke the shaping skill
Run `/shaping` to activate the structured shaping methodology.
All shaping work in this phase MUST follow the `/shaping` skill's methodology:
- Requirements as numbered set (R0, R1, R2...)
- Shapes as lettered alternatives (A, B, C...)
- Fit checks as R × S decision matrices
- Breadboarding via `/breadboarding` skill
- Multi-level document consistency (Big Picture → Shaping doc → Slices doc → Slice plans)

### 1. Shape
- Use `/shaping` to populate R from specs (analyze all specs TOGETHER, not one-at-a-time), sketch shapes, run fit checks
- Map requirements against docs/context/architecture-context.md — identify conflicts, technical debts, patterns that drifted in prior waves (check docs/signals/drift/)
- Save shaping document to docs/shaping/<feature>/shape/<feature>-shape.md

### 2. Spike
- Identify technical unknowns from the shape
- Spin up parallel agents to run spikes
- Save findings as docs/shaping/<feature>/shape/spike-<topic>.md
- Update shape document with spike findings

### 3. Breadboard
- Evaluate shape options against [speed / risk / simplicity]
- Get user confirmation of recommended shape
- Use `/breadboarding` (invoked through `/shaping`) to detail the selected shape into concrete affordances and wiring

### 4. Dependency graph + phased waves
- For each spec, extract explicit dependencies (Prerequisites, Depends on, Requires)
- Produce:
  1. Dependency graph
  2. Phased wave order where:
     - Each wave contains specs that can run IN PARALLEL (no inter-dependencies within wave)
     - Waves are sequential (each wave's deps satisfied by prior waves)
     - No wave exceeds ~10 specs
  3. Critical path (longest sequential chain)
- Output as markdown table per wave + critical path

### 5. Slice & plan
- Use `/shaping`'s slicing methodology — vertical slices with demo-able UI
- Create slicing document: docs/shaping/<feature>/shape/<feature>-slices.md
- Create individual implementation plans, one per slice, per the skill's document hierarchy (Slices doc → Slice plans)
- Each plan MUST include:
  - Acceptance criteria (what "done" looks like — specific, verifiable)
  - Files to create/modify (predicted)
  - Dependencies on other slices
  - DO NOT include self-testing — verification is a separate phase

## Side effects
- Append placeholders/unknowns to docs/context/current-issues.md
- Ask me if any decisions are unclear

## References
- Design system: docs/design-system/
- Architecture: docs/context/architecture-context.md
- Prior drift signals: docs/signals/drift/
- Prior friction signals: docs/signals/friction/

## Constraints
- DO NOT IMPLEMENT — planning and documents only
```

---

### Phase 2 — IMPLEMENT

**Purpose**: Build the wave. Separate agents per slice. Fast feedback per slice, NOT per wave.

**Key change from v1**: No self-testing. The implementing agent does NOT verify its own work. That's Phase 3.

**Prompt**:
```
Read docs/loops/feature-loop-contract.md to orient yourself.
Read docs/loops/work-log.md — last 5 entries.
Read docs/context/progress-tracker.md.

## Task
Implement [docs/shaping/<feature>/shape/wave-<N>/] in parallel.

## Rules
1. Spin up one agent per slice (use worktrees for isolation)
2. Each agent reads its slice plan + architecture-context.md + design-system/
3. After EACH slice completes:
   - Run: lint, type-check, build (fast feedback — catch errors immediately)
   - If any fail → fix before moving to next slice
   - DO NOT run Playwright or visual testing — that's the verifier's job
4. When a slice is done:
   - Mark it as implemented in docs/context/progress-tracker.md
   - Update the spec file with any deviations (note what changed and WHY)
5. Park any unclear detail or TODO in docs/context/current-issues.md
6. If implementation hits unexpected friction:
   - Log it in docs/signals/friction/<topic>.md with format:
     Date, Spec, Description, Root cause (codebase vs agent vs spec)
7. Append a work-log entry when done:
   - What: which slices implemented
   - Result: pass/fail per slice, any deviations
   - Unresolved: what couldn't be completed

## References
- Shape: docs/shaping/<feature>/shape/<feature>-shape.md
- Design system: docs/design-system/
- Architecture: docs/context/architecture-context.md

## Constraints
- DO NOT self-test with Playwright — a separate verifier handles that
- DO NOT modify specs to match shortcuts — log deviations, the drift audit classifies them
```

---

### Phase 3 — VERIFY

**Purpose**: Independent verification by a fresh agent with no access to the implementer's reasoning.

**Key change from v1**: Separate agent, read-only, fresh context. The implementer NEVER judges its own output.

**Prompt** (run in a NEW session — fresh context):
```
You are a verifier. You did NOT implement this code. Your job is to verify it works.

## Inputs
- Specs: [docs/shaping/<feature>/shape/wave-<N>/]
- Files changed: [list from git diff or progress-tracker]
- App URL: [localhost:XXXX]

## Workflow
1. Read each slice's acceptance criteria from its plan
2. Use Playwright MCP to:
   - Start the app if not running
   - Navigate to every affected route/component
   - Interact with every UI element specified in the acceptance criteria
   - Test edge cases: empty states, error states, loading states, responsive breakpoints
3. For each acceptance criterion, report:
   - PASS: criterion met (with screenshot evidence)
   - FAIL: criterion not met (with what happened vs what was expected)
   - BLOCKED: couldn't test (with reason)

## Output
Write verification report to docs/shaping/<feature>/shape/wave-<N>/wave-<N>-verify.md:
| Slice | Criterion | Status | Evidence |
|-------|-----------|--------|----------|

## If any FAIL
Create a fix issue per failure in docs/context/current-issues.md with:
- What failed
- Expected vs actual behavior
- Suggested fix (read-only observation — do not implement)

→ Return to Phase 2 (IMPLEMENT) to fix the issues. Then re-verify.

## Constraints
- READ-ONLY — do not modify any source code
- Do not access the implementing agent's reasoning or conversation
- Test only against the acceptance criteria in the specs — nothing more, nothing less
```

---

### Phase 4 — DRIFT AUDIT

**Purpose**: Align remaining specs with reality. Classify every divergence as evolution or shortcut.

**Key change from v1**: Classification prevents drift-to-low-performance. Shortcuts are flagged, not silently accepted.

**Prompt**:
```
Read docs/loops/feature-loop-contract.md.

## Task
Compare the current implementation in src/ (or app/) and docs/context/progress-tracker.md
against the REMAINING (unimplemented) specs in docs/shaping/<feature>/specs/.

For each unimplemented spec, check whether:
1. It references files, exports, props, or data shapes that have changed
2. It assumes a component API or pattern that was implemented differently
3. It depends on a spec whose implementation deviated from its original spec

## For each conflict found
1. State: the spec file, the conflicting assumption, what actually exists now
2. CLASSIFY the divergence:
   - (a) EVOLUTION — the implementation found a genuinely better approach
     (simpler API, better pattern, architectural improvement)
   - (b) SHORTCUT — the implementation took an easier path
     (skipped edge cases, simplified component API, fewer states)
3. Apply the minimal spec edit to align with reality
4. Log to docs/signals/drift/<spec-slug>.md with format:
   - Date
   - Spec
   - What diverged
   - Classification: EVOLUTION | SHORTCUT
   - Why (one sentence)

## Quality ratchet
After classifying all divergences, report the evolution/shortcut ratio for this wave.
If shortcuts > 50%, flag this explicitly — the system may be drifting toward lower quality.

## Constraints
- DO NOT change implemented code — specs adapt to code, not reverse
- If any conflicts require re-verification → return to Phase 3 (VERIFY)
```

---

### Phase 5 — RETROSPECTIVE

**Purpose**: Extract compound value from this wave. This is the reinforcing loop — without it, the system maintains but doesn't grow.

**Prompt**:
```
Read docs/loops/feature-loop-contract.md.
Read docs/signals/ — all files created during this wave.
Read docs/loops/work-log.md — entries from this wave.
Read the verification report: docs/shaping/<feature>/shape/wave-<N>/wave-<N>-verify.md

## Extract and log

### 1. Patterns
What reusable solutions were discovered during implementation?
→ Save each as docs/signals/patterns/<pattern-name>.md with:
  - Pattern name
  - Problem it solves
  - Solution (code snippet or approach)
  - Where it was first used (spec reference)

### 2. Friction analysis
Review docs/signals/friction/ entries from this wave.
- Which friction was the agent's fault? → Improve CLAUDE.md or agent rules
- Which was the codebase's fault? → Create a refactoring issue
- Which was the spec's fault? → Improve shaping heuristics

### 3. Drift analysis
Review docs/signals/drift/ entries from this wave.
- Legitimate evolutions → update docs/context/architecture-context.md
- Shortcuts → add to docs/context/current-issues.md as tech debt

### 4. Shaping improvements
What spikes were wasted? → Note for future spike selection
What was shaped well? → Extract as a shaping heuristic

### 5. Update loop contract
- Update the timeline table
- Advance wave counter
- Update backlog

### 6. Update progress tracker
- Mark wave as complete
- Update docs/context/progress-tracker.md

## Append work-log entry
- Wave: <N>
- Duration: <time>
- Evolution/shortcut ratio: <X>/<Y>
- Patterns extracted: <count>
- Friction logged: <count>
- Key learning: <one sentence>
```

---

### EXIT CONDITION

The loop exits when ALL of these are true:
1. All waves in the feature are implemented
2. All waves are independently verified (Phase 3 passed)
3. All drift is audited with zero unresolved conflicts
4. Retrospective is logged for every wave
5. Loop contract shows Phase: COMPLETE

If waves remain → return to TRIGGER for the next wave.

---

## Signal Schemas

### docs/signals/README.md

```markdown
# Shared Signal Architecture

Signals are typed artifacts that flow between loop iterations.
Each run's outputs become the next run's inputs — this is what makes it a loop, not a procedure.

## Types

### drift/<spec-slug>.md
Spec divergence log. Created during Phase 4 (Drift Audit).
- Date:
- Spec:
- What diverged:
- Classification: EVOLUTION | SHORTCUT
- Why:

### friction/<topic>.md
Recurring implementation pain point. Created during Phase 2 (Implement).
- Date:
- Spec:
- Description:
- Root cause: CODEBASE | AGENT | SPEC
- Suggested fix:

### patterns/<pattern-name>.md
Reusable solution discovered during implementation. Created during Phase 5 (Retro).
- Pattern name:
- Problem it solves:
- Solution:
- First used in:
- Reusable? YES | MAYBE | NO

## Rules
- One signal per file (not appended to a master list)
- Filename = slugified topic, no dates in filename
- Signals are never deleted — they accumulate
- Phase 1 (Shape) MUST read signals/ before planning
```

---

## Work Log Format

### docs/loops/work-log.md

```markdown
# Work Log

Append-only. Every agent reads the last 10 entries at session start for context.

---

## [YYYY-MM-DD HH:MM] <agent-role> | <feature> wave <N>

- **Picked up**: <what this agent was tasked with>
- **Result**: <what was done, pass/fail>
- **Unresolved**: <what couldn't be completed, or "none">
```

---

## Quick Reference

| Phase | Who | Input | Output | Decision point |
|-------|-----|-------|--------|----------------|
| SHAPE | Human + agent | Feature brief, signals/ | Specs, waves, slice plans | User confirms shape |
| IMPLEMENT | Parallel agents (worktrees) | Slice plans | Code, friction signals | Per-slice: lint/type-check pass? |
| VERIFY | Separate fresh agent | Specs + changed files | Verify report | Any FAIL → back to IMPLEMENT |
| DRIFT AUDIT | Agent | Remaining specs vs reality | Drift signals, patched specs | Any conflicts → back to VERIFY |
| RETRO | Agent | All signals from wave | Patterns, updated harness | Waves remaining → next TRIGGER |
