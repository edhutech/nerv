# RUN-011

## Status

Closed

## Active Task

TASK-011: Implement Agentic Task Creation

## Parent Build

BUILD-004

## Primary context

Read first:

- `../tasks/TASK-011-implement-agentic-task-creation.md`

## Supporting context

Read only if needed:

- `../product/architecture.md`
- `../product/stack.md`
- `../builds/BUILD-004-agentic-builds-and-tasks.md`

## Scope rule

The Agentic Task is the execution scope. The Agentic Build provides shared context, but it does not expand the scope of this Run.

## What to do now

Implement `nerv new task "..."` command with:
- Stable TASK-### ID generation
- Task title derived from intent
- Planning sections stored in SQLite
- Basic task Markdown generation
- Large-intent detection heuristic
- Confirmation flow for Build-sized work

## Files to inspect first

- `src/index.ts`
- `src/repository.ts`
- `src/workspace.ts`
- `scripts/smoke-cli.mjs`

## Validation plan

- Run `pnpm build`.
- Run `pnpm typecheck`.
- Run `pnpm smoke`.
- Verify task creation in temporary repo.
- Verify large-intent detection and confirmation flow.

## Do not do

- Do not implement `nerv new build` or `nerv build plan`.
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
