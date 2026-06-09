# RUN-016

## Status

Closed

## Active Task

TASK-016: Implement nerv current And nerv runs

## Parent Build

BUILD-005

## Primary context

Read first:

- `../tasks/TASK-016-implement-nerv-current-and-runs.md`

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

Implement `nerv current` and `nerv runs` commands.

## Files to inspect first

- `src/index.ts`
- `src/repository.ts`
- `src/run.ts`
- `scripts/smoke-cli.mjs`

## Validation plan

- Run `pnpm build`.
- Run `pnpm typecheck`.
- Run `pnpm smoke`.
- Manual verification after starting a Run.

## Do not do

- Do not implement checkpoint, review or close lifecycle behavior.
- Do not add filtering beyond basic listing.
- Do not modify existing run generation logic.

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

- Implemented `nerv current` to show the active Run with task details and run file path.
- Implemented `nerv runs` to list all Runs with task details.
- Added graceful handling for stale metadata and missing task references.
- Added smoke coverage for empty states, active run, multiple runs, and stale metadata.

**Validation performed:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (77 tests).

**Pending work:**

- Review and close TASK-016.

**Suggested commit message:**

```txt
TASK-016 Implement nerv current and nerv runs

- Replace nerv current placeholder with active run discovery
- Replace nerv runs placeholder with run listing
- Handle stale current_run_id and missing task references gracefully
- Add smoke coverage for current and runs commands
```

## Review

Reviewed on 2026-06-09. No blocking or behavioral findings found.

## Close summary

Closed on 2026-06-09.

**Commit status:** Closed and committed as 077cd83.

**Final summary:** TASK-016 implemented `nerv current` and `nerv runs` commands with graceful handling of edge cases and smoke coverage.

**Build update:** BUILD-005 is complete with all three tasks closed.

**Product evolution:** Updated `agent-workspace/evolution/product-evolution.md` with TASK-016 progress.
