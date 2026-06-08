# TASK-001: Initialize TypeScript Package Foundation

## Status

Reviewed

## Parent Build

BUILD-001

## Task Goal

Create the base Node.js, TypeScript and pnpm project structure for Nerv.

## Why this task matters

Nerv currently has only `agent-workspace/`. The real MVP needs an actual package foundation before any CLI commands can be implemented.

## Context

BUILD-001 establishes the real CLI project. This task should create only the minimal package and TypeScript foundation needed for future command work.

## Scope

This task includes:

- Create `package.json`.
- Create `tsconfig.json`.
- Add a minimal `src/` structure.
- Configure the project as a CLI package.
- Add scripts for `build`, `typecheck` and a basic validation path.

## Out of scope

This task does not include:

- Commander command implementation beyond what is needed for later tasks.
- `.nerv/` initialization.
- SQLite or persistence.
- Tests unless the chosen setup makes a minimal test script practical.

## Files to inspect

The agent should inspect these files before making changes:

- `agent-workspace/builds/BUILD-001-project-and-cli-foundation.md`
- `agent-workspace/product/stack.md`
- `agent-workspace/product/development.md`
- Current repo root

## Files likely to change

The agent may need to change:

- `package.json`
- `tsconfig.json`
- `src/`
- `.gitignore`

## Data or state affected

Creates the real Nerv package foundation in the repo root. Does not create `.nerv/` state.

## Acceptance criteria

This task is complete when:

- `package.json` exists and uses pnpm-compatible scripts.
- TypeScript config exists and supports compiling `src/`.
- Source directory exists with a minimal entrypoint.
- The project can install dependencies and run a build command.

## Validation

Run or verify:

- `pnpm install`
- `pnpm build`
- `pnpm typecheck` if separate from build

## Risks

- Tooling setup could become too broad.
- Package metadata may need later refinement before publishing.
- No Git repo exists currently, so Git-related package assumptions should be avoided.

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

Implemented RUN-001 on 2026-06-07.

What changed:

- Added the root Node.js package foundation.
- Added TypeScript compiler configuration.
- Added a minimal buildable CLI entrypoint.
- Added ignore rules for Node.js build artifacts.
- Installed TypeScript with pnpm and generated `pnpm-lock.yaml`.

Files touched:

- `package.json`
- `pnpm-lock.yaml`
- `tsconfig.json`
- `src/index.ts`
- `.gitignore`
- `agent-workspace/tasks/TASK-001-initialize-typescript-package-foundation.md`

Decisions made:

- Use ESM with `type: "module"` and TypeScript `NodeNext` module resolution.
- Configure the package binary as `nerv` pointing to `./dist/index.js` for later CLI command work.
- Keep the entrypoint intentionally minimal and defer Commander command routing to TASK-002.

Validation performed:

- `pnpm install` passed.
- `pnpm build` passed.
- `pnpm typecheck` passed.
- `node dist/index.js` printed the expected foundation message.

Pending work:

- Commit TASK-001 once the user approves committing.
- Close TASK-001 after commit, or explicitly close without commit if the user chooses that path.
- Implement Commander command skeletons in TASK-002 after approval and a new Run.

## Review

Reviewed on 2026-06-07.

Acceptance criteria check:

- [x] `package.json` exists and uses pnpm-compatible scripts.
- [x] TypeScript config exists and supports compiling `src/`.
- [x] Source directory exists with a minimal entrypoint.
- [x] The project can install dependencies and run a build command.

Scope check:

- Passed. The work stayed within package foundation scope.
- Commander command skeletons were not implemented.
- `.nerv/` state was not created.
- SQLite or persistence was not added.

Validation check:

Commands performed:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
node dist/index.js
git status --short --branch
```

Results:

- Install: passed. Lockfile is up to date.
- Build: passed.
- Typecheck: passed.
- CLI smoke check: passed. The compiled entrypoint printed the expected foundation message.
- Git status: unavailable because `/home/edhutech/nerv` is not a Git repository.
- Lint: not run because no lint script exists for TASK-001.
- Test: not run because no test script exists for TASK-001.

Git diff check:

- Git diff unavailable because this workspace is not currently a Git repository.
- Files added by this task: `.gitignore`, `package.json`, `pnpm-lock.yaml`, `src/index.ts`, `tsconfig.json`.
- Files modified by this task: `agent-workspace/tasks/TASK-001-initialize-typescript-package-foundation.md`.
- Generated build output: `dist/` was created by `pnpm build` and is ignored by `.gitignore`.

Risks:

- Package metadata may need refinement before publishing.
- No Git commit can be created until the repo is initialized as Git or the user explicitly chooses a no-commit close path.

Evidence:

- `pnpm build` compiles `src/index.ts` into `dist/`.
- `pnpm typecheck` passes with strict TypeScript settings.
- `node dist/index.js` prints: `Nerv CLI foundation is installed. Command routing will be added in TASK-002.`

Review result:

- Ready to commit once Git is available. No code changes required for TASK-001.

Suggested commit message:

```txt
TASK-001 Initialize TypeScript package foundation
```

Second review on 2026-06-07:

Acceptance criteria check:

- [x] `package.json` exists and uses pnpm-compatible scripts.
- [x] TypeScript config exists and supports compiling `src/`.
- [x] Source directory exists with a minimal entrypoint.
- [x] The project can install dependencies and run a build command.

Scope check:

- Passed. No Commander command skeletons were added.
- Passed. No `.nerv/` state was created.
- Passed. No SQLite or persistence code was added.
- `.gitignore` was updated to keep `agent-workspace/` trackable and ignore generated/local files.

Validation check:

Commands performed:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
node dist/index.js
git status --short --branch
git ls-files --others --exclude-standard
git status --short --ignored
```

Results:

- Install: passed. Lockfile is up to date.
- Build: passed.
- Typecheck: passed.
- CLI smoke check: passed.
- Git status: available. Repo is initialized with no commits yet on `main`.
- Ignored files: `dist/` and `node_modules/` are ignored.
- Trackable files: `.gitignore`, `agent-workspace/`, `package.json`, `pnpm-lock.yaml`, `src/`, and `tsconfig.json`.
- Lint: not run because no lint script exists for TASK-001.
- Test: not run because no test script exists for TASK-001.

Git diff check:

- There is no prior commit, so Git reports first-commit untracked files rather than a normal diff.
- The first commit should include `agent-workspace/` because it is the current MVP planning and work-history source.
- Generated files `dist/` and `node_modules/` are not commit candidates.

Risks:

- Package metadata may need refinement before publishing.
- The first commit will include both initial planning workspace files and TASK-001 package foundation files unless the user chooses selective staging.

Evidence:

- `pnpm build` compiles successfully.
- `pnpm typecheck` passes with strict TypeScript settings.
- `node dist/index.js` prints the expected foundation message.
- Git ignore behavior matches the recommended policy.

Review result:

- Ready to commit. No code changes required for TASK-001.

Suggested commit message:

```txt
TASK-001 Initialize TypeScript package foundation
```

## Close summary

Pending.
