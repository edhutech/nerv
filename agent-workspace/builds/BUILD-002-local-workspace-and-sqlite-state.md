# BUILD-002: Local Workspace And SQLite State

## Status

Approved

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

## Notes

Keep schema and repository code simple. Avoid building a large migration framework before the MVP proves the lifecycle.
