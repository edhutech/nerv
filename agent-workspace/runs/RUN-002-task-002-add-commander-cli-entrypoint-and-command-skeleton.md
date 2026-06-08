# RUN-002

## Status

Complete

## Active Task

TASK-002: Add Commander CLI Entrypoint And Command Skeleton

## Parent Build

BUILD-001

## Primary context

Read first:

- `../tasks/TASK-002-add-commander-cli-entrypoint-and-command-skeleton.md`

## Supporting context

Read only if needed:

- `../product/product.md`
- `../product/mvp.md`
- `../product/stack.md`
- `../product/architecture.md`
- `../product/decisions.md`
- `../product/development.md`
- `../builds/BUILD-001-project-and-cli-foundation.md`

## Scope rule

The Agentic Task is the execution scope.

The Agentic Build provides shared context, but it does not expand the scope of this Run.

If the Build and Task conflict, follow the Task.

## What to do now

Add the Commander-based `nerv` CLI entrypoint and MVP command skeletons.

The command skeletons should expose the MVP command surface and clearly report placeholder behavior without implementing lifecycle functionality.

## Files to inspect first

- `agent-workspace/tasks/TASK-002-add-commander-cli-entrypoint-and-command-skeleton.md`
- `agent-workspace/builds/BUILD-001-project-and-cli-foundation.md`
- `agent-workspace/product/mvp.md`
- `agent-workspace/product/decisions.md`
- `package.json`
- `src/`

## Expected implementation plan

- Inspect the existing TASK-001 package foundation.
- Add `commander` as a runtime dependency.
- Replace or wrap the minimal `src/index.ts` entrypoint with a Commander program.
- Keep the package binary as `nerv` pointing to `./dist/index.js` unless there is a clear reason to change it.
- Add command shells for `init`, `product`, `new task`, `new build`, `build plan`, `start`, `current`, `checkpoint`, `review`, `close`, `tasks`, `builds`, `runs`, `status` and `clean`.
- Use clear placeholder output for command actions, such as stating the command is not implemented yet.
- Keep files/modules minimal; avoid a large command framework unless it is needed for clarity.

## Validation plan

- Run `pnpm install` after adding Commander.
- Run `pnpm build`.
- Run `node dist/index.js --help`.
- Run `node dist/index.js init --help`.
- Run `node dist/index.js status --help`.
- Run one placeholder command and confirm it does not pretend to perform real work.

## Expected behavior

The agent should:

- Inspect relevant files first.
- Explain the implementation plan briefly.
- Make only changes related to the task.
- Validate the result.
- Provide checkpoint-ready summary.

## Do not do

- Do not work on unrelated tasks.
- Do not redesign unrelated parts of Nerv.
- Do not implement future features not in the task.
- Do not ignore acceptance criteria.
- Do not run destructive commands without asking.
- Do not create `.nerv/` state.
- Do not add SQLite or persistence.
- Do not implement real lifecycle behavior for any command.
- Do not add Git integration.

## Completion checklist

Before finishing this Run, provide:

- What changed
- Files touched
- Decisions made
- Validation performed
- Pending work
- Suggested next step
- Suggested commit message

## Completion summary

Completed on 2026-06-07.

What changed:

- Added Commander as the CLI framework dependency.
- Implemented the MVP command skeleton surface in `src/index.ts`.
- Added explicit not-implemented behavior for command actions.

Files touched:

- `package.json`
- `pnpm-lock.yaml`
- `src/index.ts`
- `agent-workspace/tasks/TASK-002-add-commander-cli-entrypoint-and-command-skeleton.md`
- `agent-workspace/runs/RUN-002-task-002-add-commander-cli-entrypoint-and-command-skeleton.md`

Decisions made:

- Keep skeleton routing in one file until real command behavior makes extraction worthwhile.
- Keep `nerv` bin pointed at `./dist/index.js`.
- Use failing placeholder actions to avoid implying any lifecycle behavior exists yet.

Validation performed:

- `pnpm build`
- `pnpm typecheck`
- `node dist/index.js --help`
- `node dist/index.js init --help`
- `node dist/index.js status --help`
- `node dist/index.js new --help`
- `node dist/index.js build --help`
- `node dist/index.js status`

Pending work:

- Review TASK-002.

Suggested next step:

- Review TASK-002.

Suggested commit message:

```txt
TASK-002 Add Commander CLI command skeleton
```
