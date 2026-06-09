# TASK-016: Implement nerv current And nerv runs

## Status

Closed

## Parent Build

BUILD-005

## Task Goal

Add active Run discovery and compact Run listing commands.

## Why this task matters

After a Run starts, developers need to resume the active Run without remembering the generated path.

## Context

`nerv current` and `nerv runs` are currently placeholders. They should rely on the Run records and current Run metadata created by earlier BUILD-005 work.

## Scope

This task includes:

- Replace the `nerv current` placeholder.
- Replace the `nerv runs` placeholder.
- Show current Run ID, Task ID/title, status and `run.md` path.
- List Runs in stable order.
- Show clear empty-state messages.
- Keep output compact and terminal-friendly.

## Out of scope

This task does not include:

- Closing Runs.
- Filtering Runs beyond basic listing.
- Checkpoint, review or close lifecycle behavior.

## Files to inspect

The agent should inspect these files before making changes:

- `src/index.ts`
- `src/repository.ts`
- `src/run.ts` if created in TASK-015
- `scripts/smoke-cli.mjs`

## Files likely to change

The agent may need to change:

- `src/index.ts`
- `src/repository.ts`
- `src/run.ts`
- `scripts/smoke-cli.mjs`

## Data or state affected

This task reads `runs`, `tasks` and `metadata.current_run_id`. No new schema is expected.

## Acceptance criteria

This task is complete when:

- `nerv current` identifies the active Run after `nerv start`.
- `nerv runs` lists created Runs.
- Empty states are clear.
- Output includes enough information to resume agent work.

## Validation

Run or verify:

- `pnpm build`
- `pnpm typecheck`
- `pnpm smoke`
- Manual verification after starting a Run.

## Risks

- Current Run metadata may point to a deleted or stale row in future manual edits.
- Output should not duplicate the full `run.md`.

## Agent instructions

Keep this as query/display behavior only. Do not implement review, checkpoint, close or status transitions beyond active Run tracking.

## Expected evidence

At the end, provide:

- Example `nerv current` output
- Example `nerv runs` output
- Validation results
- Suggested commit message

## Checkpoint log

### Checkpoint 001

Implemented on 2026-06-09.

**What changed:**

- Replaced `nerv current` placeholder with actual implementation.
- Replaced `nerv runs` placeholder with actual implementation.
- `nerv current` shows:
  - "No current run." when no active run exists
  - "Current run RUN-### not found." when stale metadata exists
  - "Current run RUN-### references missing task TASK-###." when task is missing
  - Active run output with run ID, task ID, task title, status, and run file path
- `nerv runs` shows:
  - "No runs found." when no runs exist
  - List of all runs with run ID, task ID, task title, and status
  - "(missing task)" label when task reference is broken
- Added smoke coverage for:
  - empty `current` message
  - empty `runs` message
  - active current run output
  - run listing
  - multiple runs
  - current run after second start

**Files touched:**

- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-016-implement-nerv-current-and-runs.md`
- `agent-workspace/runs/RUN-016-task-016-implement-nerv-current-and-runs.md`

**Validation performed:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (77 tests).

**Pending work:**

- Review and close TASK-016.

**Suggested commit message:**

```txt
TASK-016 Implement nerv current and nerv runs

- Replace nerv current placeholder with active run discovery
- Replace nerv runs placeholder with run listing
- Handle stale current_run_id and missing task references gracefully
- Add smoke coverage for current and runs commands
```

## Review

Reviewed on 2026-06-09.

No blocking or behavioral findings found.

**Review notes:**

- `nerv current` correctly identifies the active Run after `nerv start`.
- `nerv current` handles stale metadata and missing task references gracefully.
- `nerv runs` lists created Runs in stable order.
- Empty states are clear and non-error.
- Output includes enough information to resume agent work.
- Smoke coverage exercises empty states, active run, run listing, and multiple runs. Stale metadata handling was reviewed in code.

**Validation evidence:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (77 tests).

**Residual risks:**

- None identified. Current Run metadata is simple and stable for MVP scope.

## Close summary

Closed on 2026-06-09.

**Commit status:**

Closed and committed as 077cd83.

**Final summary:**

TASK-016 implemented `nerv current` and `nerv runs` commands. Developers can now discover the active Run and list all Runs without remembering generated paths or querying SQLite directly.

**User or developer value delivered:**

Developers can resume agent work and inspect Run history from the CLI.

**Files changed:**

- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-016-implement-nerv-current-and-runs.md`
- `agent-workspace/runs/RUN-016-task-016-implement-nerv-current-and-runs.md`
- `agent-workspace/builds/BUILD-005-run-generation-and-agent-entrypoint.md`
- `agent-workspace/evolution/product-evolution.md`

**Validation evidence:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (77 tests).

**Related Build update:**

BUILD-005 now has all three tasks closed: TASK-014, TASK-015, and TASK-016.

**Follow-up tasks:**

- None. BUILD-005 is complete.
