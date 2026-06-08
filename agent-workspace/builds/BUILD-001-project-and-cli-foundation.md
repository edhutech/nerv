# BUILD-001: Project And CLI Foundation

## Status

Closed

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
- TASK-003: Closed on 2026-06-07 with commit `abf72c1`.
- BUILD-001: Closed on 2026-06-07.

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

## Review

Reviewed on 2026-06-07.

Task completion check:

- [x] TASK-001 closed with commit `f6c0e2b`.
- [x] TASK-002 closed with commit `9dabd5a`.
- [x] TASK-003 closed with commit `abf72c1`.

Acceptance criteria check:

- [x] The CLI starts without runtime errors.
- [x] Help output lists the MVP command groups.
- [x] TypeScript build succeeds.
- [x] The project is ready for incremental feature builds.

Scope check:

- Passed. BUILD-001 stayed within CLI foundation scope.
- No `.nerv/` workspace behavior was implemented.
- No SQLite schema or persistence was added.
- No real task, run, checkpoint, review or close logic was implemented.

Validation check:

Commands performed:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm smoke
pnpm validate
pnpm run test
pnpm run lint
git status --short --branch
git log --oneline -10
git status --short --ignored
```

Results:

- Install: passed. Lockfile is up to date.
- Build: passed.
- Typecheck: passed.
- Smoke: passed.
- Validate: passed.
- Test: not present. This is intentionally documented in `README.md`.
- Lint: not present. This is intentionally documented in `README.md`.
- Git status: clean before recording this Build review.
- Ignored generated files: `dist/` and `node_modules/`.

Evidence:

- `package.json` exists with `build`, `typecheck`, `smoke` and `validate` scripts.
- `tsconfig.json` compiles `src/` to `dist/`.
- `src/index.ts` exposes the Commander-based MVP command skeleton.
- `scripts/smoke-cli.mjs` verifies top-level help, key command help, nested command help and placeholder failure behavior.
- `README.md` documents current validation commands and honestly reports missing optional scripts.

Risks:

- Command actions are intentionally placeholder-only until later Builds implement real behavior.
- Smoke checks assert selected help text and may need updates when command descriptions or real behavior evolve.

Review result:

- Ready to close. No remaining changes required for BUILD-001.

Suggested close commit message:

```txt
BUILD-001 Close project and CLI foundation
```

## Close summary

Closed on 2026-06-07.

Related task commits:

- `f6c0e2b` TASK-001 Initialize TypeScript package foundation
- `9dabd5a` TASK-002 Add Commander CLI command skeleton
- `abf72c1` TASK-003 Add CLI smoke validation

Final summary:

- Created the initial Node.js, TypeScript and pnpm package foundation for Nerv.
- Added the Commander-based `nerv` CLI entrypoint.
- Added MVP command skeletons and explicit not-implemented placeholder behavior.
- Added repeatable CLI smoke validation and aggregate `pnpm validate` script.
- Documented current validation commands and intentionally absent optional scripts.

User or developer value delivered:

- Nerv is now a real buildable CLI project instead of only a manual Markdown workflow.
- Later Builds can implement real local-first behavior on top of a stable CLI foundation.

Validation evidence:

- `pnpm install --frozen-lockfile` passed.
- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed.
- `pnpm validate` passed.

Product evolution update:

- Added a BUILD-001 close note to product evolution.

Follow-up:

- Start BUILD-002: Local Workspace And SQLite State.
