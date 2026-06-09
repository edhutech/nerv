# TASK-021: Update Build Progress And Product Evolution On Close

## Status

Closed

## Parent Build

BUILD-007

## Task Goal

Extend close behavior so completed Tasks update related Build progress and product evolution memory.

## Why this task matters

Nerv should preserve product memory as work is completed. Closing a Task should leave enough context for future agents and developers to understand what changed.

## Context

TASK-020 should implement the core close transition. This task builds on that behavior by updating related Build progress and product evolution after a Task closes.

## Scope

This task includes:

- Update related Build progress when a Build-linked Task closes.
- Mark a Build closed when all related Tasks are closed, if that behavior is safe and clear.
- Append meaningful completed-work entries to `.nerv/product/evolution.md` or the equivalent product evolution memory.
- Include Task, Run, Build, review, and commit context where available.
- Preserve existing product docs and avoid rewriting user-authored content unnecessarily.
- Add smoke coverage for Build progress and product evolution updates.

## Out of scope

This task does not include:

- Running Git commands that mutate repository state.
- Automatic Git commits.
- Full changelog generation.
- Cleanup behavior.
- Reworking the review command.

## Files to inspect

The agent should inspect these files before making changes:

- `src/index.ts`
- `src/repository.ts`
- `src/product.ts`
- `src/workspace.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/product/architecture.md`
- `agent-workspace/product/mvp.md`

## Files likely to change

The agent may need to change:

- `src/index.ts`
- `src/repository.ts`
- `src/product.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-021-update-build-progress-and-product-evolution-on-close.md`

## Data or state affected

This task affects Build status in `.nerv/nerv.db` and appends local product evolution Markdown under `.nerv/product/`.

## Acceptance criteria

This task is complete when:

- Closing a Build-linked Task updates related Build progress or status clearly.
- A meaningful product evolution entry is written after close.
- Existing product docs and database state are preserved.
- Re-running close does not duplicate evolution entries unexpectedly.
- Smoke coverage verifies Build progress and evolution behavior.

## Validation

Run or verify:

- `pnpm build`
- `pnpm typecheck`
- `pnpm smoke`

## Risks

- Evolution entries can become noisy if they copy too much implementation detail.
- Build closure rules can be surprising if partial Builds are closed too aggressively.
- Appending Markdown must not corrupt user-maintained product context.

## Agent instructions

Assume TASK-020 close behavior exists. Keep this task focused on post-close Build and product memory updates.

## Active work instructions

Use this Task file as the active execution record.

Do not create a manual Run file. Record progress in the checkpoint log below, then record review and close evidence in this same Task file.

## Expected evidence

At the end, provide:

- Example product evolution entry
- Build progress/status behavior
- Files changed
- Validation results
- Remaining risks
- Suggested commit message

## Commit checklist

Before committing:

- Review `git status --short`.
- Review `git diff`.
- Review recent commits with `git log --oneline -5`.
- Run required validation or explain why it could not run.
- Stage only files related to this Task.
- Use the commit message format from `agent-workspace/method/commit-system.md`.
- Record the implementation commit hash in a separate metadata commit if needed.

## Checkpoint log

### Checkpoint 001

Implemented on 2026-06-09.

**What changed:**

- Added `getBuildClosedTaskCount` and `getBuildOpenTaskCount` repository helpers
- Added `appendProductEvolution` function to product.ts for writing evolution entries
- Updated `nerv close` to update Build progress when Tasks close
- Auto-close Build when all Tasks are closed
- Append product evolution entries with Task, Run, Build, and commit context
- Added smoke tests for Build progress and evolution updates

**Files touched:**

- `src/repository.ts`
- `src/product.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`

**Validation performed:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (108 tests).

**Pending work:**

- Review and close TASK-021.

**Suggested commit message:**

```txt
TASK-021 Update build progress and product evolution on close

- Add Build progress tracking when Tasks close
- Auto-close Build when all Tasks are closed
- Append product evolution entries on close
- Add repository helpers for Build task counts
- Add smoke tests for Build close and evolution updates
```

## Review

Reviewed on 2026-06-09.

**Status:** Approved

**Acceptance criteria verification:**

- ✓ Closing a Build-linked Task updates related Build progress or status clearly
- ✓ A meaningful product evolution entry is written after close
- ✓ Existing product docs and database state are preserved
- ✓ Re-running close does not duplicate evolution entries unexpectedly
- ✓ Smoke coverage verifies Build progress and evolution behavior

**Implementation quality:**

- Clean separation of concerns with repository helpers
- Product evolution appends rather than overwrites
- Build auto-close only triggers when all tasks are closed
- Smoke tests cover progress updates and auto-close scenarios

**Residual risks:**

- None identified for this task scope.

## Close summary

Closed on 2026-06-09.

**Commit status:**

Committed as bf0a2d4.

**Final summary:**

TASK-021 extended the close behavior to update Build progress and product evolution memory. When a Task closes, the related Build shows progress. When all Tasks in a Build close, the Build is automatically marked closed. Product evolution entries are appended with Task, Run, Build, and commit context.

**User or developer value delivered:**

Developers now have automatic Build progress tracking and product evolution records as work is completed, preserving product memory for future agents and developers.

**Files changed:**

- `src/repository.ts`
- `src/product.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-021-update-build-progress-and-product-evolution-on-close.md`

**Validation evidence:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (108 tests).
