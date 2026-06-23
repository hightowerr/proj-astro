---
type: pattern
wave: 4
date: 2026-06-22
---

# Pattern: Parallel companion component delegation

## What happened
Wave 4 had 2 large companion components (1308 + 849 lines, 155 inline styles combined)
that were stretch scope. By delegating each to a separate coder agent in an isolated
worktree, both were converted simultaneously while the main session handled docs/tracking.

## Why it worked
- Each component was self-contained (no cross-file dependencies)
- The conversion rules were mechanical and well-defined (token mapping table)
- Isolated worktrees prevented conflicts with main session work
- Results were verified independently before merging

## When to reuse
When a wave has large, independent files that follow the same conversion pattern,
delegate them to parallel agents. Best when the conversion rules can be fully
specified upfront (token map, class list, rules for dynamic values).
