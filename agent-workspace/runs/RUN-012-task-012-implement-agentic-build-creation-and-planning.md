# RUN-012

## Status

Complete

## Active Task

TASK-012: Implement Agentic Build Creation And Planning

## Parent Build

BUILD-004

## Primary context

Read first:

- `../tasks/TASK-012-implement-agentic-build-creation-and-planning.md`

## Supporting context

Read only if needed:

- `../product/architecture.md`
- `../product/stack.md`
- `../builds/BUILD-004-agentic-builds-and-tasks.md`

## Scope rule

The Agentic Task is the execution scope. The Agentic Build provides shared context, but it does not expand the scope of this Run.

## What to do now

Implement `nerv new build "..."` and `nerv build plan BUILD-001` commands.

## Files to inspect first

- `src/index.ts`
- `src/repository.ts`
- `src/task.ts`
- `src/workspace.ts`
- `scripts/smoke-cli.mjs`

## Validation plan

- Run `pnpm build`.
- Run `pnpm typecheck`.
- Run `pnpm smoke`.
- Verify build creation and planning in temporary repo.

## Do not do

- Do not implement `nerv new task` or `nerv tasks`.
- Do not add run generation.
- Do not add AI planning or complex estimation.
- Do not add review, checkpoint or close lifecycle behavior.

## Completion checklist

Before finishing this Run, provide:

- What changed
- Files touched
- Decisions made
- Validation performed
- Pending work
- Suggested next step
- Suggested commit message
