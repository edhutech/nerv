# TASK-017: Add Checkpoint Persistence And nerv checkpoint

## Status

Closed

## Parent Build

BUILD-006

## Task Goal

Add persistent checkpoint records and implement `nerv checkpoint` for an active or specified Run.

## Why this task matters

Checkpointing preserves continuity between agent sessions before review and close exist.

## Context

The SQLite schema already includes a `checkpoints` table and Runs are active/current after BUILD-005. The CLI still has a placeholder for `nerv checkpoint`.

## Scope

This task includes:

- Add repository helpers for creating and listing checkpoint records.
- Implement `nerv checkpoint` with optional `--run RUN-###`.
- Default to the current active Run when `--run` is omitted.
- Capture a user-provided summary with `--summary`.
- Capture optional files touched, decisions, problems, pending work and next steps via CLI options.
- Generate a compact checkpoint Markdown file under the Run directory if useful.
- Show clear errors for missing current Run, unknown Run ID, or missing summary.

## Out of scope

This task does not include:

- `nerv review`.
- Closing Runs or Tasks.
- Running validation commands automatically.
- Automatic LLM-generated summaries.

## Files to inspect

The agent should inspect these files before making changes:

- `src/database.ts`
- `src/repository.ts`
- `src/index.ts`
- `src/run.ts`
- `scripts/smoke-cli.mjs`

## Files likely to change

The agent may need to change:

- `src/repository.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-017-add-checkpoint-persistence-and-nerv-checkpoint.md`
- `agent-workspace/runs/RUN-017-task-017-add-checkpoint-persistence-and-nerv-checkpoint.md`

## Data or state affected

This task affects the existing `checkpoints` SQLite table and generated Run files under `.nerv/agent/runs/RUN-###/`.

## Acceptance criteria

This task is complete when:

- `nerv checkpoint --run RUN-001 --summary "..."` stores a checkpoint for that Run.
- `nerv checkpoint --summary "..."` uses the current Run.
- Checkpoint output includes the checkpoint ID, Run ID and saved path or state.
- Missing current Run, unknown Run ID and missing summary fail clearly.
- Smoke coverage verifies persistence and CLI behavior.

## Validation

Run or verify:

- `pnpm build`
- `pnpm typecheck`
- `pnpm smoke`

## Risks

- Checkpoint options can become too complex for the MVP.
- Free-text fields should remain useful without pretending validation ran.
- Generated checkpoint files must not conflict with future review output.

## Agent instructions

Keep this focused on saving explicit user-provided checkpoint evidence. Do not implement review or close behavior.

## Expected evidence

At the end, provide:

- Example `nerv checkpoint` output
- Repository helpers added
- Checkpoint file or database evidence
- Validation results
- Suggested commit message

## Checkpoint log

### Checkpoint 001

Implemented on 2026-06-09.

**What changed:**

- Added `CheckpointRecord` and `CreateCheckpointInput` repository types.
- Added `createCheckpoint` and `listCheckpoints` repository helpers.
- Implemented `nerv checkpoint` with current Run fallback and explicit `--run` support.
- Added required `--summary` and optional `--files`, `--decisions`, `--problems`, `--pending` and `--next` evidence fields.
- Persisted checkpoint summaries in SQLite.
- Generated checkpoint Markdown files under `.nerv/agent/runs/RUN-###/checkpoints/checkpoint-###.md`.
- Added smoke coverage for repository checkpoint persistence, explicit Run checkpointing, current Run fallback, missing Run and empty summary errors.

**Files touched:**

- `src/repository.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/builds/BUILD-006-checkpoint-and-review-lifecycle.md`
- `agent-workspace/tasks/TASK-017-add-checkpoint-persistence-and-nerv-checkpoint.md`
- `agent-workspace/tasks/TASK-018-add-review-persistence-and-nerv-review.md`
- `agent-workspace/tasks/TASK-019-harden-checkpoint-review-integration-and-evidence.md`
- `agent-workspace/runs/RUN-017-task-017-add-checkpoint-persistence-and-nerv-checkpoint.md`

**Example output:**

```txt
Saved checkpoint 1 for RUN-001.
  Summary: Implemented checkpoint flow
  Checkpoint file: /repo/.nerv/agent/runs/RUN-001/checkpoints/checkpoint-001.md
```

**Validation performed:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed.

**Pending work:**

- Review TASK-017.
- Commit and close TASK-017 if review passes.

**Suggested commit message:**

```txt
TASK-017 Add checkpoint persistence and command

- Add checkpoint repository helpers
- Implement nerv checkpoint with current Run fallback
- Persist checkpoint summaries and write checkpoint Markdown
- Add smoke coverage for checkpoint behavior
```

## Review

Reviewed on 2026-06-09.

**Status:** Approved

**Acceptance criteria verification:**

- ✓ `nerv checkpoint --run RUN-001 --summary "..."` stores a checkpoint for that Run
- ✓ `nerv checkpoint --summary "..."` uses the current Run
- ✓ Checkpoint output includes the checkpoint ID, Run ID and saved path
- ✓ Missing current Run, unknown Run ID and missing summary fail clearly
- ✓ Smoke coverage verifies persistence and CLI behavior

**Implementation quality:**

- Repository layer adds `CheckpointRecord` and `CreateCheckpointInput` types
- Prepared statements for create, get, and list operations
- `createCheckpoint` uses transaction and returns full record
- CLI uses `requiredOption` for `--summary` and validates empty/whitespace summaries
- Normalizes Run ID to uppercase for consistency
- Generates checkpoint Markdown files with zero-padded IDs
- Helper functions handle missing optional values gracefully

**Test coverage:**

- Repository-level tests verify persistence and retrieval
- CLI tests verify all error paths and success paths
- Tests verify both file generation and database persistence
- Tests verify current Run fallback behavior

**Scope compliance:**

- All in-scope items implemented correctly
- No out-of-scope items implemented

**Recommendation:** Approve for commit and close.

## Close summary

Closed on 2026-06-09.

**Commit status:**

Committed as fd74ba9.

**Final summary:**

TASK-017 implemented checkpoint persistence and the `nerv checkpoint` command. Developers can now save progress checkpoints for active Runs with structured evidence fields (summary, files touched, decisions, problems, pending work, and next steps). Checkpoints are persisted in SQLite and written as Markdown files under each Run's `checkpoints/` directory.

**User or developer value delivered:**

Developers can save explicit checkpoint evidence between agent sessions, providing continuity and structured progress tracking before review and close lifecycle commands exist.

**Files changed:**

- `src/repository.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/builds/BUILD-006-checkpoint-and-review-lifecycle.md`
- `agent-workspace/tasks/TASK-017-add-checkpoint-persistence-and-nerv-checkpoint.md`
- `agent-workspace/tasks/TASK-018-add-review-persistence-and-nerv-review.md`
- `agent-workspace/tasks/TASK-019-harden-checkpoint-review-integration-and-evidence.md`
- `agent-workspace/runs/RUN-017-task-017-add-checkpoint-persistence-and-nerv-checkpoint.md`

**Validation evidence:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed.

**Related Build update:**

BUILD-006 progress updated to mark TASK-017 as closed.

**Follow-up tasks:**

- TASK-018: Add review persistence and `nerv review`.
- TASK-019: Harden checkpoint/review integration and evidence.
