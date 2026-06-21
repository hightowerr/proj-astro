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
