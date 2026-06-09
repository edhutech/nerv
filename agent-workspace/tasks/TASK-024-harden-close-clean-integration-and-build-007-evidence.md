# TASK-024: Harden Close/Clean Integration And BUILD-007 Evidence

## Status

Closed

## Parent Build

BUILD-007

## Task Goal

Validate the completed BUILD-007 lifecycle end to end and update manual build evidence.

## Why this task matters

BUILD-007 completes the MVP lifecycle. The final task should ensure the commands work together and the build evidence is ready to close.

## Context

TASK-020 through TASK-023 should add close, product evolution updates, list/status polish, and clean behavior. This task verifies integration across those pieces and fixes documentation drift.

## Scope

This task includes:

- Exercise the full lifecycle: start, checkpoint, review, commit-aware close, list/status inspection, and clean.
- Add or adjust smoke coverage for the full BUILD-007 flow.
- Ensure generated `run.md` close instructions match implemented `nerv close` behavior.
- Verify Git unavailable behavior remains graceful.
- Verify clean safety after close.
- Update BUILD-007 progress and evidence.
- Update manual product evolution evidence if required by the task workflow.

## Out of scope

This task does not include:

- New lifecycle features.
- Automatic validation execution by Nerv.
- Automatic Git commit creation.
- GitHub or remote integrations.
- Broad refactors unrelated to BUILD-007.

## Files to inspect

The agent should inspect these files before making changes:

- `src/index.ts`
- `src/run.ts`
- `src/repository.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/builds/BUILD-007-git-aware-close-evolution-lists-and-clean.md`
- `agent-workspace/evolution/product-evolution.md`

## Files likely to change

The agent may need to change:

- `src/run.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/builds/BUILD-007-git-aware-close-evolution-lists-and-clean.md`
- `agent-workspace/evolution/product-evolution.md`
- `agent-workspace/tasks/TASK-024-harden-close-clean-integration-and-build-007-evidence.md`

## Data or state affected

This task should not require new schema. It validates and documents the close, evolution, list/status, and clean lifecycle state added by earlier BUILD-007 tasks.

## Acceptance criteria

This task is complete when:

- End-to-end smoke coverage proves the BUILD-007 flow.
- Generated `run.md` close guidance matches implemented CLI behavior.
- Git available and unavailable close behavior is covered.
- Clean safety is covered after lifecycle activity.
- BUILD-007 evidence is ready for close.

## Validation

Run or verify:

- `pnpm build`
- `pnpm typecheck`
- `pnpm smoke`

## Risks

- End-to-end smoke checks can become brittle if they assert too much prose.
- Git behavior in temporary repos can differ across environments.
- Documentation drift can make agent instructions misleading.

## Agent instructions

Keep this task focused on integration hardening and evidence. Do not add new BUILD-007 feature scope unless a prior task left an acceptance criterion unimplemented.

## Active work instructions

Use this Task file as the active execution record.

Do not create a manual Run file. Record progress in the checkpoint log below, then record review and close evidence in this same Task file.

## Expected evidence

At the end, provide:

- End-to-end flow summary
- Smoke checks added or adjusted
- Validation results
- Remaining BUILD-007 risks
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

- Updated generated `run.md` close instructions to match actual `nerv close` behavior
- Added comprehensive end-to-end smoke coverage for full BUILD-007 lifecycle (runBuild007LifecycleChecks)
- Verified Git unavailable behavior remains graceful for close
- Verified clean safety after close
- Updated BUILD-007 progress to show all tasks as closed
- Updated product evolution with TASK-020 through TASK-024 and BUILD-007 entries

**Files touched:**

- `src/run.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/builds/BUILD-007-git-aware-close-evolution-lists-and-clean.md`
- `agent-workspace/evolution/product-evolution.md`

**Validation performed:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (122 tests).

**Pending work:**

- Review and close TASK-024.

**Suggested commit message:**

```txt
TASK-024 Harden close/clean integration and BUILD-007 evidence

- Update run.md close instructions to match nerv close behavior
- Add end-to-end smoke coverage for BUILD-007 lifecycle
- Verify Git unavailable and clean safety behavior
- Update BUILD-007 progress and product evolution
```

## Review

Reviewed on 2026-06-09.

**Status:** Approved

**Acceptance criteria verification:**

- ✓ End-to-end smoke coverage proves the BUILD-007 flow
- ✓ Generated `run.md` close guidance matches implemented CLI behavior
- ✓ Git available and unavailable close behavior is covered
- ✓ Clean safety is covered after lifecycle activity
- ✓ BUILD-007 evidence is ready for close

**Implementation quality:**

- Comprehensive end-to-end test covers full lifecycle from start to clean
- Generated run.md now provides accurate close instructions
- All acceptance criteria verified through smoke tests
- Product evolution and build progress properly documented

**Residual risks:**

- None identified for this task scope.

## Close summary

Closed on 2026-06-09.

**Commit status:**

Pending commit.

**Final summary:**

TASK-024 hardened the BUILD-007 integration by updating generated run.md close instructions, adding comprehensive end-to-end smoke coverage, and updating build evidence. The MVP lifecycle is now complete with all BUILD-007 tasks closed.

**User or developer value delivered:**

Developers now have accurate close instructions in generated run.md and comprehensive test coverage proving the full lifecycle works end-to-end.

**Files changed:**

- `src/run.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/builds/BUILD-007-git-aware-close-evolution-lists-and-clean.md`
- `agent-workspace/evolution/product-evolution.md`
- `agent-workspace/tasks/TASK-024-harden-close-clean-integration-and-build-007-evidence.md`

**Validation evidence:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (122 tests).
