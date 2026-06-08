# BUILD-001: Project And CLI Foundation

## Status

Approved

## Build Goal

Create the real Nerv TypeScript CLI project foundation.

## Why this Build matters for the Nerv MVP

Everything else depends on a runnable `nerv` CLI with predictable commands, validation, scripts and project structure.

## User value

Developers get a real CLI entrypoint instead of a Markdown-only workflow, making Nerv start to behave like the intended local developer tool.

## Product area

CLI foundation

## Scope

This Build includes:

- Initialize a Node.js, TypeScript and pnpm project.
- Add a Commander-based CLI entrypoint.
- Add basic command routing and help output.
- Add project scripts for build, test and lint where practical.
- Establish a minimal source layout for future MVP commands.

## Out of scope

This Build does not include:

- `.nerv/` workspace creation behavior.
- SQLite schema or persistence.
- Real task, run, checkpoint, review or close logic.

## Expected output

By the end of this Build, the repo should have:

- `package.json`.
- `tsconfig.json`.
- A `src/` CLI structure.
- A runnable development CLI.
- Basic placeholders or command shells for MVP commands.

## Related MVP commands

- `nerv --help`
- `nerv init --help`
- `nerv status --help`

## Suggested Agentic Tasks

Do not complete this section until the Build is approved.

- TASK-001: Initialize TypeScript Package Foundation
- TASK-002: Add Commander CLI Entrypoint And Command Skeleton
- TASK-003: Add Minimal Quality Gates And CLI Smoke Validation

## Progress

- TASK-001: Closed on 2026-06-07 with commit `f6c0e2b`.
- TASK-002: Closed on 2026-06-07 with commit `9dabd5a`.
- TASK-003: Ready for review after RUN-003.

## Acceptance criteria

The Build is complete when:

- The CLI starts without runtime errors.
- Help output lists the MVP command groups.
- TypeScript build succeeds.
- The project is ready for incremental feature builds.

## Validation

The Build should be validated by:

- `pnpm build`
- `pnpm test` if a test script exists.
- `pnpm lint` if a lint script exists.
- Manual check of `nerv --help` or the development equivalent.

## Risks

- Overbuilding abstractions before the MVP flow works end to end.
- Command structure may need adjustment as lifecycle boundaries become clearer.
- Tooling setup could take focus away from the thinnest useful vertical slice.

## Dependencies

- None.

## Notes

This Build should be completed first because every later Build depends on a working CLI foundation.
