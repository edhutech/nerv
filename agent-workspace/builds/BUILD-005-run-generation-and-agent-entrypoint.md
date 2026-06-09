# BUILD-005: Run Generation And Agent Entrypoint

## Status

Approved

## Build Goal

Implement Runs and focused agent-facing `run.md` generation.

## Why this Build matters for the Nerv MVP

The `run.md` file is the single entrypoint for coding agents and the main user-facing proof of Nerv's value.

## User value

Developers can start focused agent work without re-explaining product context, task scope and validation expectations.

## Product area

Run generation

## Scope

This Build includes:

- Implement `nerv start <query>`.
- Create a Run for a selected Task.
- Generate `.nerv/agent/runs/RUN-001/run.md`.
- Generate a supporting task context file if needed.
- Implement `nerv current`.
- Include scope, relevant context files, acceptance criteria, validation commands, checkpoint instructions, review instructions, close instructions and Git awareness.

## Out of scope

This Build does not include:

- Agent execution.
- MCP server.
- TUI.
- Cloud sync.
- Automatic code changes by Nerv.

## Expected output

By the end of this Build, the repo should have:

- Run records in SQLite.
- Generated `run.md` files.
- Clear prompt or instruction output after `nerv start`.
- Active/current run tracking.

## Related MVP commands

- `nerv start <query>`
- `nerv current`
- `nerv runs`

## Suggested Agentic Tasks

- TASK-014: Add Run Persistence And Task Selection Helpers
- TASK-015: Implement nerv start And Run Markdown Generation
- TASK-016: Implement nerv current And nerv runs

## Progress

- TASK-014: Closed. Run persistence helpers, current Run metadata and deterministic Task selection are implemented.
- TASK-015: Pending.
- TASK-016: Pending.

## Acceptance criteria

The Build is complete when:

- Starting a Task creates a Run.
- `run.md` is focused and not a full context dump.
- A coding agent can follow `run.md` without needing the whole workspace.
- `nerv current` identifies the active run.

## Validation

The Build should be validated by:

- `pnpm build`
- `pnpm test` if a test script exists.
- Manual creation of a Task and Run.
- Manual inspection of generated `.nerv/agent/runs/RUN-001/run.md`.

## Risks

- Generated Markdown may become too verbose.
- Query selection needs deterministic behavior when multiple tasks match.
- Run generation must respect Task scope over Build context.

## Dependencies

- BUILD-001: Project And CLI Foundation.
- BUILD-002: Local Workspace And SQLite State.
- BUILD-003: Product And Repo Context Flow.
- BUILD-004: Agentic Builds And Tasks.

## Notes

The generated `run.md` should be the agent's single entrypoint for a Run.
