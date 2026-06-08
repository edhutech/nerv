# RUN-010

## Status

Closed

## Active Task

TASK-010: Add Work Item Persistence Model

## Parent Build

BUILD-004

## Primary context

Read first:

- `../tasks/TASK-010-add-work-item-persistence-model.md`

## Supporting context

Read only if needed:

- `../product/architecture.md`
- `../product/stack.md`
- `../builds/BUILD-004-agentic-builds-and-tasks.md`

## Scope rule

The Agentic Task is the execution scope. The Agentic Build provides shared context, but it does not expand the scope of this Run.

## What to do now

Expand the SQLite schema and repository layer to support Agentic Builds and Agentic Tasks with practical planning fields.

## Files to inspect first

- `src/database.ts`
- `src/repository.ts`
- `src/workspace.ts`
- `scripts/smoke-cli.mjs`

## Validation plan

- Run `pnpm build`.
- Run `pnpm typecheck`.
- Run `pnpm smoke`.
- Verify schema fields and repository helpers work correctly.

## Do not do

- Do not implement `nerv new task`, `nerv new build`, `nerv build plan`, `nerv tasks` or `nerv builds` command behavior.
- Do not add run generation.
- Do not add complex migrations or an ORM.
- Do not add rich markdown parsing.

## Completion summary

Completed on 2026-06-08.

What changed:

- Expanded `builds` table schema with planning columns: `intent`, `goal`, `user_value`, `scope`, `out_of_scope`, `acceptance_criteria`, `validation`, `risks`, `generated_markdown_path`.
- Expanded `tasks` table schema with planning columns: `intent`, `scope`, `out_of_scope`, `acceptance_criteria`, `validation`, `risks`, `generated_markdown_path`.
- Added `BuildRecord` and `TaskRecord` types in `src/repository.ts`.
- Added `CreateBuildInput` and `CreateTaskInput` types for creation helpers.
- Added repository helpers: `createBuild`, `getBuild`, `listBuilds`, `updateBuild`.
- Added repository helpers: `createTask`, `getTask`, `listTasks`, `listTasksByBuild`, `updateTask`.
- Added 10 smoke tests for all new persistence helpers.

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

- None for RUN-010.

Suggested next step:

- Proceed with TASK-011: Implement Agentic Task Creation.

Suggested commit message:

```txt
TASK-010 Add work item persistence model
```
