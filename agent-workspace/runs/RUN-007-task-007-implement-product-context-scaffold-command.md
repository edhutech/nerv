# RUN-007

## Status

Complete

## Active Task

TASK-007: Implement Product Context Scaffold Command

## Parent Build

BUILD-003

## Primary context

Read first:

- `../tasks/TASK-007-implement-product-context-scaffold-command.md`

## Supporting context

Read only if needed:

- `../product/mvp.md`
- `../product/architecture.md`
- `../product/stack.md`
- `../builds/BUILD-003-product-and-repo-context-flow.md`

## Scope rule

The Agentic Task is the execution scope. The Agentic Build provides shared context, but it does not expand the scope of this Run.

## What to do now

Implement `nerv product` to scaffold stable product context docs without overwriting existing user content.

## Files to inspect first

- `src/index.ts`
- `src/workspace.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/product/stack.md`

## Validation plan

- Run `pnpm build`.
- Run `pnpm typecheck`.
- Run `pnpm smoke`.
- Manually verify product scaffold and non-overwrite behavior.

## Do not do

- Do not add repo analysis.
- Do not add SQLite decision persistence.
- Do not generate run context files.

## Completion summary

Completed retrospectively on 2026-06-08.

What changed:

- Added `src/product.ts` with product context scaffolding.
- Implemented `nerv product` to create 9 stable product docs.
- Preserved existing files and added smoke coverage for exact content preservation.

Files touched:

- `src/product.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `README.md`
- `agent-workspace/tasks/TASK-007-implement-product-context-scaffold-command.md`
- `agent-workspace/builds/BUILD-003-product-and-repo-context-flow.md`
- `agent-workspace/runs/RUN-007-task-007-implement-product-context-scaffold-command.md`

Decisions made:

- Use predictable non-interactive scaffolding for the first product flow.
- Keep templates concise and human-editable.

Validation performed:

- `pnpm build`
- `pnpm typecheck`
- `pnpm smoke`
- Manual product scaffold and content preservation checks

Pending work:

- None for RUN-007.

Commit:

```txt
ba5803e TASK-007 Implement product context scaffold command
```
