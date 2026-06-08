# TASK-002: Add Commander CLI Entrypoint And Command Skeleton

## Status

Reviewed

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

Implemented RUN-002 on 2026-06-07.

What changed:

- Added `commander` as a runtime dependency.
- Replaced the minimal `src/index.ts` message entrypoint with a Commander-based CLI program.
- Added top-level MVP command skeletons for `init`, `product`, `start`, `current`, `checkpoint`, `review`, `close`, `tasks`, `builds`, `runs`, `status` and `clean`.
- Added nested command skeletons for `new task`, `new build` and `build plan`.
- Added explicit placeholder behavior so action commands report that they are not implemented yet.

Files touched:

- `package.json`
- `pnpm-lock.yaml`
- `src/index.ts`
- `agent-workspace/tasks/TASK-002-add-commander-cli-entrypoint-and-command-skeleton.md`
- `agent-workspace/runs/RUN-002-task-002-add-commander-cli-entrypoint-and-command-skeleton.md`

Decisions made:

- Keep command skeletons in `src/index.ts` for now to avoid unnecessary module structure before real command behavior exists.
- Keep package binary unchanged as `nerv` pointing to `./dist/index.js`.
- Use `program.error(..., { exitCode: 1 })` for placeholder actions so commands fail clearly without pretending to perform work.

Validation performed:

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `node dist/index.js --help` listed the MVP command surface.
- `node dist/index.js init --help` passed.
- `node dist/index.js status --help` passed.
- `node dist/index.js new --help` showed `task` and `build` subcommands.
- `node dist/index.js build --help` showed the `plan` subcommand.
- `node dist/index.js status` printed an explicit not-implemented placeholder message.

Pending work:

- Commit TASK-001 close docs and TASK-002 implementation once the user approves committing.
- Close TASK-002 after commit.
- Implement TASK-003 after TASK-002 is committed and closed.

## Review

Reviewed on 2026-06-07.

Acceptance criteria check:

- [x] The development CLI can be run.
- [x] `nerv --help` or the development equivalent lists command groups.
- [x] `nerv init --help` works.
- [x] `nerv status --help` works.
- [x] Placeholder commands fail or exit clearly without pretending to perform real work.

Scope check:

- Passed. The work stayed within CLI command skeleton scope.
- No `.nerv/` state was created.
- No SQLite or persistence code was added.
- No Git integration was added.
- Real lifecycle behavior was not implemented for any command.

Findings fixed during review:

- `commander@15.0.0` required Node `>=22.12.0`, which conflicted with this package's declared Node `>=20` engine.
- Fixed by pinning Commander to `^14.0.3`, whose lockfile engine requirement is Node `>=20`.

Validation check:

Commands performed:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
node dist/index.js --help
node dist/index.js init --help
node dist/index.js status --help
node dist/index.js new --help
node dist/index.js build --help
node dist/index.js new task "example task" --help
node dist/index.js build plan BUILD-001 --help
node dist/index.js status
node dist/index.js init
git status --short --branch
git diff --stat
git diff -- package.json pnpm-lock.yaml src/index.ts
git status --short --ignored
```

Results:

- Install: passed. Lockfile is up to date.
- Build: passed.
- Typecheck: passed.
- Top-level help: passed and lists the MVP command surface.
- `init --help`: passed.
- `status --help`: passed.
- `new --help`: passed and lists `task` and `build` subcommands.
- `build --help`: passed and lists the `plan` subcommand.
- `new task --help`: passed.
- `build plan --help`: passed.
- Placeholder behavior: passed. `status` and `init` print explicit not-implemented messages and exit with code `1`.
- Lint: not run because no lint script exists for BUILD-001 yet.
- Test: not run because no test script exists for BUILD-001 yet.

Git diff check:

- Code/dependency files changed for TASK-002: `package.json`, `pnpm-lock.yaml`, `src/index.ts`.
- Workflow files changed for TASK-002: `agent-workspace/tasks/TASK-002-add-commander-cli-entrypoint-and-command-skeleton.md`, `agent-workspace/runs/RUN-002-task-002-add-commander-cli-entrypoint-and-command-skeleton.md`, `agent-workspace/builds/BUILD-001-project-and-cli-foundation.md`.
- Existing uncommitted workflow files from closing TASK-001 are still present and should be included in the next workflow commit unless the user chooses separate commits.
- Generated files `dist/` and `node_modules/` remain ignored.

Risks:

- Command skeletons are intentionally minimal and all action behavior remains placeholder-only.
- TASK-003 should decide whether to keep smoke validation as manual commands or add a reusable script.

Evidence:

- `src/index.ts` exposes all MVP command names from `agent-workspace/product/mvp.md`.
- Commander dependency is compatible with the package's Node `>=20` engine.
- Placeholder commands fail clearly without performing real work.

Review result:

- Ready to commit. No remaining code changes required for TASK-002.

Suggested commit message:

```txt
TASK-002 Add Commander CLI command skeleton
```

## Close summary

Pending.
