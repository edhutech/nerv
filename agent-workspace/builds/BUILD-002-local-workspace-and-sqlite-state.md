# BUILD-002: Local Workspace And SQLite State

## Status

Closed

## Build Goal

Implement `nerv init` and the local `.nerv/` state foundation.

## Why this Build matters for the Nerv MVP

Nerv is local-first, and SQLite is the source of truth. The workspace and database must exist before tasks, runs, reviews and close can work.

## User value

Developers can initialize Nerv inside a repo and get durable local state without depending on cloud services.

## Product area

Local database

## Scope

This Build includes:

- Create the `.nerv/` directory structure.
- Create `.nerv/nerv.db`.
- Add the initial SQLite schema for builds, tasks, runs, checkpoints, reviews, decisions, status history and metadata.
- Add a small repository/data-access layer using `better-sqlite3`.
- Add stable ID generation such as `BUILD-001`, `TASK-001` and `RUN-001`.

## Out of scope

This Build does not include:

- Full lifecycle command implementation.
- Advanced migration tooling.
- ORM usage.
- Agent-facing `run.md` generation.

## Expected output

By the end of this Build, the repo should have:

- Working `nerv init`.
- `.nerv/nerv.db` created in initialized repos.
- `.nerv/product/`.
- `.nerv/repo/`.
- `.nerv/agent/runs/`.
- `.nerv/agent/builds/`.
- Initial database schema and repository helpers.

## Related MVP commands

- `nerv init`
- `nerv status`

## Suggested Agentic Tasks

Do not complete this section until the Build is approved.

- TASK-004: Add Workspace Detection, `nerv init`, And `nerv status`
- TASK-005: Add SQLite Bootstrap Schema And Database Initialization
- TASK-006: Add Repository Helpers And Stable ID Generation

## Progress

- TASK-004: Closed on 2026-06-08.
- TASK-005: Closed on 2026-06-08.
- TASK-006: Closed on 2026-06-08.

## Acceptance criteria

The Build is complete when:

- `nerv init` is idempotent.
- Database state is created only inside the current repo.
- `nerv status` can report initialized or not initialized state.
- The schema supports later MVP lifecycle records.

## Validation

The Build should be validated by:

- `pnpm build`
- `pnpm test` if a test script exists.
- Manual initialization in a temporary repo path.
- Manual inspection that `.nerv/` and `.nerv/nerv.db` are created correctly.

## Risks

- Schema may need adjustment as lifecycle commands become concrete.
- File writes must avoid overwriting user docs unexpectedly.
- Database initialization must stay safe and local.

## Dependencies

- BUILD-001: Project And CLI Foundation.

## Review

Reviewed on 2026-06-08.

Acceptance criteria check:

- [x] `nerv init` is idempotent.
- [x] Database state is created only inside the current repo.
- [x] `nerv status` can report initialized or not initialized state.
- [x] The schema supports later MVP lifecycle records.

Scope check:

- Passed. All three tasks stayed within their approved scope.
- No full lifecycle commands were added.
- No migration framework was introduced.
- No ORM was adopted.

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
- Smoke: passed (15 checks covering init, status, schema, and ID generation).

Manual validation performed:

- Created a temporary repo, ran `nerv init`, confirmed idempotent rerun.
- Verified `nerv status` reports `initialized` after init.
- Verified schema tables exist: builds, checkpoints, decisions, metadata, reviews, runs, status_history, tasks.
- Verified malformed schema rejection: `nerv status` → `not initialized`, `nerv init` → clear error.

Risks:

- `better-sqlite3` requires native build availability. `pnpm.onlyBuiltDependencies` is configured.
- Schema may need adjustment as lifecycle commands become concrete.

Evidence:

- `src/workspace.ts`: repo root detection and idempotent workspace creation.
- `src/database.ts`: explicit schema with `CREATE TABLE IF NOT EXISTS` and column validation.
- `src/repository.ts`: atomic ID generation with `Math.max` reconciliation.
- `scripts/smoke-cli.mjs`: 15 smoke checks including regressions for malformed schema and stale counters.

Review result:

- Ready to close. All tasks verified, all acceptance criteria met.

## Close summary

Closed on 2026-06-08.

Commits:

```txt
11e2296 TASK-004 Add workspace detection, init, and status
2d28223 TASK-005 Add SQLite bootstrap schema and database initialization
1c10204 TASK-006 Add repository helpers and stable ID generation
1b8453e workflow: link commits in TASK-004 and TASK-005 close records
```

Final summary:

- Implemented `nerv init` with idempotent workspace creation scoped to the current Git repo.
- Implemented `nerv status` reporting initialized or not initialized state.
- Created `.nerv/` directory structure: `.nerv/product/`, `.nerv/repo/`, `.nerv/agent/runs/`, `.nerv/agent/builds/`.
- Created `.nerv/nerv.db` with explicit SQLite schema for builds, tasks, runs, checkpoints, reviews, decisions, status_history and metadata.
- Added `src/repository.ts` with atomic ID generation producing zero-padded IDs (`BUILD-001`, `TASK-001`, `RUN-001`).
- Added column-level schema validation so malformed existing databases are rejected with clear errors.
- Reconciled metadata counters with existing rows using `Math.max` to avoid collisions from stale counters.
- Expanded smoke validation to 15 checks covering init, status, schema, and ID generation regressions.

User or developer value delivered:

- Developers can initialize Nerv inside any Git repo and get durable local state immediately.
- Developers can check whether a repo already has Nerv local state with `nerv status`.
- ID generation is stable and collision-resistant even when metadata counters are stale.

Files changed:

- `src/workspace.ts`
- `src/database.ts`
- `src/repository.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `package.json`
- `pnpm-lock.yaml`
- `README.md`
- `agent-workspace/tasks/TASK-004-add-workspace-detection-nerv-init-and-nerv-status.md`
- `agent-workspace/tasks/TASK-005-add-sqlite-bootstrap-schema-and-database-initialization.md`
- `agent-workspace/tasks/TASK-006-add-repository-helpers-and-stable-id-generation.md`
- `agent-workspace/builds/BUILD-002-local-workspace-and-sqlite-state.md`

Validation evidence:

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (15 checks).
- Manual init idempotency: passed.
- Manual schema table inspection: passed (8 tables present).
- Malformed schema regression: `status` → `not initialized`, `init` → clear error.

## Notes

Keep schema and repository code simple. Avoid building a large migration framework before the MVP proves the lifecycle.
