 # Feature Engineering Loop v2

A closed engineering loop for building features with AI agents. Not a linear procedure — a cycle with a trigger, decision points, and an exit condition. Each run compounds into the next via shared signals and retrospectives.

Sources: [Feature Loop Systems Review](wiki/synthesis/feature-loop-systems-review.md) — analysis from loop engineering trilogy + Donella Meadows' systems dynamics.

---

## Controlled Vocabulary

This document uses each term below with one meaning only. When you read or write content for this loop, use these terms — not synonyms.

| Term | Definition | Scope |
|------|-----------|-------|
| **phase** | One of the 5 stages of the loop: SHAPE, IMPLEMENT, VERIFY, DRIFT AUDIT, RETRO | Top-level loop stages only |
| **step** | A numbered action within a phase | Sub-actions inside a phase |
| **wave** | A batch of slices that the loop processes together in one cycle | Scheduling unit |
| **slice** | The smallest independently implementable unit of work. One slice = one plan file, one agent, one worktree | Work unit |
| **spec** | A specification file in `docs/shaping/<feature>/specs/` that defines requirements for one slice | Always refers to the file |
| **plan** | An implementation plan file for one slice, stored in the wave folder | `<slice-name>-plan.md` |
| **signal** | A typed artifact (drift, friction, or pattern) that flows between loop iterations | Files in `docs/signals/` |
| **drift** | A divergence between a spec and the actual implementation | Measured in Phase 4 |
| **drift audit** | Phase 4: the process of classifying all divergences as EVOLUTION or SHORTCUT | Phase name only |
| **trajectory** | A qualitative assessment of how code was built — scope proportionality, pattern compliance, dependency hygiene, architectural alignment, and complexity | Phase 3, Step 3 only |
| **verify** | To confirm that implementation output meets acceptance criteria | Output correctness (Phase 3) |
| **check** | To inspect code quality or trajectory | Trajectory assessment (Phase 3, Step 3) |
| **issue** | An unresolved problem logged to `docs/context/current-issues.md` | All phases |
| **complete** | The state of a slice, wave, or feature after all exit conditions are met | Status label only |
| **run** | One full cycle of the loop (TRIGGER through RETRO) for a single wave | Loop iteration |
| **evolution** | A divergence where the implementation found a genuinely better approach | Phase 4 classification |
| **shortcut** | A divergence where the implementation took an easier path | Phase 4 classification |

---

## Writing Standard

All documentation this loop produces follows [ASD-STE100 Simplified Technical English](wiki/synthesis/asd-ste100-overview.md) conventions:

1. **One meaning per term** — use only the terms in the Controlled Vocabulary table. Do not introduce synonyms.
2. **Sentence limits** — max 20 words for instructions (procedural). Max 25 words for explanations (descriptive).
3. **Active voice** — write "the agent verifies the output," not "the output is verified."
4. **One instruction per sentence** — do not bundle multiple actions. Use a vertical list if a step has sub-actions.
5. **Condition before command** — write "If the test fails, fix the issue." Not "Fix the issue if the test fails."
6. **Vertical lists** — when a sentence would list 3+ items, convert to a bulleted or numbered list.
7. **No contractions** — write "does not," not "doesn't."

These rules apply to: shaping documents, spike findings, slice plans, spec edits, signal logs (drift, friction, patterns), work-log entries, verification reports, and progress-tracker updates.

Code, commit messages, and inline code comments are exempt.

---

## Project Profile

Set once when you adopt the loop. Gates conditional sections throughout.

```
surface: frontend | backend | fullstack
```

- **frontend** — browser-rendered UI (website, SPA, PWA). Verification = Playwright.
- **backend** — API, CLI, worker, data pipeline. No browser. Verification = test suite + API assertions.
- **fullstack** — both. Verification = Playwright + test suite + API assertions.

---

## Prerequisite Folder Structure

Scaffold this once before the first run. The loop assumes these paths exist.

```
project-root/
├── docs/
│   ├── context/
│   │   ├── architecture-context.md    ← system structure, boundaries, invariants
│   │   ├── code-standards.md          ← implementation rules, conventions
│   │   ├── ui-context.md              ← [frontend/fullstack] theme, colors, typography, components
│   │   ├── api-context.md             ← [backend/fullstack] endpoints, schemas, auth, error codes
│   │   ├── progress-tracker.md        ← current phase, completed work, open items
│   │   └── current-issues.md          ← parking lot for unknowns and TODOs
│   │
│   ├── design-system/                 ← [frontend/fullstack] CSS tokens, component previews, JSX examples
│   │
│   ├── shaping/
│   │   └── <feature-name>/
│   │       ├── feature-brief.md       ← raw feature request / user story
│   │       ├── specs/                 ← individual spec files (one per slice)
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

- [ ] **Run command**: one command starts the app or test suite (`npm run dev`, `python manage.py runserver`, `go run .`, or equivalent). Agent must be able to spin up without cognitive load.
- [ ] **Lint + type-check**: `npm run lint` and `npm run type-check` (or equivalent) run clean with zero pre-existing errors. New errors must be attributable to new code only.
- [ ] **Verification tooling**:
  - *frontend/fullstack*: Playwright MCP installed and configured for browser automation.
  - *backend/fullstack*: test runner configured (`pytest`, `go test`, `npm test`, etc.) with a passing baseline. API client available (curl, httpie, or test framework HTTP assertions).
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
3. `docs/context/ui-context.md` — [frontend/fullstack] theme, colors, typography, canvas design, and component conventions
4. `docs/context/api-context.md` — [backend/fullstack] endpoints, schemas, auth patterns, and error codes
5. `docs/context/code-standards.md` — implementation rules and conventions
6. `docs/context/ai-workflow-rules.md` — development workflow, scoping rules, and delivery approach
7. `docs/context/progress-tracker.md` — current phase, completed work, open questions, and next steps

Update `docs/context/progress-tracker.md` after each meaningful implementation change. If implementation changes the architecture, scope, or standards in the context files, update the relevant file before continuing.

[frontend/fullstack] The design system (CSS tokens, component previews, JSX examples) lives in `docs/design-system`.
[backend/fullstack] The API context (endpoints, schemas, auth, error codes) lives in `docs/context/api-context.md`.

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
- Trajectory flags (Phase 3) are friction signals, not blockers — unless they are hallucinated dependencies, which are treated as FAILs.
- Run lint + type-check after EVERY slice, not after the whole wave. Fast feedback catches issues before they compound.
- Log friction to `docs/signals/friction/` when implementation hits unexpected walls. Log spec deviations — never silently accept shortcuts.
- All documentation output follows STE writing rules (defined in the Writing Standard section of the loop document): max 20/25 words, active voice, controlled vocabulary, one instruction per sentence.
- Classify spec drift as EVOLUTION or SHORTCUT in Phase 4. If shortcuts > 50% of divergences, flag it — the system is drifting.
- Append a structured entry to `docs/loops/work-log.md` when your session ends: what you picked up, what you did, what you could not resolve.

## When It Gets Long — Split It

Create these files as needed:

CLAUDE.md (the hub)
├── "See docs/context/project-overview.md for product definition and scope"
├── "See docs/context/architecture-context.md for system structure and invariants"
├── "See docs/context/code-standards.md for implementation rules"
├── [frontend/fullstack] "See docs/design-system/design-system.md for UI components and tone of voice"
├── [frontend/fullstack] "See docs/design-system/DESIGN.md for brand guidelines"
├── [backend/fullstack] "See docs/context/api-context.md for endpoints, schemas, and error codes"
├── "See AI engineering feature loop.md for the full build loop"
└── "See docs/loops/feature-loop-contract.md for current build state"
```

---

## Loop Contract

Update `docs/loops/feature-loop-contract.md` at the start and end of every run.

```markdown
# Feature Loop Contract

## Goal
Implement all specs in <feature-name> wave <N>. Verify each independently.
Audit drift with zero unresolved divergences. Log the retrospective.

## Current state
- Feature: <feature-name>
- Surface: frontend | backend | fullstack
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
- [frontend/fullstack] Design system: docs/design-system/
- [backend/fullstack] API context: docs/context/api-context.md
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
  │                    per-slice:          if issues:      if divergences:
  │                    lint + type-check   → fix issues    → fix specs
  │                    (fast feedback)     → back to 2     → back to 3
  │                                                             │
  └─────────────────── next wave ◄──────────────────────────────┘
                                                          EXIT when:
                                                          all waves complete
```

### TRIGGER

The human kicks off a wave. Update the loop contract with current state.

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

## Steps (follow in order)

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
  - Acceptance criteria (what "complete" looks like — specific, verifiable)
    - Each criterion is one imperative sentence, max 20 words, active voice.
    - Example: "Display an error message when the user submits an empty form."
  - Files to create/modify (predicted)
  - Dependencies on other slices
  - DO NOT include self-testing — verification is a separate phase

## Side effects
- Append placeholders/unknowns to docs/context/current-issues.md
- Ask me if any decisions are unclear

## References
- Architecture: docs/context/architecture-context.md
- [frontend/fullstack] Design system: docs/design-system/
- [backend/fullstack] API context: docs/context/api-context.md
- Prior drift signals: docs/signals/drift/
- Prior friction signals: docs/signals/friction/

## Constraints
- DO NOT IMPLEMENT — planning and documents only
- Write all output documents (shape, spikes, slices, plans) in STE:
  - Max 20 words per instruction sentence, 25 per descriptive sentence.
  - Active voice. One instruction per sentence. Condition before command.
  - Use terms from the Controlled Vocabulary table — no synonyms.
```

---

### Phase 2 — IMPLEMENT

**Purpose**: Build the wave. Separate agents per slice. Fast feedback per slice, NOT per wave.

**Key change from v1**: No self-testing. The implementing agent does NOT verify its own work. That is Phase 3.

**Prompt**:
```
Read docs/loops/feature-loop-contract.md to orient yourself.
Read docs/loops/work-log.md — last 5 entries.
Read docs/context/progress-tracker.md.

## Task
Implement [docs/shaping/<feature>/shape/wave-<N>/] in parallel.

## Rules
1. Spin up one agent per slice (use worktrees for isolation)
2. Each agent reads these files before it starts:
   - Its slice plan
   - docs/context/architecture-context.md
   - [frontend/fullstack] docs/design-system/
   - [backend/fullstack] docs/context/api-context.md
3. After EACH slice completes:
   - Run these checks (fast feedback — catch issues immediately):
     - lint
     - type-check
     - build
     - [backend/fullstack] unit tests for changed modules
   - If any fail → fix before moving to next slice
   - DO NOT self-verify. These are the verifier's job (Phase 3):
     - Playwright browser testing
     - Manual API testing
     - Integration tests
4. When a slice is complete:
   - Mark it as implemented in docs/context/progress-tracker.md
   - Update the spec file with any deviations (note what changed and WHY)
5. Park any unclear detail or TODO in docs/context/current-issues.md
6. If implementation hits unexpected friction:
   - Log it in docs/signals/friction/<topic>.md with format:
     - Date
     - Spec
     - Description
     - Root cause: CODEBASE | AGENT | SPEC
7. Append a work-log entry when complete:
   - What: which slices implemented
   - Result: pass/fail per slice, any deviations
   - Unresolved: what could not be completed

## References
- Shape: docs/shaping/<feature>/shape/<feature>-shape.md
- Architecture: docs/context/architecture-context.md
- [frontend/fullstack] Design system: docs/design-system/
- [backend/fullstack] API context: docs/context/api-context.md

## Constraints
- DO NOT self-verify — a separate verifier handles that (Phase 3)
- DO NOT modify specs to match shortcuts — log deviations, the drift audit classifies them
- Write all documentation updates (progress-tracker, spec deviation notes, friction signals, work-log entries) in STE:
  - Max 25 words per sentence. Active voice. No contractions.
  - Use terms from the Controlled Vocabulary table.
```

---

### Phase 3 — VERIFY

**Purpose**: Verify the output (does it work?) and the trajectory (was it built well?). A fresh agent does this verification. The verifier has no access to the implementer's reasoning.

**Key change from v1**: A separate read-only agent with fresh context verifies the output. The implementer NEVER judges its own output.

**v2.1 addition**: The verifier also evaluates trajectory — HOW the code was built, not just WHETHER it works.

**Prompt** (run in a NEW session — fresh context):
```
You are a verifier. You did NOT implement this code. Your job is to verify it works AND that it was built well.

## Inputs
- Specs: [docs/shaping/<feature>/shape/wave-<N>/]
- Files changed: [list from git diff or progress-tracker]
- Git diff: [git diff main..HEAD or equivalent — the actual changes]
- Surface: [frontend | backend | fullstack]
- [frontend/fullstack] App URL: [localhost:XXXX]
- [backend/fullstack] API base URL: [localhost:XXXX] or test command: [npm test / pytest / go test]
- Known patterns: docs/signals/patterns/

## Steps

### Step 1 — Read acceptance criteria
Read each slice's acceptance criteria from its plan.

### Step 2 — Output evaluation (does it work?)

**[frontend] — Browser verification via Playwright MCP:**
- Start the app if not running
- Navigate to every affected route/component
- Interact with every UI element specified in the acceptance criteria
- Test these edge cases:
  - Empty states
  - Error states
  - Loading states
  - Responsive breakpoints

**[backend] — API and logic verification:**
- Run the full test suite (`pytest`, `go test`, `npm test`, or equivalent) — report pass/fail per test file
- For each new/changed endpoint: call it with valid input, invalid input, and missing auth
- Verify response shape matches docs/context/api-context.md (status codes, fields, error format)
- Check database state after write operations (row created/updated/deleted as expected)
- For CLI tools: run with expected args, bad args, and `--help` — verify output matches spec
- For workers/pipelines: trigger the job, verify output artifact or side effect

**[fullstack] — Both of the above.** Run backend verification first (API must work before UI can).

For each acceptance criterion, report:
- PASS: criterion met (with screenshot evidence [frontend] or command output [backend])
- FAIL: criterion not met (with what happened vs what was expected)
- BLOCKED: could not test (with reason)

### Step 3 — Trajectory evaluation (was it built well?)
Review the git diff and slice plans. For each slice, check:

1. **Scope proportionality** — Is the diff size proportionate to the spec scope?
   Flag: large diffs for small specs, or files changed that were not predicted in the slice plan.
2. **Pattern compliance** — Does the code reuse patterns from docs/signals/patterns/?
   Flag: reimplemented solutions that already exist as documented patterns.
3. **Dependency hygiene** — Were new dependencies added? Are they necessary?
   Flag: hallucinated packages (do not exist on npm/pypi), unnecessary dependencies for simple tasks.
4. **Architectural alignment** — Does the code follow docs/context/architecture-context.md?
   Flag: new patterns that contradict documented conventions, wrong directory placement, bypassed abstractions.
5. **Complexity check** — Is the solution appropriately simple for the requirement?
   Flag: over-engineered abstractions for one-time operations, premature generalization.

For each check, report:
- OK: no concerns
- FLAG: issue found (with what and why)
- N/A: not applicable to this slice

## Output
Write verification report to docs/shaping/<feature>/shape/wave-<N>/wave-<N>-verify.md:

### Output Evaluation
| Slice | Criterion | Status | Evidence |
|-------|-----------|--------|----------|

### Trajectory Evaluation
| Slice | Check | Status | Finding |
|-------|-------|--------|---------|

### Summary
- Output: <X>/<Y> criteria passed
- Trajectory: <X> flags raised
- Verdict: PASS | PASS WITH FLAGS | FAIL

## If any output FAIL
Create a fix issue per failure in docs/context/current-issues.md with:
- What failed
- Expected vs actual behavior
- Suggested fix (read-only observation — do not implement)

→ Return to Phase 2 (IMPLEMENT) to fix the issues. Then re-verify.

## If trajectory FLAGS but output PASS
Do NOT block the wave. Log flags to docs/signals/friction/<topic>.md with root cause: AGENT.
These feed into Phase 5 (RETRO) for harness improvement — not into immediate rework.
Exception: hallucinated dependencies are treated as output FAILs (they will break in production).

## Constraints
- READ-ONLY — do not modify any source code
- Do not access the implementing agent's reasoning or conversation
- Output eval: test only against acceptance criteria — nothing more, nothing less
- Trajectory eval: assess against slice plans, architecture docs, and known patterns — not personal preference
- Write the verification report in STE:
  - Table cells (Evidence, Finding): one sentence, max 25 words, active voice.
  - Fix issues in current-issues.md: one sentence per field, active voice.
```

---

### Phase 4 — DRIFT AUDIT

**Purpose**: Align remaining specs with reality. Classify every divergence as evolution or shortcut.

**Key change from v1**: Classification prevents drift-to-low-performance. The audit flags shortcuts — it does not silently accept them.

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

## For each divergence found
1. State: the spec file, the divergent assumption, what actually exists now
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
- If any divergences require re-verification → return to Phase 3 (VERIFY)
- Write drift signals in STE:
  - Each field (What diverged, Why): one sentence, max 25 words, active voice.
  - Spec edits follow STE sentence rules.
```

---

### Phase 5 — RETROSPECTIVE

**Purpose**: Extract compound value from this wave. This is the reinforcing loop — without it, the system maintains but does not grow.

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

### 3b. Apply queued architecture updates
Check the build order / specs for any "Architecture Context Updates Needed" sections
(invariants, key flow changes, env vars, new routes, cron jobs, etc.).
These are planned updates documented during SHAPE — not drift.
Apply them to the relevant context files now:
- New invariants → append to docs/context/architecture-context.md § Invariants
- Flow changes → update docs/context/architecture-context.md § Key Flows
- New env vars → update docs/context/architecture-context.md § Environment & Config
- New routes → update docs/context/architecture-context.md § Non-Obvious Routes
If no queued updates exist, skip this step.

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

## Constraints
- Write all signal files and work-log entries in STE:
  - Pattern descriptions: one sentence per field, max 25 words.
  - Friction analysis: active voice, one issue per sentence.
  - Work-log entry: max 25 words per bullet.
```

---

### EXIT CONDITION

The loop exits when ALL of these are true:
1. All waves in the feature are implemented
2. All waves are independently verified (Phase 3 passed)
3. All drift is audited with zero unresolved divergences
4. Every wave has a logged retrospective
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

Format: Each field value is one sentence, max 25 words, active voice.

### friction/<topic>.md
Recurring implementation pain point. Created during Phase 2 (Implement).
- Date:
- Spec:
- Description:
- Root cause: CODEBASE | AGENT | SPEC
- Suggested fix:

Format: Description and Suggested fix are each one sentence, max 25 words, active voice.

### patterns/<pattern-name>.md
Reusable solution discovered during implementation. Created during Phase 5 (Retro).
- Pattern name:
- Problem it solves:
- Solution:
- First used in:
- Reusable? YES | MAYBE | NO

Format: Problem and Solution are each one sentence, max 25 words. Solution may include a code snippet after the sentence.

## Rules
- One signal per file (not appended to a master list)
- Filename = slugified topic, no dates in filename
- Signals are never deleted — they accumulate
- Phase 1 (Shape) MUST read signals/ before planning
- All signal prose follows STE: active voice, max 25 words per sentence, controlled vocabulary
```

---

## Work Log Format

### docs/loops/work-log.md

```markdown
# Work Log

Append-only. Every agent reads the last 10 entries at session start for context.
Each bullet value is one sentence, max 25 words, active voice. Use terms from the Controlled Vocabulary.

---

## [YYYY-MM-DD HH:MM] <agent-role> | <feature> wave <N>

- **Picked up**: <what this agent was tasked with>
- **Result**: <what was completed, pass/fail>
- **Unresolved**: <what could not be completed, or "none">
```

---

## Quick Reference

| Phase | Who | Input | Output | Decision point |
|-------|-----|-------|--------|----------------|
| SHAPE | Human + agent | Feature brief, signals/ | Specs, waves, slice plans | User confirms shape |
| IMPLEMENT | Parallel agents (worktrees) | Slice plans | Code, friction signals | Per-slice: lint/type-check pass? |
| VERIFY | Separate fresh agent | Specs + changed files + git diff + patterns | Verify report (output + trajectory) | Any FAIL → back to IMPLEMENT; flags → friction signals |
| DRIFT AUDIT | Agent | Remaining specs vs reality | Drift signals, patched specs | Any divergences → back to VERIFY |
| RETRO | Agent | All signals from wave | Patterns, updated harness | Waves remaining → next TRIGGER |
