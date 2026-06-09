# TASK-013: Add Work Item Query Commands

## Status

Closed

## Parent Build

BUILD-004

## Task Goal

Implement `nerv tasks [query]` and `nerv builds [query]` so created Agentic Tasks and Agentic Builds are easy to find and verify from the CLI.

## Why this task matters

BUILD-004 is only useful if stored work can be discovered again. Query commands close the loop between creation, planning and later run selection.

## Context

The command skeletons already exist. TASK-010 through TASK-012 should provide persisted builds, tasks and relationships. This task should keep listing output concise and useful for local developer workflow.

## Scope

This task includes:

- Replace the `nerv tasks` placeholder with list and simple query behavior.
- Replace the `nerv builds` placeholder with list and simple query behavior.
- Support lookup by exact ID and case-insensitive text query across title or intent.
- Show task status, title and parent build when available.
- Show build status, title and task count when available.
- Handle empty results clearly.
- Add smoke coverage for listing, ID lookup and text query behavior.

## Out of scope

This task does not include:

- `nerv start` task selection or run creation.
- Advanced filtering, sorting flags or full-text search.
- Interactive selection UI.
- Status transitions beyond displaying stored status.
- Review, checkpoint or close lifecycle behavior.

## Files to inspect

The agent should inspect these files before making changes:

- `src/index.ts`
- `src/repository.ts`
- Work-item support files added by TASK-010 through TASK-012
- `scripts/smoke-cli.mjs`
- `README.md`
- `agent-workspace/builds/BUILD-004-agentic-builds-and-tasks.md`

## Files likely to change

The agent may need to change:

- `src/index.ts`
- `src/repository.ts`
- Work-item support files under `src/`
- `scripts/smoke-cli.mjs`
- `README.md`
- `agent-workspace/tasks/TASK-013-add-work-item-query-commands.md`

## Data or state affected

Reads task and build rows from `.nerv/nerv.db`. Does not create or mutate work state except for any task file checkpoint updates in the agent workspace.

## Acceptance criteria

This task is complete when:

- `nerv tasks` lists stored tasks in a stable order.
- `nerv tasks TASK-001` or `nerv tasks login` can find matching tasks.
- `nerv builds` lists stored builds in a stable order.
- `nerv builds BUILD-001` or `nerv builds onboarding` can find matching builds.
- Task output shows parent build when a task belongs to a build.
- Build output shows a useful task count.
- Empty lists and no-match queries produce clear non-error output.
- Smoke tests cover the list and query behavior.

## Validation

Run or verify:

- `pnpm build`
- `pnpm typecheck`
- `pnpm smoke`
- Manual run of task/build creation followed by `nerv tasks` and `nerv builds` queries in a temporary repo.

## Risks

- Output formatting can become noisy if too much planning content is printed.
- Query behavior may need refinement before `nerv start <query>` depends on it.
- Case-insensitive substring search is intentionally simple and may return broad matches.

## Agent instructions

Work only within this task scope.

Do not implement `nerv start`, run generation or advanced search. Keep CLI output compact enough to be useful in a terminal and stable enough for smoke tests.

## Expected evidence

At the end, provide:

- Example `nerv tasks` output
- Example `nerv builds` output
- Query behavior summary
- Files changed
- Validation results
- Remaining risks
- Suggested commit message

## Checkpoint log

### Checkpoint 001

Implemented on 2026-06-08.

**What changed:**

- Added `searchBuilds(query)` method to repository for searching builds by ID or text
- Added `searchTasks(query)` method to repository for searching tasks by ID or text
- Added `getBuildTaskCount(buildId)` method to repository for counting tasks per build
- Implemented `nerv tasks [query]` command with list and search functionality
- Implemented `nerv builds [query]` command with list and search functionality
- Added 8 smoke tests for query commands

**Files touched:**

- `src/repository.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-013-add-work-item-query-commands.md`
- `agent-workspace/runs/RUN-013-task-013-add-work-item-query-commands.md`

**Decisions made:**

- Search by exact ID first (e.g., TASK-001), then fall back to text search
- Text search is case-insensitive and matches title or intent
- Task output shows parent build ID when available
- Build output shows task count
- Empty results show clear message instead of error

**Validation performed:**

- `pnpm validate` passed
- All 56 smoke tests pass including 8 new query tests

**Pending work:**

- Review and close TASK-013

## Review

Reviewed 2026-06-08. Implementation satisfies all acceptance criteria:

- `nerv tasks` and `nerv builds` list work items in stable order (id DESC).
- Exact ID lookup works for both commands; case-insensitive text search falls back to `LIKE` on title/intent.
- Task output includes parent build annotation (e.g., `[BUILD-001]`) when available.
- Build output includes task count.
- Empty-list and no-match cases produce clear non-error output.
- All 60 smoke tests pass (56 prior + 4 new for empty-list and whitespace query behavior).

Residual risks identified and addressed:
1. Whitespace-only queries (e.g., `nerv tasks "   "`) were returning broad `LIKE '%%'` results with a misleading "matching" message. Fixed by normalizing query input at the CLI boundary and guarding repository search functions against empty trimmed input.
2. Smoke tests did not assert parent-build task display or true empty-list output. Fixed by adding assertions for `[BUILD-001]` in task listing and `No tasks found.` / `No builds found.` in empty-repo scenarios.

No functional blockers found.

## Close summary

TASK-013 is complete. The following changes were committed:

**What changed:**
- Added `searchBuilds(query)` and `searchTasks(query)` repository methods with exact-ID-first-then-text-search logic.
- Added `getBuildTaskCount(buildId)` repository method.
- Implemented `nerv tasks [query]` and `nerv builds [query]` CLI commands with normalized query handling.
- Fixed whitespace-only queries to behave as list commands (not broad searches).
- Added 12 smoke tests (4 new + 8 from initial implementation) covering list, query, empty-list, whitespace-input, and parent-build display behavior.

**Files changed:**
- `src/index.ts`: CLI command implementations
- `src/repository.ts`: search and count methods
- `scripts/smoke-cli.mjs`: 12 smoke tests for query commands
- `agent-workspace/tasks/TASK-013-add-work-item-query-commands.md`: task metadata
- `agent-workspace/runs/RUN-013-task-013-add-work-item-query-commands.md`: run metadata

**Validation:**
- `pnpm build` passed
- `pnpm typecheck` passed
- `pnpm smoke` passed (60 tests)

**Suggested commit message:**
```
TASK-013 Add nerv tasks and nerv builds query commands

- Add searchBuilds(query) and searchTasks(query) to repository
- Add getBuildTaskCount(buildId) to repository
- Implement nerv tasks [query] with exact-ID and text search
- Implement nerv builds [query] with exact-ID and text search
- Normalize whitespace-only queries to list behavior
- Add 12 smoke tests covering list, query, empty-list, whitespace input,
  and parent-build display for tasks
```
