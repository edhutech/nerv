# TASK-019: Harden Checkpoint/Review Integration And Evidence

## Status

Closed

## Parent Build

BUILD-006

## Task Goal

Harden the checkpoint/review flow and close BUILD-006 evidence gaps.

## Why this task matters

The lifecycle must feel coherent before close behavior is added in the next Build.

## Context

TASK-017 and TASK-018 will add the core checkpoint and review commands. This task verifies integration, edge cases and generated Run guidance.

## Scope

This task includes:

- Ensure generated `run.md` instructions match implemented checkpoint and review commands.
- Add smoke coverage for end-to-end checkpoint then review flow.
- Verify current Run fallback behavior is consistent between commands.
- Verify behavior in repositories where Git metadata is unavailable.
- Update BUILD-006 progress and product evolution evidence.

## Out of scope

This task does not include:

- Closing Runs or Tasks.
- Automatic validation execution.
- Automatic LLM review.
- GitHub or CI integration.

## Files to inspect

The agent should inspect these files before making changes:

- `src/index.ts`
- `src/run.ts`
- `src/repository.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/builds/BUILD-006-checkpoint-and-review-lifecycle.md`

## Files likely to change

The agent may need to change:

- `src/run.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/builds/BUILD-006-checkpoint-and-review-lifecycle.md`
- `agent-workspace/evolution/product-evolution.md`
- `agent-workspace/tasks/TASK-019-harden-checkpoint-review-integration-and-evidence.md`
- `agent-workspace/runs/RUN-019-task-019-harden-checkpoint-review-integration-and-evidence.md`

## Data or state affected

This task should not require new schema. It validates and documents the checkpoint/review lifecycle state added by earlier BUILD-006 tasks.

## Acceptance criteria

This task is complete when:

- Run guidance matches implemented checkpoint and review commands.
- End-to-end smoke coverage exercises checkpoint then review for a Run.
- Git unavailable behavior remains graceful.
- BUILD-006 evidence is ready for close.

## Validation

Run or verify:

- `pnpm build`
- `pnpm typecheck`
- `pnpm smoke`

## Risks

- Generated instructions may drift from CLI options.
- Integration tests may become brittle if they assert too much prose.

## Agent instructions

Keep this task focused on integration hardening and evidence. Do not implement close behavior.

## Expected evidence

At the end, provide:

- End-to-end flow summary
- Smoke checks added
- Validation results
- Remaining BUILD-006 risks
- Suggested commit message

## Checkpoint log

### Checkpoint 001

Implemented on 2026-06-09.

**What changed:**

- Updated generated `run.md` checkpoint and review instructions to match actual CLI options (`nerv checkpoint --summary ... --files ...` and `nerv review --outcome ... --summary ... --validation ... --evidence ...`).
- Added end-to-end smoke coverage: checkpoint then review flow for a single Run.
- Added Git-unavailable smoke coverage: checkpoint and review work after `.git` is removed.

**Files touched:**

- `src/run.ts`
- `scripts/smoke-cli.mjs`

**Validation performed:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (98 tests).

**Pending work:**

- Review and close TASK-019.

**Suggested commit message:**

```txt
TASK-019 Harden checkpoint/review integration and evidence

- Update generated run.md with actual checkpoint and review CLI options
- Add end-to-end smoke test for checkpoint then review flow
- Add Git-unavailable smoke tests for checkpoint and review
```

## Review

Reviewed on 2026-06-09.

**Status:** Approved

**Acceptance criteria verification:**

- ✓ Run guidance matches implemented checkpoint and review commands
- ✓ End-to-end smoke coverage exercises checkpoint then review for a Run
- ✓ Git unavailable behavior remains graceful
- ✓ BUILD-006 evidence is ready for close

**Implementation quality:**

- `run.md` now shows actual CLI commands with correct options instead of generic instructions
- Smoke tests verify the full checkpoint → review lifecycle in a single Run
- Git-unavailable tests confirm both commands work without `.git`

**Residual risks:**

- Git diff/status capture from TASK-018 scope was deferred; not blocking BUILD-006 close.

## Close summary

Closed on 2026-06-09.

**Commit status:**

Committed as 3cdb6db.

**Final summary:**

TASK-019 hardened checkpoint/review integration by updating generated `run.md` to match actual CLI options and adding end-to-end and Git-unavailable smoke coverage. BUILD-006 is now ready for close.

**User or developer value delivered:**

Generated `run.md` now gives agents correct checkpoint and review commands, and the lifecycle is verified end-to-end.

**Files changed:**

- `src/run.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-019-harden-checkpoint-review-integration-and-evidence.md`
- `agent-workspace/runs/RUN-019-task-019-harden-checkpoint-review-integration-and-evidence.md`
- `agent-workspace/builds/BUILD-006-checkpoint-and-review-lifecycle.md`
- `agent-workspace/evolution/product-evolution.md`

**Validation evidence:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (98 tests).
