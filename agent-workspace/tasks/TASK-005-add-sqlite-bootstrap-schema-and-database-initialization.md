# TASK-005: Add SQLite Bootstrap Schema And Database Initialization

## Status

Closed

## Parent Build

BUILD-002

## Task Goal

Create `.nerv/nerv.db` and initialize the first SQLite schema needed for builds, tasks, runs, checkpoints, reviews, decisions, status history and metadata.

## Why this task matters

SQLite is the Nerv source of truth. The workspace is incomplete until the database file and schema exist locally and can support later lifecycle commands.

## Context

The stack and architecture docs define SQLite as the local source of truth at `.nerv/nerv.db`. This task should add the database dependency, bootstrap the database file during initialization and define the minimum durable schema that unblocks later lifecycle commands without introducing an ORM or migration framework.

## Scope

This task includes:

- Add `better-sqlite3` and required TypeScript support for local SQLite access.
- Create a database bootstrap path tied to `.nerv/nerv.db`.
- Define and apply the initial schema for builds, tasks, runs, checkpoints, reviews, decisions, status history and metadata.
- Ensure schema creation is safe to rerun during `nerv init`.
- Keep schema bootstrapping simple without a migration framework.

## Out of scope

This task does not include:

- Full CRUD operations for every table.
- Query services for lifecycle commands beyond basic bootstrap checks.
- Advanced migrations, versioned migration runners or ORM adoption.

## Files to inspect

The agent should inspect these files before making changes:

- `package.json`
- `tsconfig.json`
- `src/index.ts`
- `agent-workspace/builds/BUILD-002-local-workspace-and-sqlite-state.md`
- `agent-workspace/product/architecture.md`
- `agent-workspace/product/stack.md`

## Files likely to change

The agent may need to change:

- `package.json`
- `pnpm-lock.yaml`
- New database bootstrap files under `src/`
- Possibly `src/index.ts`

## Data or state affected

Creates `.nerv/nerv.db` and the initial SQLite tables inside the current repo. This becomes the durable local source of truth for Nerv state.

## Acceptance criteria

This task is complete when:

- `nerv init` creates `.nerv/nerv.db` when missing.
- Re-running initialization does not corrupt or recreate existing tables unsafely.
- The schema includes the lifecycle tables named in BUILD-002.
- Database creation stays local to the current repo.

## Validation

Run or verify:

- `pnpm build`
- `pnpm typecheck`
- Manual initialization in a temporary repo and inspection of `.nerv/nerv.db`
- Manual schema inspection using a SQLite client or CLI

## Risks

- Early schema choices may constrain later lifecycle work.
- Native SQLite dependency setup may introduce install or build friction.
- Table design may omit fields needed by downstream builds.

## Agent instructions

Work only within this task scope.

Do not expand into other tasks from the parent Build.

Prefer a simple bootstrap implementation with explicit SQL. Design only the minimum columns needed to support later MVP records and status transitions. Do not build a migration framework.

If you find that the task is too broad, blocked or unsafe, stop and explain the issue before making unrelated changes.

## Expected evidence

At the end, provide:

- Schema summary
- Files changed
- Proof that `.nerv/nerv.db` is created
- Validation results
- Remaining risks
- Suggested commit message

## Checkpoint log

### Checkpoint 001

Implemented on 2026-06-08.

What changed:

- Added `better-sqlite3` as the local SQLite dependency and `@types/better-sqlite3` for TypeScript support.
- Added a small `src/database.ts` bootstrap module with explicit schema creation SQL.
- Updated workspace initialization to create `.nerv/nerv.db` by bootstrapping the schema instead of touching an empty file.
- Updated workspace status detection to require the expected schema tables, not only the database file.
- Expanded smoke validation to assert that the initialized database contains the required lifecycle tables.

Files touched:

- `package.json`
- `pnpm-lock.yaml`
- `src/database.ts`
- `src/workspace.ts`
- `scripts/smoke-cli.mjs`
- `README.md`
- `agent-workspace/tasks/TASK-005-add-sqlite-bootstrap-schema-and-database-initialization.md`

Decisions made:

- Keep schema bootstrap explicit with `CREATE TABLE IF NOT EXISTS` statements instead of introducing migrations.
- Use a small `metadata` table to store a `schema_version` entry for later evolution.
- Treat a workspace as initialized only when the required schema tables exist in `.nerv/nerv.db`.
- Add `pnpm.onlyBuiltDependencies` for `better-sqlite3` so future installs allow the native build dependency explicitly.

Validation performed:

- `pnpm install` passed.
- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed.
- Manual schema inspection in a temporary repo confirmed the required tables exist in `.nerv/nerv.db`.

Pending work:

- Review and close TASK-005 after the user is satisfied with the schema bootstrap implementation.

### Checkpoint 002

Implemented on 2026-06-08 after review findings.

What changed:

- Tightened schema validation so `.nerv/nerv.db` must contain the required tables and required columns.
- Changed `nerv status` behavior indirectly so malformed existing databases report `not initialized` instead of `initialized`.
- Changed `nerv init` error handling so malformed existing schemas fail with a clear Nerv error instead of an internal SQLite stack trace.
- Added smoke coverage for malformed existing schemas.
- Made the `schema_version` metadata insert idempotent by using `INSERT OR IGNORE` so repeated `nerv init` does not update metadata timestamps.

Files touched:

- `src/database.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-005-add-sqlite-bootstrap-schema-and-database-initialization.md`

Validation performed:

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed.
- Targeted malformed-schema check now reports `not initialized` for `status` and a clear failure message for `init`.
- Targeted repeated-init metadata check confirmed `metadata.updated_at` remains unchanged on rerun.

Pending work:

- None for TASK-005.

## Review

Reviewed on 2026-06-08.

Acceptance criteria check:

- [x] `nerv init` creates `.nerv/nerv.db` when missing.
- [x] Re-running initialization does not corrupt or recreate existing tables unsafely.
- [x] The schema includes the lifecycle tables named in BUILD-002.
- [x] Database creation stays local to the current repo.

Scope check:

- Passed. The work stayed within SQLite bootstrap, schema definition and workspace integration scope.
- No full CRUD operations were added.
- No query services beyond schema validation were added.
- No migrations or ORM was introduced.

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
- Smoke: passed (11 checks including malformed-schema regressions).

Schema regression performed:

- Created a malformed `.nerv/nerv.db` with correct table names but wrong columns.
- `nerv status` correctly reported `not initialized`.
- `nerv init` correctly failed with: `nerv init failed: existing .nerv/nerv.db does not match the expected Nerv schema`.

Idempotency check:

- `nerv init` run twice in a row; `metadata.updated_at` remained unchanged.

Risks:

- `better-sqlite3` requires native build availability in the environment. `pnpm.onlyBuiltDependencies` is configured to allow it, but fresh environments may need manual build steps.
- `scripts/smoke-cli.mjs` helper `verifySchema` only checks table names, not columns. The malformed-schema regression covers the important user-facing path.

Evidence:

- `src/database.ts` defines explicit schema with `CREATE TABLE IF NOT EXISTS` and validates both tables and required columns before proceeding.
- `src/index.ts` wraps `ensureWorkspace` in a try/catch that surfaces schema incompatibility as a clear user-facing error.
- `scripts/smoke-cli.mjs` includes two new regression checks for malformed schema handling.

Review result:

- Ready to close. No remaining changes required for TASK-005.

Suggested commit message:

```txt
TASK-005 Add SQLite bootstrap schema and database initialization
```

## Close summary

Closed on 2026-06-08.

Commit:

```txt
No commit linked yet.
```

Final summary:

- Added `better-sqlite3` as the local SQLite dependency with TypeScript types.
- Added `src/database.ts` with explicit `CREATE TABLE IF NOT EXISTS` schema for builds, tasks, runs, checkpoints, reviews, decisions, status_history and metadata.
- Added `schema_version` metadata entry using `INSERT OR IGNORE` so repeated `nerv init` does not mutate existing state.
- Tightened schema validation to check both table names and required columns, so malformed existing databases are not treated as initialized.
- Added error handling so `nerv init` surfaces schema incompatibility clearly instead of leaking an internal SQLite stack trace.
- Expanded smoke validation to cover malformed-schema rejection and initialized status reporting.

User or developer value delivered:

- `.nerv/nerv.db` is now a real SQLite database with a proper schema, not an empty placeholder file.
- Developers can trust `nerv init` and `nerv status` to handle malformed existing databases gracefully.

Files changed:

- `package.json`
- `pnpm-lock.yaml`
- `src/database.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `README.md`
- `agent-workspace/tasks/TASK-005-add-sqlite-bootstrap-schema-and-database-initialization.md`
- `agent-workspace/builds/BUILD-002-local-workspace-and-sqlite-state.md`

Validation evidence:

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (11 checks).
- Malformed schema regression: `status` → `not initialized`, `init` → clear error.
- Idempotency regression: `metadata.updated_at` unchanged on rerun.

Related Build update:

- BUILD-002 has TASK-004 and TASK-005 closed.
- BUILD-002 remains in progress pending TASK-006.

Follow-up tasks:

- Start TASK-006: Add Repository Helpers And Stable ID Generation.
