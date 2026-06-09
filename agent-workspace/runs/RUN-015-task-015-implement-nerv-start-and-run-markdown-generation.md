# RUN-015

## Status

Closed

## Active Task

TASK-015: Implement nerv start And Run Markdown Generation

## Parent Build

BUILD-005

## Primary context

Read first:

- `../tasks/TASK-015-implement-nerv-start-and-run-markdown-generation.md`

## Supporting context

Read only if needed:

- `../builds/BUILD-005-run-generation-and-agent-entrypoint.md`
- `../product/architecture.md`
- `../product/stack.md`
- `../product/development.md`
- `../product/decisions.md`

## Scope rule

The Agentic Task is the execution scope. The Agentic Build provides shared context, but it does not expand the scope of this Run.

## What to do now

Implement `nerv start <query>` and focused `run.md` generation.

## Files to inspect first

- `src/index.ts`
- `src/task.ts`
- `src/build.ts`
- `src/context.ts`
- `src/repo-context.ts`
- `agent-workspace/method/run-template.md`

## Validation plan

- Run `pnpm build`.
- Run `pnpm typecheck`.
- Run `pnpm smoke`.
- Manual temp repo flow with `nerv init`, `nerv new task`, `nerv start TASK-001` and inspection of generated `run.md`.

## Do not do

- Do not run the coding agent.
- Do not implement checkpoint, review or close implementation.
- Do not implement automatic Git operations.
- Do not implement interactive selection UI.

## Completion checklist

Before finishing this Run, provide:

- What changed
- Files touched
- Decisions made
- Validation performed
- Pending work
- Suggested next step
- Suggested commit message

## Checkpoint 001

Implemented on 2026-06-09.

**What changed:**

- Added `src/run.ts` with `startRun()` for Run creation and generated Markdown.
- Replaced the `nerv start` placeholder in `src/index.ts`.
- Generated focused `run.md` and supporting `task.md` files under `.nerv/agent/runs/RUN-###/`.
- Fixed review feedback so `run.md` now points first to local `./task.md` and uses correct relative links for source task, build and product context.
- Added smoke coverage for `nerv start`, generated files, current Run metadata and generated context links.

**Validation performed:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed.

**Pending work:**

- Re-review and close TASK-015.

## Review

Reviewed on 2026-06-09. No blocking or behavioral findings found. Validation passed with `pnpm build`, `pnpm typecheck` and `pnpm smoke`.

## Close summary

Closed on 2026-06-09.

**Commit status:** Not committed.

**Final summary:** TASK-015 implemented `nerv start <query>` with focused `run.md` generation, local `task.md` as primary context, correct relative links for supporting context, and smoke coverage.

**Build update:** BUILD-005 has two closed tasks. TASK-016 remains pending.

**Product evolution:** Updated `agent-workspace/evolution/product-evolution.md` with TASK-015 progress.
