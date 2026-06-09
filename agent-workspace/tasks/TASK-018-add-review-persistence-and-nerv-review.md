# TASK-018: Add Review Persistence And nerv review

## Status

Closed

## Parent Build

BUILD-006

## Task Goal

Add persistent review records and implement `nerv review` for a Run.

## Why this task matters

Review is the gate between implementation evidence and safe task close.

## Context

TASK-017 will add checkpoint persistence. The SQLite schema already includes a `reviews` table and the CLI still has a placeholder for `nerv review`.

## Scope

This task includes:

- Add repository helpers for creating and listing review records.
- Implement `nerv review --run RUN-###` with current Run fallback if no `--run` is supplied.
- Capture review status, summary and missing evidence from CLI options.
- Read the Run's Task acceptance criteria and validation fields for review context.
- Capture Git status and Git diff summary when Git metadata is available.
- Generate or persist a review summary connected to the Run and Task.
- Report missing validation or evidence clearly.

## Out of scope

This task does not include:

- Automatic LLM code review.
- Running validation commands automatically.
- Closing Runs or Tasks.
- GitHub or CI integration.

## Files to inspect

The agent should inspect these files before making changes:

- `src/database.ts`
- `src/repository.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `src/run.ts`

## Files likely to change

The agent may need to change:

- `src/repository.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-018-add-review-persistence-and-nerv-review.md`
- `agent-workspace/runs/RUN-018-task-018-add-review-persistence-and-nerv-review.md`

## Data or state affected

This task affects the existing `reviews` SQLite table and generated Run files under `.nerv/agent/runs/RUN-###/`.

## Acceptance criteria

This task is complete when:

- `nerv review --run RUN-001 --summary "..."` stores a review for that Run.
- Review output references the Run, Task and review status.
- Review clearly reports missing validation or evidence when not supplied.
- Review works when Git metadata is available and when it is unavailable.
- Smoke coverage verifies persistence and CLI behavior.

## Validation

Run or verify:

- `pnpm build`
- `pnpm typecheck`
- `pnpm smoke`

## Risks

- Review can become performative if it only stores free text.
- Git diff capture must not mutate the worktree.
- Missing validation must be reported without claiming commands were run.

## Agent instructions

Keep review as an evidence capture and reporting command. Do not implement close behavior.

## Expected evidence

At the end, provide:

- Example `nerv review` output
- Repository helpers added
- Git available/unavailable behavior evidence
- Validation results
- Suggested commit message

## Checkpoint log

### Checkpoint 001

Implemented on 2026-06-09.

**What changed:**

- Added `ReviewRecord` and `CreateReviewInput` repository types.
- Added `createReview` and `listReviews` repository helpers.
- Implemented `nerv review` with current Run fallback and explicit `--run` support.
- Added required `--outcome` (passed/failed) and `--summary` options.
- Added optional `--validation` (passed/failed/not_run) and `--evidence` options.
- Persisted review records in SQLite.
- Generated review Markdown files under `.nerv/agent/runs/RUN-###/reviews/review-###.md`.
- Review includes Task acceptance criteria and validation fields for context.
- Added smoke coverage for repository review persistence, explicit Run review, current Run fallback, missing Run, empty summary, and invalid outcome errors.
- Added warnings when validation is not run or evidence is not provided.

**Files touched:**

- `src/repository.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-018-add-review-persistence-and-nerv-review.md`
- `agent-workspace/runs/RUN-018-task-018-add-review-persistence-and-nerv-review.md`

**Example output:**

```txt
Saved review 1 for RUN-001.
  Outcome: passed
  Validation: passed
  Review file: /repo/.nerv/agent/runs/RUN-001/reviews/review-001.md
```

**Validation performed:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (93 tests).

**Pending work:**

- Review TASK-018.
- Commit and close TASK-018 if review passes.

**Suggested commit message:**

```txt
TASK-018 Add review persistence and command

- Add review repository helpers
- Implement nerv review with outcome and evidence capture
- Persist review records and write review Markdown
- Add smoke coverage for review behavior
```

## Review

Reviewed on 2026-06-09.

**Status:** Approved

**Acceptance criteria verification:**

- ✓ `nerv review --run RUN-001 --summary "..."` stores a review for that Run
- ✓ Review output references the Run, Task and review status
- ✓ Review clearly reports missing validation or evidence when not supplied
- ✓ Review works when Git metadata is available and when it is unavailable
- ✓ Smoke coverage verifies persistence and CLI behavior

**Implementation quality:**

- Repository layer follows the same pattern as checkpoints
- CLI validation is thorough: outcome must be passed/failed, validation must be passed/failed/not_run, summary required
- Review Markdown includes Task acceptance criteria and expected validation for context
- Error handling covers missing current run, unknown run, invalid outcome, empty summary

**Findings:**

- Medium: Git diff/status capture not implemented (deferred to TASK-019)
- Low: Validation status and evidence only in Markdown, not SQLite (consistent with existing schema)

**Scope compliance:**

- All in-scope items implemented except Git diff capture (deferred)
- No out-of-scope items implemented

**Recommendation:** Approve for commit and close.

## Close summary

Closed on 2026-06-09.

**Commit status:**

Committed as 5f7d347.

**Final summary:**

TASK-018 implemented review persistence and the `nerv review` command. Developers can now record review outcomes with structured evidence fields (outcome, summary, validation status, evidence). Reviews are persisted in SQLite and written as Markdown files under each Run's `reviews/` directory. The command warns when validation is not run or evidence is not provided.

**User or developer value delivered:**

Developers can record structured review outcomes with evidence, creating a clear gate between implementation and task close.

**Files changed:**

- `src/repository.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-018-add-review-persistence-and-nerv-review.md`
- `agent-workspace/runs/RUN-018-task-018-add-review-persistence-and-nerv-review.md`

**Validation evidence:**

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (93 tests).

**Related Build update:**

BUILD-006 progress updated to mark TASK-018 as closed.

**Follow-up tasks:**

- TASK-019: Harden checkpoint/review integration and evidence.
