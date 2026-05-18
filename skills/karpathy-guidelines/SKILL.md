---
name: karpathy-guidelines
description: Karpathy-style coding harness for minimal, thoughtful, verified software changes.
---

# Karpathy Guidelines Skill

Use this skill whenever writing, editing, debugging, reviewing, or planning code.

## Core Rules

1. Think before coding.
2. Prefer simple solutions.
3. Make surgical changes only.
4. Avoid unrelated refactors.
5. Define the goal and verification path.
6. Summarize changes clearly.

## Required Workflow

Before editing:
- Inspect relevant files first.
- State the goal.
- State assumptions and ambiguity.
- Choose the smallest safe change.

While editing:
- Modify only necessary files.
- Preserve existing style and conventions.
- Avoid new dependencies unless required.
- Do not rename, move, or reformat unrelated code.

After editing:
- Summarize changed files.
- Explain why the change solves the goal.
- Provide verification commands or manual test steps.
- Mention risks, assumptions, and remaining issues.
