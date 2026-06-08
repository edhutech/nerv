# TASK-003: Add Minimal Quality Gates And CLI Smoke Validation

## Status

Proposed

## Parent Build

BUILD-001

## Task Goal

Add enough validation so BUILD-001 can be verified reliably.

## Why this task matters

The foundation should not only exist; it should be buildable and runnable before later Builds depend on it.

## Context

The Nerv development rules require agents to report available validation honestly. This task should keep quality gates minimal and useful for the CLI foundation.

## Scope

This task includes:

- Ensure `pnpm build` compiles the CLI.
- Add a simple smoke validation path for CLI help output.
- Add lint or formatting only if lightweight and not distracting.
- Document any intentionally missing validation scripts.

## Out of scope

This task does not include:

- Full test framework if it slows the MVP.
- Unit tests for future command behavior.
- CI setup.
- Git hooks.

## Files to inspect

The agent should inspect these files before making changes:

- `package.json`
- `tsconfig.json`
- `src/`
- Existing generated package files after TASK-001 and TASK-002

## Files likely to change

The agent may need to change:

- `package.json`
- `README.md`
- A minimal test or smoke script file if useful

## Data or state affected

Development validation only. No `.nerv/` state.

## Acceptance criteria

This task is complete when:

- Build command passes.
- CLI help can be smoke-tested.
- Missing optional scripts are reported honestly.
- BUILD-001 acceptance criteria can be checked end to end.

## Validation

Run or verify:

- `pnpm build`
- CLI help smoke check
- `pnpm test` only if a test script is added
- `pnpm lint` only if a lint script is added

## Risks

- Adding too much tooling before the MVP flow exists.
- Smoke checks may be brittle if command output changes.
- Validation should not depend on global installation.

## Agent instructions

Work only within this task scope.

Do not expand into other tasks from the parent Build.

If you find that the task is too broad, blocked or unsafe, stop and explain the issue before making unrelated changes.

## Expected evidence

At the end, provide:

- Summary of changes
- Files changed
- Validation results
- Remaining risks
- Suggested commit message

## Checkpoint log

### Checkpoint 001

Pending.

## Review

Pending.

## Close summary

Pending.
