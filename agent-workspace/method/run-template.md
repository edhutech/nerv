# Deprecated Run Template

This template is historical only.

The manual `agent-workspace` workflow no longer creates Run files. Use `agent-workspace/method/task-template.md` and record active work directly in the Task file.

The old template is kept below only to preserve historical context.

# RUN-ID

## Active Task

TASK-ID: Task Title

## Parent Build

BUILD-ID

## Primary context

Read first:

- `../tasks/TASK-ID.md`

## Supporting context

Read only if needed:

- `../product/product.md`
- `../product/mvp.md`
- `../product/stack.md`
- `../product/architecture.md`
- `../product/decisions.md`
- `../product/development.md`
- `../builds/BUILD-ID.md`

## Scope rule

The Agentic Task is the execution scope.

The Agentic Build provides shared context, but it does not expand the scope of this Run.

If the Build and Task conflict, follow the Task.

## What to do now

Describe the immediate action the agent should take.

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

## Completion checklist

Before finishing this Run, provide:

- What changed
- Files touched
- Decisions made
- Validation performed
- Pending work
- Suggested next step
- Suggested commit message
