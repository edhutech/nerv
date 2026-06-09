# TASK-022: Finalize List And Status Commands For Closed Work

## Status

Closed

## Parent Build

BUILD-007

## Task Goal

Polish `nerv tasks`, `nerv builds`, `nerv runs`, and `nerv status` so users can inspect open and closed lifecycle state clearly.

## Why this task matters

After close exists, developers need quick ways to see what is active, what is complete, and whether product/work context is available.

## Context

Task, Build, and Run list commands already exist. This task should finalize their post-close usefulness rather than redesign them.

## Scope

This task includes:

- Show closed timestamps where available in list output.
- Show useful lifecycle counts in `nerv status`.
- Show current Run information in `nerv status` when available.
- Keep Task and Build query behavior working.
- Improve empty-state and missing-reference output where needed.
- Add smoke coverage for post-close list/status output.

## Out of scope

This task does not include:

- New interactive UI.
- Advanced filtering or formatting flags unless required by acceptance criteria.
- Close implementation.
- Clean implementation.
- Schema redesign.

## Files to inspect

The agent should inspect these files before making changes:

- `src/index.ts`
- `src/repository.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/builds/BUILD-007-git-aware-close-evolution-lists-and-clean.md`

## Files likely to change

The agent may need to change:

- `src/index.ts`
- `src/repository.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-022-finalize-list-and-status-commands-for-closed-work.md`

## Data or state affected

This task primarily affects CLI output. It may require repository helper queries for lifecycle counts, but should avoid unnecessary schema changes.

## Acceptance criteria

This task is complete when:

- `nerv tasks` shows closed Task state clearly.
- `nerv builds` shows Build status and Task count clearly after close.
- `nerv runs` shows closed Run state clearly.
- `nerv status` summarizes workspace context, current Run, and lifecycle counts.
- Existing query behavior for `nerv tasks [query]` and `nerv builds [query]` still works.
- Smoke coverage verifies the finalized output.

## Validation

Run or verify:

- `pnpm build`
- `pnpm typecheck`
- `pnpm smoke`

## Risks

- Smoke tests can become brittle if they assert too much prose.
- More status output can become noisy if not kept concise.
- List commands should remain useful in empty repos.

## Agent instructions

Keep output concise and stable. Prefer small additions to existing list/status commands over adding new command surfaces.

## Active work instructions

Use this Task file as the active execution record.

Do not create a manual Run file. Record progress in the checkpoint log below, then record review and close evidence in this same Task file.

## Expected evidence

At the end, provide:

- Example list/status output
- Smoke checks added
- Files changed
- Validation results
- Suggested commit message

## Commit checklist

Before committing:

- Review `git status --short`.
- Review `git diff`.
- Review recent commits with `git log --oneline -5`.
- Run required validation or explain why it could not run.
- Stage only files related to this Task.
- Use the commit message format from `agent-workspace/method/commit-system.md`.
- Record the implementation commit hash in a separate metadata commit if needed.

## Checkpoint log

### Checkpoint 001

Implemented on 2026-06-09.

**What changed:**

- Updated `nerv tasks` to show `Closed: <timestamp>` for closed tasks
- Updated `nerv builds` to show `Tasks: X/Y closed` format
- Updated `nerv runs` to show `Closed: <timestamp>` for closed runs
- Enhanced `nerv status` to show:
  - Current active run (if any)
  - Lifecycle counts: builds, tasks, runs (open/closed)
- Added smoke test for new status output
- Fixed existing smoke test assertion for new builds output format

**Files touched:**

- `src/index.ts`
- `scripts/smoke-cli.mjs`

**Validation performed:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (109 tests).

**Pending work:**

- Review and close TASK-022.

**Suggested commit message:**

```txt
TASK-022 Finalize list and status commands for closed work

- Show closed timestamps in tasks/builds/runs lists
- Show current run in status command
- Show lifecycle counts (open/closed) in status
- Add smoke tests for enhanced status output
```

## Review

Reviewed on 2026-06-09.

**Status:** Approved

**Acceptance criteria verification:**

- ✓ `nerv tasks` shows closed Task state clearly
- ✓ `nerv builds` shows Build status and Task count clearly after close
- ✓ `nerv runs` shows closed Run state clearly
- ✓ `nerv status` summarizes workspace context, current Run, and lifecycle counts
- ✓ Existing query behavior for `nerv tasks [query]` and `nerv builds [query]` still works
- ✓ Smoke coverage verifies the finalized output

**Implementation quality:**

- Clean output formatting with consistent style
- Status command provides useful at-a-glance information
- All existing tests pass with updated assertions
- New test covers enhanced status output

**Residual risks:**

- None identified for this task scope.

## Close summary

Closed on 2026-06-09.

**Commit status:**

Committed as 7998e61.

**Final summary:**

TASK-022 polished the list and status commands to show closed state clearly. Users can now see closed timestamps, current active run, and lifecycle counts at a glance.

**User or developer value delivered:**

Developers have better visibility into their work lifecycle with clear indicators of what's active vs completed.

**Files changed:**

- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-022-finalize-list-and-status-commands-for-closed-work.md`

**Validation evidence:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (109 tests).
