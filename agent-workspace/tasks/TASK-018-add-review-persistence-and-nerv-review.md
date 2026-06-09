# TASK-018: Add Review Persistence And nerv review

## Status

Proposed

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

Pending.

## Review

Pending.

## Close summary

Pending.
