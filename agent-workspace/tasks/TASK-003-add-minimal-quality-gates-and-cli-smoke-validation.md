# TASK-003: Add Minimal Quality Gates And CLI Smoke Validation

## Status

Reviewed

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

Implemented RUN-003 on 2026-06-07.

What changed:

- Added a lightweight CLI smoke validation script at `scripts/smoke-cli.mjs`.
- Added `pnpm smoke` for repeatable CLI smoke checks.
- Added `pnpm validate` to run build, typecheck and smoke checks together.
- Added `README.md` development validation notes.
- Documented that `pnpm test` and `pnpm lint` are intentionally not present yet.

Files touched:

- `package.json`
- `README.md`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-003-add-minimal-quality-gates-and-cli-smoke-validation.md`
- `agent-workspace/runs/RUN-003-task-003-add-minimal-quality-gates-and-cli-smoke-validation.md`
- `agent-workspace/builds/BUILD-001-project-and-cli-foundation.md`

Decisions made:

- Use a plain Node.js smoke script instead of adding a test framework.
- Keep `pnpm build` and `pnpm typecheck` as core validation.
- Do not add `pnpm test` or `pnpm lint` yet because TASK-003 only needs lightweight smoke validation.
- Smoke checks target the built `dist/index.js`, so validation does not depend on global installation.

Validation performed:

- `pnpm install --frozen-lockfile` passed.
- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed.
- `pnpm validate` passed.

Pending work:

- Commit TASK-003 once the user approves committing.
- Close TASK-003 after commit.

## Review

Reviewed on 2026-06-07.

Acceptance criteria check:

- [x] Build command passes.
- [x] CLI help can be smoke-tested.
- [x] Missing optional scripts are reported honestly.
- [x] BUILD-001 acceptance criteria can be checked end to end.

Scope check:

- Passed. The work stayed within development validation scope.
- No test framework was added.
- No lint tooling was added.
- No CI setup or Git hooks were added.
- No `.nerv/` state, SQLite, persistence or real command behavior was added.

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
git diff --stat
git diff -- package.json README.md scripts/smoke-cli.mjs
git ls-files --others --exclude-standard
git status --short --ignored
```

Results:

- Install: passed. Lockfile is up to date.
- Build: passed.
- Typecheck: passed.
- Smoke: passed.
- Validate: passed.
- Test: not present. `pnpm run test` reports missing script, as intentionally documented.
- Lint: not present. `pnpm run lint` reports missing script, as intentionally documented.
- Ignored generated files: `dist/` and `node_modules/` remain ignored.

Smoke coverage:

- Top-level help lists MVP command groups.
- `init --help` works.
- `status --help` works.
- `new --help` exposes `task` and `build`.
- `build --help` exposes `plan`.
- `status` placeholder command exits with code `1` and an explicit not-implemented message.

Git diff check:

- Modified files: `package.json`, `agent-workspace/tasks/TASK-003-add-minimal-quality-gates-and-cli-smoke-validation.md`, `agent-workspace/builds/BUILD-001-project-and-cli-foundation.md`.
- Added files: `README.md`, `scripts/smoke-cli.mjs`, `agent-workspace/runs/RUN-003-task-003-add-minimal-quality-gates-and-cli-smoke-validation.md`.
- No dependency lockfile change was needed because no dependencies were added.

Risks:

- Smoke checks assert selected help text, so they may need updates when real command behavior or descriptions change.
- `pnpm smoke` expects `dist/index.js` to already exist; `pnpm validate` runs build first and should be the normal full validation command.

Evidence:

- `pnpm validate` runs build, typecheck and smoke checks together successfully.
- `README.md` documents available validation scripts and explicitly notes that `test` and `lint` are intentionally absent.
- `scripts/smoke-cli.mjs` uses the built local CLI, so validation does not depend on global installation.

Review result:

- Ready to commit. No remaining changes required for TASK-003.

Suggested commit message:

```txt
TASK-003 Add CLI smoke validation
```

## Close summary

Pending.
