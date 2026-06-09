# RUN-013

## Status

Complete

## Active Task

TASK-013: Add Work Item Query Commands

## Parent Build

BUILD-004

## Primary context

Read first:

- `../tasks/TASK-013-add-work-item-query-commands.md`

## Supporting context

Read only if needed:

- `../product/architecture.md`
- `../product/stack.md`
- `../builds/BUILD-004-agentic-builds-and-tasks.md`

## Scope rule

The Agentic Task is the execution scope. The Agentic Build provides shared context, but it does not expand the scope of this Run.

## What to do now

Implement `nerv tasks [query]` and `nerv builds [query]` commands with:

- List all tasks/builds when no query provided
- Search by exact ID (e.g., TASK-001)
- Search by case-insensitive text match on title or intent
- Show task status, title, and parent build
- Show build status, title, and task count
- Handle empty results clearly

## Files to inspect first

- `src/index.ts`
- `src/repository.ts`
- `scripts/smoke-cli.mjs`

## Validation plan

- Run `pnpm build`.
- Run `pnpm typecheck`.
- Run `pnpm smoke`.
- Verify task and build queries in temporary repo.

## Do not do

- Do not implement `nerv start`, run generation or advanced search.
- Do not add interactive selection UI.
- Do not add status transitions or lifecycle behavior.

## Completion checklist

Before finishing this Run, provide:

- What changed
- Files touched
- Decisions made
- Validation performed
- Pending work
- Suggested next step
- Suggested commit message
