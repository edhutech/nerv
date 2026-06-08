# RUN-006

## Status

Complete

## Active Task

TASK-006: Add Repository Helpers And Stable ID Generation

## Parent Build

BUILD-002

## Primary context

Read first:

- `../tasks/TASK-006-add-repository-helpers-and-stable-id-generation.md`

## Supporting context

Read only if needed:

- `../product/architecture.md`
- `../product/stack.md`
- `../builds/BUILD-002-local-workspace-and-sqlite-state.md`

## Scope rule

The Agentic Task is the execution scope. The Agentic Build provides shared context, but it does not expand the scope of this Run.

## What to do now

Add a thin SQLite repository helper and stable local ID generation for builds, tasks and runs.

## Files to inspect first

- `src/database.ts`
- `src/workspace.ts`
- `scripts/smoke-cli.mjs`

## Validation plan

- Run `pnpm build`.
- Run `pnpm typecheck`.
- Run `pnpm smoke`.
- Verify sequential, repo-local and stale-counter ID behavior.

## Do not do

- Do not implement lifecycle command creation.
- Do not overabstract the repository layer.

## Completion summary

Completed retrospectively on 2026-06-08.

What changed:

- Added `src/repository.ts` with `openRepository`, `getNextId`, `getMetadata` and `setMetadata`.
- Implemented zero-padded stable IDs for `BUILD-###`, `TASK-###` and `RUN-###`.
- Stored counters in the metadata table.
- Hardened ID generation against malformed and stale counters.

Files touched:

- `src/repository.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-006-add-repository-helpers-and-stable-id-generation.md`
- `agent-workspace/builds/BUILD-002-local-workspace-and-sqlite-state.md`
- `agent-workspace/runs/RUN-006-task-006-add-repository-helpers-and-stable-id-generation.md`

Decisions made:

- Keep the repository layer minimal and direct.
- Reconcile metadata counters with existing rows to avoid ID collisions.

Validation performed:

- `pnpm build`
- `pnpm typecheck`
- `pnpm smoke`

Pending work:

- None for RUN-006.

Commit:

```txt
1c10204 TASK-006 Add repository helpers and stable ID generation
```
