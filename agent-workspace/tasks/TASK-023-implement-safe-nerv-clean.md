# TASK-023: Implement Safe nerv clean

## Status

Closed

## Parent Build

BUILD-007

## Task Goal

Implement conservative `nerv clean` behavior for generated or temporary Nerv artifacts without deleting user product docs or database state.

## Why this task matters

Developers need a safe way to remove regenerated agent-facing files. Cleanup must never risk product memory or durable work state.

## Context

Nerv stores durable state in SQLite and human-editable product context under `.nerv/product/`. Generated agent-facing files live under `.nerv/agent/` and can be regenerated from state or new Runs.

## Scope

This task includes:

- Implement `nerv clean` for safe generated Nerv artifacts.
- Preserve `.nerv/nerv.db`, `.nerv/product/*`, and `.nerv/repo/development.md`.
- Report which paths were cleaned or that nothing needed cleaning.
- Make clean idempotent.
- Handle uninitialized repos and missing generated directories gracefully.
- Add smoke coverage proving database and product docs are preserved.

## Out of scope

This task does not include:

- Deleting user product docs.
- Deleting SQLite state.
- Cleaning Git files.
- Cleaning files outside `.nerv/`.
- Closing Runs or Tasks.

## Files to inspect

The agent should inspect these files before making changes:

- `src/index.ts`
- `src/workspace.ts`
- `src/run.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/product/architecture.md`
- `agent-workspace/product/mvp.md`

## Files likely to change

The agent may need to change:

- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-023-implement-safe-nerv-clean.md`

## Data or state affected

This task affects generated files under `.nerv/agent/`. It must not alter `.nerv/nerv.db`, `.nerv/product/`, or durable work history.

## Acceptance criteria

This task is complete when:

- `nerv clean` removes only safe generated artifacts.
- Product docs remain after clean.
- `.nerv/nerv.db` remains after clean.
- `nerv clean` is idempotent.
- Clean reports what it did clearly.
- Smoke coverage verifies clean safety.

## Validation

Run or verify:

- `pnpm build`
- `pnpm typecheck`
- `pnpm smoke`

## Risks

- Cleanup mistakes can cause data loss.
- Generated and user-editable Markdown boundaries must stay clear.
- Future generated paths may need explicit allow-list updates.

## Agent instructions

Use an allow-list for deletion. If a path is not clearly generated and safe, preserve it.

## Active work instructions

Use this Task file as the active execution record.

Do not create a manual Run file. Record progress in the checkpoint log below, then record review and close evidence in this same Task file.

## Expected evidence

At the end, provide:

- Cleaned paths behavior
- Safety preservation evidence
- Files changed
- Validation results
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

- Created `src/clean.ts` with `cleanWorkspace` function
- Implemented `nerv clean` command in `src/index.ts`
- Clean removes generated artifacts from `.nerv/agent/runs/` and `.nerv/agent/builds/`
- Clean preserves `.nerv/nerv.db`, `.nerv/product/`, and `.nerv/repo/`
- Clean is idempotent and reports what was cleaned
- Added 6 smoke tests for clean functionality

**Files touched:**

- `src/clean.ts` (new)
- `src/index.ts`
- `scripts/smoke-cli.mjs`

**Validation performed:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (115 tests).

**Pending work:**

- Review and close TASK-023.

**Suggested commit message:**

```txt
TASK-023 Implement safe nerv clean

- Add cleanWorkspace function to remove generated artifacts
- Implement nerv clean command
- Preserve database and product context
- Add smoke tests for clean safety
```

## Review

Reviewed on 2026-06-09.

**Status:** Approved

**Acceptance criteria verification:**

- ✓ `nerv clean` removes only safe generated artifacts
- ✓ Product docs remain after clean
- ✓ `.nerv/nerv.db` remains after clean
- ✓ `nerv clean` is idempotent
- ✓ Clean reports what it did clearly
- ✓ Smoke coverage verifies clean safety

**Implementation quality:**

- Clean separation of concerns with dedicated clean.ts module
- Conservative approach: only removes agent-generated artifacts
- Clear reporting of what was cleaned
- Comprehensive smoke test coverage

**Residual risks:**

- None identified for this task scope.

## Close summary

Closed on 2026-06-09.

**Commit status:**

Pending commit.

**Final summary:**

TASK-023 implemented the `nerv clean` command to safely remove generated agent artifacts while preserving all durable state. The command is idempotent and provides clear feedback about what was cleaned.

**User or developer value delivered:**

Developers can now safely clean up generated run artifacts without risking loss of product context or work history.

**Files changed:**

- `src/clean.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-023-implement-safe-nerv-clean.md`

**Validation evidence:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (115 tests).
