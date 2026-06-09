# BUILD-006: Checkpoint And Review Lifecycle

## Status

Approved

## Build Goal

Implement progress checkpointing and structured review before close.

## Why this Build matters for the Nerv MVP

The MVP must preserve continuity during work and verify evidence before the task is considered ready.

## User value

Developers can save progress between sessions and review agent work against scope, acceptance criteria and validation evidence.

## Product area

Review

## Scope

This Build includes:

- Implement `nerv checkpoint`.
- Implement `nerv review`.
- Store checkpoint summaries, files touched, decisions, problems, pending work and next steps.
- Review acceptance criteria, validation evidence, scope control and Git diff where available.
- Generate or store review records connected to Runs and Tasks.

## Out of scope

This Build does not include:

- Automatic LLM code review.
- CI integration.
- GitHub integration.
- Closing Tasks.

## Expected output

By the end of this Build, the repo should have:

- Checkpoint records.
- Review records.
- Review summaries connected to Runs and Tasks.
- Git diff and Git status captured when available.

## Related MVP commands

- `nerv checkpoint --run RUN-001`
- `nerv review --run RUN-001`

## Suggested Agentic Tasks

- TASK-017: Add Checkpoint Persistence And `nerv checkpoint`
- TASK-018: Add Review Persistence And `nerv review`
- TASK-019: Harden Checkpoint/Review Integration And Evidence

## Progress

- TASK-017: Closed. Checkpoint persistence and `nerv checkpoint` command are implemented.
- TASK-018: Closed. Review persistence and `nerv review` command are implemented.
- TASK-019: Proposed.

## Acceptance criteria

The Build is complete when:

- A user can checkpoint an active Run.
- A user can review a Run against acceptance criteria.
- Review clearly reports missing validation or evidence.
- The flow works without Git but uses Git when available.

## Validation

The Build should be validated by:

- `pnpm build`
- `pnpm test` if a test script exists.
- Manual checkpoint of an active Run.
- Manual review of a Run with and without Git available.

## Risks

- Review can become performative if it only stores free text.
- Validation command handling must not pretend commands ran if they did not.
- Git diff capture must not mutate the worktree.

## Dependencies

- BUILD-001: Project And CLI Foundation.
- BUILD-002: Local Workspace And SQLite State.
- BUILD-004: Agentic Builds And Tasks.
- BUILD-005: Run Generation And Agent Entrypoint.

## Notes

The preferred lifecycle is checkpoint, review, Git commit, then close.
