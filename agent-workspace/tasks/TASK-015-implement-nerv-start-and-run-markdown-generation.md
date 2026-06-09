# TASK-015: Implement nerv start And Run Markdown Generation

## Status

Closed

## Parent Build

BUILD-005

## Task Goal

Implement `nerv start <query>` so it creates a Run and generates `.nerv/agent/runs/RUN-001/run.md`.

## Why this task matters

`run.md` is the main agent entrypoint and the central proof of Nerv's MVP value.

## Context

The agent entrypoint should be focused, deterministic and usable without re-reading the whole workspace.

## Scope

This task includes:

- Replace the `nerv start` placeholder.
- Resolve a Task using deterministic selection helpers.
- Create a Run row in SQLite.
- Mark the Run as active/current.
- Generate `.nerv/agent/runs/RUN-###/run.md`.
- Generate supporting `.nerv/agent/runs/RUN-###/task.md` if useful.
- Include scope, context files, acceptance criteria, validation commands, checkpoint instructions, review instructions, close instructions and Git awareness.

## Out of scope

This task does not include:

- Running the coding agent.
- Checkpoint, review or close implementation.
- Automatic Git operations.
- Interactive selection UI.

## Files to inspect

The agent should inspect these files before making changes:

- `src/index.ts`
- `src/task.ts`
- `src/build.ts`
- `src/context.ts`
- `src/repo-context.ts`
- `agent-workspace/method/run-template.md`

## Files likely to change

The agent may need to change:

- `src/index.ts`
- `src/run.ts`
- `scripts/smoke-cli.mjs`

## Data or state affected

This task affects `runs` SQLite rows, `metadata.current_run_id` and generated files under `.nerv/agent/runs/RUN-###/`.

## Acceptance criteria

This task is complete when:

- `nerv start TASK-001` creates `RUN-001`.
- Generated `run.md` is focused, not a full context dump.
- Generated `run.md` is usable as the single coding-agent entrypoint.
- CLI output tells the user exactly which file to give the agent.

## Validation

Run or verify:

- `pnpm build`
- `pnpm typecheck`
- `pnpm smoke`
- Manual temp repo flow with `nerv init`, `nerv new task`, `nerv start TASK-001` and inspection of generated `run.md`.

## Risks

- Generated Markdown may become too verbose.
- Context links must be relative and useful.
- Task scope must win over Build context.

## Agent instructions

Prefer a small `src/run.ts` module for run creation and Markdown generation. Keep generated content deterministic and compact.

## Expected evidence

At the end, provide:

- Example `nerv start` output
- Generated `run.md` path
- Files changed
- Validation results
- Suggested commit message

## Checkpoint log

### Checkpoint 001

Implemented on 2026-06-09.

**What changed:**

- Created `src/run.ts` with `startRun()` function for run creation and markdown generation.
- Replaced `nerv start` placeholder in `src/index.ts` with actual implementation.
- Generated `run.md` includes: Active Task, Parent Build, Primary context, Supporting context, Scope rule, Acceptance criteria, Validation, Checkpoint instructions, Review instructions, Close instructions, Git awareness, and Completion checklist.
- Generated `task.md` as supporting context with task details.
- Added smoke coverage for `nerv start` command.

**Files touched:**

- `src/run.ts` (new)
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-015-implement-nerv-start-and-run-markdown-generation.md`
- `agent-workspace/runs/RUN-015-task-015-implement-nerv-start-and-run-markdown-generation.md`

**Validation performed:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (71 tests).

**Pending work:**

- Review and close TASK-015.

### Checkpoint 002

Implemented on 2026-06-09 after review feedback.

**What changed:**

- Updated generated `run.md` so the primary context points to the local supporting `./task.md` file.
- Corrected generated supporting context links from a Run directory to source task, build and product files.
- Added smoke assertions for local `task.md`, source task and product context links in generated `run.md`.

**Validation performed:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed.

**Pending work:**

- Re-review and close TASK-015.

**Suggested commit message:**

```txt
TASK-015 Implement nerv start and run markdown generation

- Add src/run.ts with startRun() for run creation and markdown generation
- Replace nerv start placeholder with actual implementation
- Generate focused run.md with scope, context, validation, and lifecycle instructions
- Generate supporting task.md with task details
- Add smoke coverage for nerv start command
```

## Review

Reviewed on 2026-06-09.

No blocking or behavioral findings found.

**Review notes:**

- `nerv start <query>` creates a Run, sets it current, and generates `run.md` plus local `task.md`.
- Generated `run.md` uses `./task.md` as primary context, so agents can follow the local supporting file directly.
- Supporting context links are correctly relative from `.nerv/agent/runs/RUN-###/run.md`.
- Smoke coverage now asserts local `task.md`, source task, and product context links.

**Validation evidence:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed.

**Residual risks:**

- TASK-016 should handle `current_run_id` display and stale metadata gracefully.

## Close summary

Closed on 2026-06-09.

**Commit status:**

Not committed. The task passed review and validation, but the current workspace changes have not been committed yet.

**Final summary:**

TASK-015 implemented `nerv start <query>` so it creates a Run in SQLite, marks it active, and generates a focused `run.md` plus a local `task.md` under `.nerv/agent/runs/RUN-###/`. The generated `run.md` is usable as the single agent entrypoint with scope, context, acceptance criteria, validation, checkpoint, review, close and Git awareness sections.

**User or developer value delivered:**

Developers can now start a focused agent run without re-explaining product context, task scope or validation expectations.

**Files changed:**

- `src/run.ts` (new)
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-015-implement-nerv-start-and-run-markdown-generation.md`
- `agent-workspace/runs/RUN-015-task-015-implement-nerv-start-and-run-markdown-generation.md`
- `agent-workspace/builds/BUILD-005-run-generation-and-agent-entrypoint.md`
- `agent-workspace/evolution/product-evolution.md`

**Validation evidence:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed.

**Related Build update:**

BUILD-005 now has TASK-015 closed. TASK-016 remains pending.

**Follow-up tasks:**

- TASK-016: Implement `nerv current` and `nerv runs`.
