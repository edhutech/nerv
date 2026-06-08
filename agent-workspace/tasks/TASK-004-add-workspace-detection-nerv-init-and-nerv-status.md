# TASK-004: Add Workspace Detection, `nerv init`, And `nerv status`

## Status

Closed

## Parent Build

BUILD-002

## Task Goal

Implement the user-facing local workspace bootstrap flow so Nerv can initialize `.nerv/` in the current repo and report whether the repo is initialized.

## Why this task matters

This is the first usable outcome of BUILD-002. Without `nerv init` and `nerv status`, the SQLite foundation exists only as internal plumbing and the MVP cannot prove local-first setup.

## Context

BUILD-002 establishes the local workspace and state foundation for Nerv. The current CLI already exposes `init` and `status` as placeholders in `src/index.ts`. This task should replace those placeholders with minimal real behavior that creates the required `.nerv/` folder structure inside the current repo and reports whether initialization has happened.

## Scope

This task includes:

- Replace the `init` command stub with a real initializer for the current repo.
- Create the required directory structure: `.nerv/`, `.nerv/product/`, `.nerv/repo/`, `.nerv/agent/runs/` and `.nerv/agent/builds/`.
- Detect whether the current repo is already initialized.
- Replace the `status` command stub with a minimal initialized or not initialized report.
- Make `nerv init` idempotent and safe to run repeatedly.

## Out of scope

This task does not include:

- Writing product markdown content.
- Creating runs, builds or tasks records.
- Advanced repo discovery beyond what is needed to scope state to the current repo.
- Rich status output beyond initialization state.

## Files to inspect

The agent should inspect these files before making changes:

- `src/index.ts`
- `package.json`
- `agent-workspace/builds/BUILD-002-local-workspace-and-sqlite-state.md`
- `agent-workspace/product/mvp.md`
- `agent-workspace/product/architecture.md`
- `agent-workspace/product/stack.md`

## Files likely to change

The agent may need to change:

- `src/index.ts`
- New CLI support files under `src/` for workspace path and initialization logic
- `README.md`

## Data or state affected

Creates local filesystem state under the current repo's `.nerv/` directory and should avoid touching paths outside the active repo.

## Acceptance criteria

This task is complete when:

- `nerv init` creates the expected `.nerv/` directory structure in the current repo.
- `nerv init` can be run multiple times without error or destructive overwrites.
- `nerv status` reports initialized when `.nerv/` and database state exist, otherwise not initialized.
- The command behavior is scoped to the current repo only.

## Validation

Run or verify:

- `pnpm build`
- `pnpm smoke` or equivalent CLI command validation
- Manual run in a temporary repo: `nerv init`
- Manual rerun in the same repo to confirm idempotency
- Manual run of `nerv status` before and after initialization

## Risks

- Incorrect repo scoping could create `.nerv/` in the wrong directory.
- Overly eager initialization could overwrite future user-managed docs.
- Status detection could drift if it relies on incomplete signals.

## Agent instructions

Work only within this task scope.

Do not expand into other tasks from the parent Build.

Implement the thinnest correct user-facing initialization flow first. Keep output and status logic minimal. Do not start on schema design beyond what is required to create the database file safely.

If you find that the task is too broad, blocked or unsafe, stop and explain the issue before making unrelated changes.

## Expected evidence

At the end, provide:

- Summary of changes
- Files changed
- Example `nerv init` and `nerv status` outputs
- Validation results
- Remaining risks
- Suggested commit message

## Checkpoint log

### Checkpoint 001

Implemented on 2026-06-08.

What changed:

- Replaced the `init` placeholder with real repo-local `.nerv/` initialization.
- Replaced the `status` placeholder with initialized or not initialized reporting.
- Added repo root detection that resolves the current Git repo from the working directory.
- Added idempotent creation of `.nerv/`, `.nerv/product/`, `.nerv/repo/`, `.nerv/agent/runs/`, `.nerv/agent/builds/` and `.nerv/nerv.db`.
- Expanded smoke validation to cover nested repo initialization, not-initialized status and idempotent init behavior.

Files touched:

- `package.json`
- `pnpm-lock.yaml`
- `src/index.ts`
- `src/workspace.ts`
- `scripts/smoke-cli.mjs`
- `README.md`
- `agent-workspace/tasks/TASK-004-add-workspace-detection-nerv-init-and-nerv-status.md`

Decisions made:

- Treat the current Git repo root as the boundary for local Nerv state even when the command is run from a nested directory.
- Keep database creation minimal for this task by ensuring `.nerv/nerv.db` exists without introducing schema bootstrapping yet.
- Keep `status` informational with exit code `0` for both initialized and not initialized states.

Validation performed:

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed.

Pending work:

- None for TASK-004.
- Start TASK-005 after TASK-004 is accepted and closure records are complete.

## Review

Reviewed on 2026-06-08.

Acceptance criteria check:

- [x] `nerv init` creates the expected `.nerv/` directory structure in the current repo.
- [x] `nerv init` can be run multiple times without error or destructive overwrites.
- [x] `nerv status` reports initialized when `.nerv/` and database state exist, otherwise not initialized.
- [x] The command behavior is scoped to the current repo only.

Scope check:

- Passed. The work stayed within workspace detection, initialization and minimal status reporting scope.
- No product markdown content was generated.
- No runs, builds or tasks records were created.
- No SQLite schema bootstrapping was added beyond ensuring `.nerv/nerv.db` exists.
- No advanced repo analysis or rich status reporting was added.

Validation check:

Commands performed:

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm smoke
node dist/index.js status
node "/home/edhutech/nerv/dist/index.js" init
git status --short
```

Results:

- Install: passed. Added `@types/node` and updated the lockfile.
- Build: passed.
- Typecheck: passed.
- Smoke: passed.
- Status: passed. Reports `not initialized` in the current repo because `.nerv/` has not been created here.
- Init outside Git repo: passed. Fails with an explicit message that `nerv init` must be run inside a Git repository.

Behavior coverage:

- `init --help` works.
- `status --help` works.
- `init` creates `.nerv/`, `.nerv/product/`, `.nerv/repo/`, `.nerv/agent/runs/`, `.nerv/agent/builds/` and `.nerv/nerv.db`.
- `init` resolves the Git repo root correctly when run from a nested directory.
- `init` is idempotent on rerun.
- `status` reports not initialized before setup and initialized after setup in smoke validation.

Git diff check:

- Modified files: `README.md`, `package.json`, `pnpm-lock.yaml`, `scripts/smoke-cli.mjs`, `src/index.ts`, `agent-workspace/tasks/TASK-004-add-workspace-detection-nerv-init-and-nerv-status.md`.
- Added files: `src/workspace.ts`, `agent-workspace/tasks/TASK-005-add-sqlite-bootstrap-schema-and-database-initialization.md`, `agent-workspace/tasks/TASK-006-add-repository-helpers-and-stable-id-generation.md`.
- Modified workflow file from BUILD planning: `agent-workspace/builds/BUILD-002-local-workspace-and-sqlite-state.md`.

Risks:

- `status` currently reports only a minimal initialized or not initialized view and may need richer diagnostics later.
- `.nerv/nerv.db` is created as an empty file in this task; real schema bootstrap is deferred to TASK-005.

Evidence:

- `src/workspace.ts` centralizes repo root detection and idempotent workspace creation.
- `src/index.ts` wires `nerv init` and `nerv status` to real behavior.
- `scripts/smoke-cli.mjs` verifies nested-repo initialization, not-initialized status and idempotent reruns.

Review result:

- Ready to close. No remaining changes required for TASK-004.

Suggested commit message:

```txt
TASK-004 Add workspace detection, init, and status
```

## Close summary

Closed on 2026-06-08.

Commit:

```txt
11e2296 TASK-004 Add workspace detection, init, and status
```

Final summary:

- Added repo-local Nerv workspace detection using the current Git repository root.
- Implemented `nerv init` to create `.nerv/`, required subdirectories and `.nerv/nerv.db` safely and idempotently.
- Implemented `nerv status` to report whether the current repo is initialized.
- Added smoke coverage for nested repo initialization, pre-init status and repeated init runs.
- Kept the implementation intentionally small so SQLite schema work can land cleanly in TASK-005.

User or developer value delivered:

- Developers can now initialize Nerv inside a repo without touching paths outside that repo.
- Developers can quickly check whether a repo already has Nerv local state.

Files changed:

- `README.md`
- `package.json`
- `pnpm-lock.yaml`
- `scripts/smoke-cli.mjs`
- `src/index.ts`
- `src/workspace.ts`
- `agent-workspace/tasks/TASK-004-add-workspace-detection-nerv-init-and-nerv-status.md`
- `agent-workspace/builds/BUILD-002-local-workspace-and-sqlite-state.md`

Validation evidence:

- `pnpm install` passed.
- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed.
- `node dist/index.js status` reports the current repo state.
- `node "/home/edhutech/nerv/dist/index.js" init` fails clearly outside a Git repo.

Related Build update:

- BUILD-002 now has TASK-004 closed.
- BUILD-002 remains in progress pending TASK-005 and TASK-006.

Follow-up tasks:

- Start TASK-005: Add SQLite Bootstrap Schema And Database Initialization.
