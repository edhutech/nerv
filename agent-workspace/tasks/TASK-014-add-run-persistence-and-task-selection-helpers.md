# TASK-014: Add Run Persistence And Task Selection Helpers

## Status

Closed

## Parent Build

BUILD-005

## Task Goal

Add repository-level Run operations and deterministic Task selection behavior needed by `nerv start <query>`.

## Why this task matters

`nerv start` needs reliable SQLite state before it can generate agent-facing files or track the active Run.

## Context

The SQLite schema already includes a `runs` table and ID generation already supports `RUN-###`. The current CLI still has placeholders for `nerv start`, `nerv current` and `nerv runs`.

## Scope

This task includes:

- Add `RunRecord` and create/list/get helpers in `src/repository.ts`.
- Add deterministic Task selection from query.
- Prefer exact `TASK-###` match before text search.
- Error clearly when no Task matches.
- Error clearly when multiple Tasks match.
- Add active/current Run tracking via metadata.

## Out of scope

This task does not include:

- Generating `run.md`.
- Implementing final CLI output for `nerv start`.
- Checkpoint, review or close behavior.
- Interactive selection UI.

## Files to inspect

The agent should inspect these files before making changes:

- `src/repository.ts`
- `src/database.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`

## Files likely to change

The agent may need to change:

- `src/repository.ts`
- `scripts/smoke-cli.mjs`

## Data or state affected

This task affects the existing `runs` SQLite table and the existing `metadata` table for current Run tracking. No schema migration is expected.

## Acceptance criteria

This task is complete when:

- A Run can be created for an existing Task.
- Run IDs use existing `RUN-###` generation.
- Current active Run ID can be stored and retrieved.
- Ambiguous Task queries do not silently choose a Task.

## Validation

Run or verify:

- `pnpm build`
- `pnpm typecheck`
- `pnpm smoke`

## Risks

- Query behavior must remain compatible with existing `nerv tasks [query]`.
- Active Run tracking via metadata is simple but must not conflict with future close behavior.

## Agent instructions

Keep this task focused on data access and selection behavior. Do not implement generated Markdown or CLI commands beyond what tests require for helper behavior.

## Expected evidence

At the end, provide:

- Summary of repository helpers added
- Selection behavior examples
- Validation results
- Remaining risks
- Suggested commit message

## Checkpoint log

### Checkpoint 001

Implemented on 2026-06-09.

**What changed:**

- Added `RunRecord` and `CreateRunInput` repository types.
- Added `createRun`, `getRun` and `listRuns` repository helpers.
- Added `getCurrentRunId` and `setCurrentRunId` metadata helpers.
- Added `selectTaskForRun(query)` with exact `TASK-###` lookup, text fallback and clear missing or ambiguous query errors.
- Added smoke coverage for Run creation, retrieval, listing, current Run metadata and Task selection behavior.

**Files touched:**

- `src/repository.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/builds/BUILD-005-run-generation-and-agent-entrypoint.md`
- `agent-workspace/tasks/TASK-014-add-run-persistence-and-task-selection-helpers.md`
- `agent-workspace/tasks/TASK-015-implement-nerv-start-and-run-markdown-generation.md`
- `agent-workspace/tasks/TASK-016-implement-nerv-current-and-runs.md`
- `agent-workspace/runs/RUN-014-task-014-add-run-persistence-and-task-selection-helpers.md`

**Selection behavior examples:**

- `selectTaskForRun("TASK-001")` returns the exact Task.
- `selectTaskForRun("Standalone")` returns the single text match.
- `selectTaskForRun("Task")` throws an ambiguous query error when multiple Tasks match.
- `selectTaskForRun("Missing task")` throws a no-match error.

**Validation performed:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed.

**Pending work:**

- Implement `nerv start <query>` and generated `run.md` in TASK-015.

**Suggested commit message:**

```txt
TASK-014 Add run persistence and task selection helpers

- Add Run repository types and create/get/list helpers
- Add current Run metadata helpers
- Add deterministic Task selection for future nerv start behavior
- Add smoke coverage for Run persistence and selection errors
```

## Review

Reviewed on 2026-06-09.

No blocking or behavioral findings were found.

**Review notes:**

- `src/repository.ts` satisfies the task scope with Run create/get/list helpers, current Run metadata helpers and deterministic Task selection.
- Ambiguous Task queries are rejected instead of silently selecting a Task.
- No schema migration was added, which matches the existing `runs` table and task scope.
- Smoke coverage exercises exact selection, text selection, missing and ambiguous query errors, Run persistence and current Run metadata.

**Validation evidence:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed.

**Residual risks:**

- `setCurrentRunId` does not validate that the Run exists. TASK-016 should handle stale metadata gracefully in `nerv current`.
- `createRun` relies on SQLite foreign keys for invalid `task_id` rejection, which is acceptable for repository-level MVP behavior.

## Close summary

Closed on 2026-06-09.

**Commit status:**

Not committed. The task passed review and validation, but the current workspace changes have not been committed yet.

**Final summary:**

TASK-014 added the persistence foundation needed by future Run commands. The repository can now create, retrieve and list Run records, store and retrieve the active Run ID, and deterministically select exactly one Task for a future `nerv start <query>` flow.

**User or developer value delivered:**

This enables `nerv start` to build on reliable local state instead of ad hoc task lookup or generated-file-only behavior.

**Files changed:**

- `src/repository.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/builds/BUILD-005-run-generation-and-agent-entrypoint.md`
- `agent-workspace/tasks/TASK-014-add-run-persistence-and-task-selection-helpers.md`
- `agent-workspace/tasks/TASK-015-implement-nerv-start-and-run-markdown-generation.md`
- `agent-workspace/tasks/TASK-016-implement-nerv-current-and-runs.md`
- `agent-workspace/runs/RUN-014-task-014-add-run-persistence-and-task-selection-helpers.md`
- `agent-workspace/evolution/product-evolution.md`

**Validation evidence:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed.

**Related Build update:**

BUILD-005 now has TASK-014 closed. TASK-015 and TASK-016 remain pending.

**Follow-up tasks:**

- TASK-015: Implement `nerv start <query>` and generated `run.md`.
- TASK-016: Implement `nerv current` and `nerv runs`.
