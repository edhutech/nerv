# RUN-001

## Active Task

TASK-001: Initialize TypeScript Package Foundation

## Parent Build

BUILD-001

## Primary context

Read first:

- `../tasks/TASK-001-initialize-typescript-package-foundation.md`

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

Initialize the minimal Node.js, TypeScript and pnpm package foundation for Nerv.

Create only the files needed for `TASK-001`: package metadata, TypeScript configuration, a minimal source entrypoint and basic ignore rules if needed.

## Files to inspect first

- `agent-workspace/tasks/TASK-001-initialize-typescript-package-foundation.md`
- `agent-workspace/builds/BUILD-001-project-and-cli-foundation.md`
- `agent-workspace/product/stack.md`
- `agent-workspace/product/development.md`
- Current repo root

## Expected implementation plan

- Confirm the repo root has no existing package foundation to preserve.
- Create `package.json` with pnpm-oriented scripts for `build` and `typecheck`.
- Create `tsconfig.json` targeting a modern Node.js TypeScript CLI.
- Create a minimal `src/` entrypoint that can compile successfully.
- Add `.gitignore` entries for common Node.js build artifacts if no ignore file exists.
- Avoid adding Commander command skeletons, SQLite, `.nerv/` behavior or lifecycle command logic.

## Validation plan

- Run `pnpm install`.
- Run `pnpm build`.
- Run `pnpm typecheck` if it is separate from build.
- Report clearly if any command is unavailable or fails because of the local environment.

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
- Do not implement Commander command skeletons for TASK-002.
- Do not create `.nerv/` state or SQLite schema.

## Completion checklist

Before finishing this Run, provide:

- What changed
- Files touched
- Decisions made
- Validation performed
- Pending work
- Suggested next step
- Suggested commit message
