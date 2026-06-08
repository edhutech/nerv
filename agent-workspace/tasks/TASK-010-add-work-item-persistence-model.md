# TASK-010: Add Work Item Persistence Model

## Status

Closed

## Parent Build

BUILD-004

## Task Goal

Expand Nerv's local SQLite and repository layer so Agentic Builds and Agentic Tasks can store practical planning fields, relationships and generated Markdown paths.

## Why this task matters

BUILD-004 depends on structured work state. The CLI can only create, plan and query useful work items if tasks and builds store scope, acceptance criteria, validation expectations, risks and relationships in `.nerv/nerv.db`.

## Context

BUILD-002 created the initial SQLite schema with minimal `builds` and `tasks` tables. BUILD-003 added repository helpers and context metadata. BUILD-004 should keep SQLite as the source of truth while allowing generated Markdown to act as a readable agent-facing artifact.

## Scope

This task includes:

- Add the minimal schema fields needed for Agentic Build and Agentic Task planning details.
- Add repository types and helpers for creating, reading and listing builds and tasks.
- Store task-to-build relationships using the existing `tasks.build_id` relationship unless a clear need for an additional relationship table appears.
- Store structured planning text for scope, out-of-scope, acceptance criteria, validation and risks in a simple MVP-safe format.
- Track generated Markdown paths where useful for later run generation.
- Add smoke coverage for persistence helpers and schema validation.

## Out of scope

This task does not include:

- Implementing `nerv new task`, `nerv new build`, `nerv build plan`, `nerv tasks` or `nerv builds` command behavior.
- Automatic AI planning.
- Run generation or `.nerv/agent/runs/` file generation.
- Complex migrations or an ORM.
- Rich Markdown parsing.

## Files to inspect

The agent should inspect these files before making changes:

- `src/database.ts`
- `src/repository.ts`
- `src/workspace.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/builds/BUILD-004-agentic-builds-and-tasks.md`
- `agent-workspace/product/architecture.md`
- `agent-workspace/product/development.md`

## Files likely to change

The agent may need to change:

- `src/database.ts`
- `src/repository.ts`
- New work-item support module under `src/` if useful
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-010-add-work-item-persistence-model.md`

## Data or state affected

Updates `.nerv/nerv.db` schema expectations for `builds` and `tasks`. May add new columns to store intent, summary, planning sections and generated Markdown paths. Existing initialized workspaces with the older MVP schema are a sensitive area; handle schema initialization explicitly and report limitations clearly.

## Acceptance criteria

This task is complete when:

- `builds` can store ID, title, status, intent, planning details and optional generated Markdown path.
- `tasks` can store ID, optional build ID, title, status, intent, scope, out-of-scope, acceptance criteria, validation, risks and optional generated Markdown path.
- Repository helpers can create and read builds and tasks without direct SQL in the CLI layer.
- Repository helpers can list builds and tasks in stable newest-or-ID order suitable for CLI output.
- Task-to-build relationships are persisted and queryable.
- Existing validation confirms the expected schema and persistence helpers work.

## Validation

Run or verify:

- `pnpm build`
- `pnpm typecheck`
- `pnpm smoke`
- Manual SQLite inspection in a temporary initialized repo if smoke coverage is not enough.

## Risks

- Expanding the schema without a migration framework can make existing local `.nerv/nerv.db` files appear malformed.
- Storing planning sections as overly structured JSON may add unnecessary complexity for the MVP.
- Too much generic abstraction could slow down command implementation.

## Agent instructions

Work only within this task scope.

Do not implement command behavior beyond what is required to exercise persistence in tests. Keep the schema small and practical. Prefer repository helpers with clear names over a generic data access layer.

If existing workspace compatibility requires a design decision, stop and explain the tradeoff before making broad migration changes.

## Expected evidence

At the end, provide:

- Schema field summary
- Repository helper summary
- Relationship persistence summary
- Files changed
- Validation results
- Remaining risks
- Suggested commit message

## Checkpoint log

### Checkpoint 001

Implemented on 2026-06-08.

What changed:

- Expanded `builds` table schema with columns: `intent`, `goal`, `user_value`, `scope`, `out_of_scope`, `acceptance_criteria`, `validation`, `risks`, `generated_markdown_path`.
- Expanded `tasks` table schema with columns: `intent`, `scope`, `out_of_scope`, `acceptance_criteria`, `validation`, `risks`, `generated_markdown_path`.
- Added `BuildRecord` and `TaskRecord` types in `src/repository.ts`.
- Added `CreateBuildInput` and `CreateTaskInput` types for creation helpers.
- Added repository helpers: `createBuild`, `getBuild`, `listBuilds`, `updateBuild`.
- Added repository helpers: `createTask`, `getTask`, `listTasks`, `listTasksByBuild`, `updateTask`.
- Added smoke tests for all new persistence helpers.

Files touched:

- `src/database.ts`
- `src/repository.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-010-add-work-item-persistence-model.md`
- `agent-workspace/runs/RUN-010-task-010-add-work-item-persistence-model.md`

Decisions made:

- Store planning sections as plain TEXT columns rather than JSON for MVP simplicity.
- Use existing `tasks.build_id` foreign key for task-to-build relationships.
- Default status for new builds and tasks is "proposed".
- List builds in descending ID order (newest first), list tasks by build in ascending ID order.

Validation performed:

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (38 checks including 10 new work item persistence checks).

Pending work:

- Review and close TASK-010 after the user is satisfied with the implementation.

### Checkpoint 002

Review fix implemented on 2026-06-08.

What changed:

- Added a narrow schema migration for existing schema-v1 databases.
- `status` and initialization schema checks now add missing nullable work-item columns before validating the schema.
- Updated `schema_version` to `2` after successful schema validation.
- Added smoke coverage for a valid old work-item schema being migrated by `nerv status`.
- Kept malformed schema handling intact.

Validation performed:

- `pnpm validate` passed.
- Manual check: `node dist/index.js status` now reports this repo as initialized after migrating the existing `.nerv/nerv.db`.

## Review

Reviewed on 2026-06-08.

Findings addressed:

- Existing valid `.nerv/nerv.db` files with the pre-TASK-010 schema were treated as malformed because the new nullable columns were required but not migrated.
- TASK-010 was marked `Closed` before review completed.

Fix summary:

- Added schema migration for the new `builds` and `tasks` planning columns.
- Added smoke coverage for old-schema migration.
- Changed task status to `In Review` until close is explicitly performed.

Review result:

- Ready to close. No remaining review findings.

## Close summary

Closed on 2026-06-08.

Schema field summary:

- `builds`: added `intent`, `goal`, `user_value`, `scope`, `out_of_scope`, `acceptance_criteria`, `validation`, `risks`, `generated_markdown_path`.
- `tasks`: added `intent`, `scope`, `out_of_scope`, `acceptance_criteria`, `validation`, `risks`, `generated_markdown_path`.
- `schema_version` updated from `1` to `2`.

Repository helper summary:

- `createBuild`, `getBuild`, `listBuilds`, `updateBuild`.
- `createTask`, `getTask`, `listTasks`, `listTasksByBuild`, `updateTask`.
- `BuildRecord`, `TaskRecord`, `CreateBuildInput`, `CreateTaskInput` types exported.

Relationship persistence summary:

- Task-to-build relationship uses existing `tasks.build_id` foreign key.
- `listTasksByBuild(buildId)` returns all tasks linked to a build in ascending ID order.
- `listBuilds()` returns all builds in descending ID order.

Files changed:

- `src/database.ts`
- `src/repository.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-010-add-work-item-persistence-model.md`
- `agent-workspace/runs/RUN-010-task-010-add-work-item-persistence-model.md`
- `agent-workspace/builds/BUILD-004-agentic-builds-and-tasks.md`

Validation evidence:

- `pnpm validate` passed.
- Smoke: 39 checks including old-schema migration and work-item persistence helpers.
- Manual: `node dist/index.js status` reports this repo as initialized after in-place schema migration.

Review findings resolved:

- Schema migration for old `.nerv/nerv.db` files prevents regression.
- TASK-010 was properly closed only after review completed.
