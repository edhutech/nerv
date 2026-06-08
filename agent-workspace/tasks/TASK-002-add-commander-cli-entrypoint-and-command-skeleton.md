# TASK-002: Add Commander CLI Entrypoint And Command Skeleton

## Status

Proposed

## Parent Build

BUILD-001

## Task Goal

Add the `nerv` CLI entrypoint with Commander and define MVP command skeletons.

## Why this task matters

BUILD-001 requires a runnable CLI with predictable command routing and help output, even before each command has real behavior.

## Context

The MVP command surface is defined in `agent-workspace/product/mvp.md`. This task should expose that surface through Commander without implementing lifecycle behavior yet.

## Scope

This task includes:

- Add the Commander dependency.
- Implement the CLI entrypoint.
- Configure the binary name as `nerv`.
- Add command shells for MVP commands: `init`, `product`, `new task`, `new build`, `build plan`, `start`, `current`, `checkpoint`, `review`, `close`, `tasks`, `builds`, `runs`, `status` and `clean`.
- Ensure placeholder commands clearly say they are not implemented yet.

## Out of scope

This task does not include:

- Real command behavior.
- SQLite setup.
- File generation.
- Git integration.

## Files to inspect

The agent should inspect these files before making changes:

- `package.json`
- `src/`
- `agent-workspace/product/mvp.md`
- `agent-workspace/product/decisions.md`

## Files likely to change

The agent may need to change:

- `package.json`
- `src/cli.ts`
- `src/commands/`

## Data or state affected

CLI command surface only. No persistent state should be created.

## Acceptance criteria

This task is complete when:

- The development CLI can be run.
- `nerv --help` or the development equivalent lists command groups.
- `nerv init --help` works.
- `nerv status --help` works.
- Placeholder commands fail or exit clearly without pretending to perform real work.

## Validation

Run or verify:

- `pnpm build`
- Development CLI help command
- Help for at least `init` and `status`

## Risks

- Too many files or modules for placeholders.
- Placeholder behavior could later conflict with real implementation.
- Nested command design for `new task`, `new build` and `build plan` needs to stay simple.

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
