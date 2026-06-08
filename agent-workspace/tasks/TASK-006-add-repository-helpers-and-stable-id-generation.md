# TASK-006: Add Repository Helpers And Stable ID Generation

## Status

Closed

## Parent Build

BUILD-002

## Task Goal

Add a small data-access layer over SQLite and stable local ID generation for records such as `BUILD-001`, `TASK-001` and `RUN-001`.

## Why this task matters

The MVP needs predictable identifiers and a thin repository layer before later commands can create and query lifecycle records consistently.

## Context

BUILD-002 includes both the SQLite foundation and stable ID generation. After the schema exists, Nerv still needs a small repository layer that keeps database access direct and simple while providing deterministic local IDs for future build, task and run creation.

## Scope

This task includes:

- Add a small repository or data-access layer using `better-sqlite3`.
- Implement stable sequential ID generation for at least `BUILD-###`, `TASK-###` and `RUN-###`.
- Store the counters or derive them safely from local state.
- Add minimal repository helpers needed by BUILD-002 and near-term commands.
- Keep interfaces small and easy to evolve.

## Out of scope

This task does not include:

- Implementing `nerv new task`, `nerv new build` or `nerv start`.
- Rich search, filtering or listing queries.
- Supporting every future record workflow in this task.

## Files to inspect

The agent should inspect these files before making changes:

- Database bootstrap files added in TASK-005
- `src/index.ts`
- `agent-workspace/builds/BUILD-002-local-workspace-and-sqlite-state.md`
- `agent-workspace/product/architecture.md`
- `agent-workspace/product/mvp.md`

## Files likely to change

The agent may need to change:

- New repository files under `src/`
- Database bootstrap files under `src/`
- Possibly `src/index.ts`
- `README.md`

## Data or state affected

Extends local SQLite usage with metadata and identifier state so future commands can allocate stable IDs within the current repo.

## Acceptance criteria

This task is complete when:

- Repository helpers exist for opening the database and performing minimal state operations cleanly.
- Stable IDs can be generated locally in the form `BUILD-001`, `TASK-001` and `RUN-001`.
- ID generation is deterministic and does not collide when reusing an initialized repo.
- The implementation is small and ready for later lifecycle command work.

## Validation

Run or verify:

- `pnpm build`
- `pnpm typecheck`
- Manual or automated verification that repeated ID allocation produces sequential IDs
- Manual check that generated IDs remain repo-local

## Risks

- ID allocation design may not handle future concurrency requirements.
- Overabstracting the repository layer this early could slow later changes.
- Metadata placement may need adjustment as more lifecycle commands are added.

## Agent instructions

Work only within this task scope.

Do not expand into other tasks from the parent Build.

Keep the repository layer thin and practical. Favor direct SQL and a few focused functions over generic abstractions. Build only what BUILD-002 needs to unblock later commands.

If you find that the task is too broad, blocked or unsafe, stop and explain the issue before making unrelated changes.

## Expected evidence

At the end, provide:

- Repository helper summary
- ID generation examples
- Files changed
- Validation results
- Remaining risks
- Suggested commit message

## Checkpoint log

### Checkpoint 001

Implemented on 2026-06-08.

What changed:

- Added `src/repository.ts` with a thin data-access layer over `better-sqlite3`.
- Added `openRepository(databasePath)` factory that returns a `Repository` object.
- Added `Repository.getNextId(type)` for stable sequential ID generation (`BUILD-001`, `TASK-001`, `RUN-001`).
- Added `Repository.getMetadata(key)` and `Repository.setMetadata(key, value)` for metadata access.
- ID counters stored in `metadata` table as `next_build_number`, `next_task_number`, `next_run_number`.
- ID generation is atomic using a database transaction.
- Added smoke tests for sequential ID generation and repo-local ID isolation.

Files touched:

- `src/repository.ts` (new)
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-006-add-repository-helpers-and-stable-id-generation.md`

Decisions made:

- Keep the repository layer minimal — only `openRepository`, `getNextId`, `getMetadata`, `setMetadata`.
- Store ID counters in the existing `metadata` table rather than adding new tables.
- Use zero-padded 3-digit format for IDs (`BUILD-001` not `BUILD-1`).
- ID generation uses a transaction to ensure atomicity.

Validation performed:

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (13 checks including sequential and repo-local ID generation).

Pending work:

- Review and close TASK-006 after the user is satisfied with the repository implementation.

### Checkpoint 002

Implemented on 2026-06-08 after review findings.

What changed:

- Hardened ID generation so malformed metadata counters fall back to a safe numeric counter instead of producing IDs like `BUILD-NaN`.
- Reconciled ID generation with existing lifecycle rows in `builds`, `tasks` and `runs` so stale or missing counters do not collide with existing IDs.
- Added smoke regression coverage for malformed counter recovery.
- Added smoke regression coverage for stale counter collision avoidance.

Files touched:

- `src/repository.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-006-add-repository-helpers-and-stable-id-generation.md`

Validation performed:

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (15 checks including malformed and stale counter regressions).

Pending work:

- None for TASK-006.

## Review

Reviewed on 2026-06-08.

Acceptance criteria check:

- [x] Repository helpers exist for opening the database and performing minimal state operations cleanly.
- [x] Stable IDs can be generated locally in the form `BUILD-001`, `TASK-001` and `RUN-001`.
- [x] ID generation is deterministic and does not collide when reusing an initialized repo.
- [x] The implementation is small and ready for later lifecycle command work.

Scope check:

- Passed. The work stayed within thin repository, stable ID generation and validation scope.
- No `nerv new task`, `nerv new build` or `nerv start` commands were implemented.
- No rich search, filtering or listing queries were added.
- No ORM or migration framework was introduced.

Validation check:

Commands performed:

```bash
pnpm build
pnpm typecheck
pnpm smoke
```

Results:

- Build: passed.
- Typecheck: passed.
- Smoke: passed (15 checks including sequential, repo-local, malformed-counter recovery and stale-counter collision avoidance).

Additional checks performed:

- Counter persistence across repository reopen: RUN-001, RUN-002 verified sequentially.
- Malformed metadata counter: falls back to safe numeric counter instead of producing invalid IDs.
- Stale or missing counter: reconciles with existing rows to avoid collisions.

Risks:

- ID allocation is transaction-safe within SQLite for the current local-first MVP scope. High-concurrency multi-process allocation is not deeply tested but is acceptable for the current task scope.

Evidence:

- `src/repository.ts` provides `openRepository`, `getNextId`, `getMetadata` and `setMetadata`.
- ID generation uses `Math.max(metadataCounter, existingCounter)` to reconcile stale counters with existing rows.
- `parseCounter` validates and defaults malformed counter values to 1.
- Smoke includes two regression checks for malformed and stale counter handling.

Review result:

- Ready to close. No remaining changes required for TASK-006.

Suggested commit message:

```txt
TASK-006 Add repository helpers and stable ID generation
```

## Close summary

Closed on 2026-06-08.

Commit:

```txt
1c10204 TASK-006 Add repository helpers and stable ID generation
```

Final summary:

- Added `src/repository.ts` with a thin data-access layer over `better-sqlite3`.
- Added `openRepository(databasePath)` factory that returns a `Repository` object with `close`, `getNextId`, `getMetadata` and `setMetadata`.
- Implemented stable sequential ID generation for `BUILD-###`, `TASK-###` and `RUN-###` using zero-padded 3-digit format.
- ID counters stored in `metadata` table as `next_build_number`, `next_task_number`, `next_run_number`.
- Hardened ID generation so malformed metadata counters fall back to a safe numeric counter instead of producing invalid IDs.
- Reconciled ID generation with existing `builds`, `tasks` and `runs` rows so stale or missing counters do not collide with existing records.
- Added smoke coverage for sequential ID generation, repo-local ID isolation, malformed counter recovery and stale counter collision avoidance.

User or developer value delivered:

- Developers can now allocate stable, sequential IDs for builds, tasks and runs without collision risk.
- The repository layer is thin and practical, ready for later lifecycle command work.

Files changed:

- `src/repository.ts` (new)
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-006-add-repository-helpers-and-stable-id-generation.md`
- `agent-workspace/builds/BUILD-002-local-workspace-and-sqlite-state.md`

Validation evidence:

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (15 checks).

Related Build update:

- BUILD-002 has all three tasks (TASK-004, TASK-005, TASK-006) closed.
- BUILD-002 is ready for Build-level review and close.

Follow-up tasks:

- Review and close BUILD-002.
