# RUN-014

## Status

Closed

## Active Task

TASK-014: Add Run Persistence And Task Selection Helpers

## Parent Build

BUILD-005

## Primary context

Read first:

- `../tasks/TASK-014-add-run-persistence-and-task-selection-helpers.md`

## Supporting context

Read only if needed:

- `../builds/BUILD-005-run-generation-and-agent-entrypoint.md`
- `../product/architecture.md`
- `../product/stack.md`
- `../product/development.md`
- `../product/decisions.md`

## Scope rule

The Agentic Task is the execution scope. The Agentic Build provides shared context, but it does not expand the scope of this Run.

## What to do now

Implement Run persistence and deterministic Task selection helpers for future `nerv start <query>` behavior.

## Files to inspect first

- `src/repository.ts`
- `src/database.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`

## Expected implementation plan

- Add `RunRecord` and create/get/list repository helpers.
- Add current Run metadata helpers.
- Add a deterministic Task selection helper that exact-matches `TASK-###`, falls back to text search and rejects ambiguous results.
- Add smoke coverage for Run creation, current Run metadata and selection behavior.

## Validation plan

- Run `pnpm build`.
- Run `pnpm typecheck`.
- Run `pnpm smoke`.

## Do not do

- Do not implement `nerv start` file generation.
- Do not implement `nerv current` or `nerv runs` display behavior.
- Do not add checkpoint, review or close lifecycle behavior.
- Do not add schema migrations unless strictly required.

## Completion checklist

Before finishing this Run, provide:

- What changed
- Files touched
- Decisions made
- Validation performed
- Pending work
- Suggested next step
- Suggested commit message

## Checkpoint 001

Implemented on 2026-06-09.

**What changed:**

- Added Run persistence helpers in `src/repository.ts`.
- Added current Run metadata helpers backed by `metadata.current_run_id`.
- Added deterministic Task selection for future `nerv start <query>` behavior.
- Added smoke checks for exact selection, text selection, ambiguous/missing query errors, Run creation/retrieval/listing and current Run metadata.

**Files touched:**

- `src/repository.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/builds/BUILD-005-run-generation-and-agent-entrypoint.md`
- `agent-workspace/tasks/TASK-014-add-run-persistence-and-task-selection-helpers.md`
- `agent-workspace/tasks/TASK-015-implement-nerv-start-and-run-markdown-generation.md`
- `agent-workspace/tasks/TASK-016-implement-nerv-current-and-runs.md`
- `agent-workspace/runs/RUN-014-task-014-add-run-persistence-and-task-selection-helpers.md`

**Decisions made:**

- Reused the existing `runs` table without a schema migration.
- Used `metadata.current_run_id` for active Run tracking.
- Made exact `TASK-###` selection case-insensitive by normalizing to uppercase.
- Rejected ambiguous text matches instead of silently picking the first result.

**Validation performed:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed.

**Pending work:**

- Continue with TASK-015 to implement `nerv start <query>` and focused `run.md` generation.

**Suggested next step:**

- Start TASK-015.

**Suggested commit message:**

```txt
TASK-014 Add run persistence and task selection helpers

- Add Run repository types and create/get/list helpers
- Add current Run metadata helpers
- Add deterministic Task selection for future nerv start behavior
- Add smoke coverage for Run persistence and selection errors
```

## Review

Reviewed on 2026-06-09. No blocking or behavioral findings were found. Validation passed with `pnpm build`, `pnpm typecheck` and `pnpm smoke`.

Residual risks are deferred to later tasks: `nerv current` should handle stale current Run metadata, and invalid Run task IDs continue to rely on SQLite foreign key enforcement.

## Close summary

Closed on 2026-06-09.

**Commit status:** Not committed.

**Final summary:** TASK-014 added Run persistence, current Run metadata helpers and deterministic Task selection for future `nerv start <query>` behavior.

**Build update:** BUILD-005 has one closed task. TASK-015 and TASK-016 remain pending.

**Product evolution:** Updated `agent-workspace/evolution/product-evolution.md` with TASK-014 progress.
