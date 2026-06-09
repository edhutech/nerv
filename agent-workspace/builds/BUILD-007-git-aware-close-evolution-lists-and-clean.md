# BUILD-007: Git-Aware Close, Evolution, Lists And Clean

## Status

Closed

## Build Goal

Complete the lifecycle with close, Git commit awareness, product evolution, list/status commands and cleanup.

## Why this Build matters for the Nerv MVP

Nerv stores work history while Git stores code history. The close flow connects both and preserves product evolution.

## User value

Developers can finish agentic work cleanly, link it to Git history where available and keep product memory current.

## Product area

Close

## Scope

This Build includes:

- Implement `nerv close`.
- Store commit hash if available.
- Update Task and Build statuses.
- Update `.nerv/product/evolution.md` or equivalent evolution memory.
- Finalize `nerv tasks [query]`, `nerv builds [query]`, `nerv runs` and `nerv status`.
- Implement safe `nerv clean` for generated or temporary agent artifacts.

## Out of scope

This Build does not include:

- Running `git commit` automatically.
- Remote Git operations.
- GitHub App.
- Team audit logs.
- Deleting user product docs or database state.

## Expected output

By the end of this Build, the repo should have:

- Closed Task records.
- Linked commit metadata when available.
- Product evolution updated after completed work.
- Useful status and list commands.
- Conservative cleanup behavior.

## Related MVP commands

- `nerv close --run RUN-001`
- `nerv tasks [query]`
- `nerv builds [query]`
- `nerv runs`
- `nerv status`
- `nerv clean`

## Suggested Agentic Tasks

- TASK-020: Add Close State And `nerv close`
- TASK-021: Update Build Progress And Product Evolution On Close
- TASK-022: Finalize List And Status Commands For Closed Work
- TASK-023: Implement Safe `nerv clean`
- TASK-024: Harden Close/Clean Integration And BUILD-007 Evidence

## Progress

- TASK-020: Closed. Added close state and implemented `nerv close` with Git commit capture.
- TASK-021: Closed. Updated Build progress and product evolution during close.
- TASK-022: Closed. Finalized list and status commands for closed work.
- TASK-023: Closed. Implemented conservative cleanup behavior.
- TASK-024: Closed. Hardened close/clean integration and BUILD-007 evidence.

**BUILD-007 is complete.**

## Acceptance criteria

The Build is complete when:

- A reviewed Task can be closed.
- Close warns if there is no commit when Git is available.
- Close stores the commit hash when present.
- Closing a Task can update related Build progress.
- Product evolution records meaningful completed work.
- `clean` does not delete user product docs or database state.

## Validation

The Build should be validated by:

- `pnpm build`
- `pnpm test` if a test script exists.
- Manual close of a reviewed Run.
- Manual close behavior with and without Git available.
- Manual safety check of `nerv clean`.

## Risks

- Git edge cases can complicate the MVP.
- Cleanup must be conservative to avoid data loss.
- Close should not imply code is stable if review or commit evidence is missing.

## Dependencies

- BUILD-001: Project And CLI Foundation.
- BUILD-002: Local Workspace And SQLite State.
- BUILD-004: Agentic Builds And Tasks.
- BUILD-005: Run Generation And Agent Entrypoint.
- BUILD-006: Checkpoint And Review Lifecycle.

## Notes

Nerv should store work history. Git should store code history. Close should connect the two without taking over the developer's Git workflow.
