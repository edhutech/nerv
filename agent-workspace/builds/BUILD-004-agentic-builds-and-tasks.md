# BUILD-004: Agentic Builds And Tasks

## Status

Approved

## Build Goal

Implement creation and planning of Agentic Builds and Agentic Tasks.

## Why this Build matters for the Nerv MVP

This is the core structure that turns vague intent into scoped, verifiable work.

## User value

Developers can turn an idea into a practical Build or Task with scope, acceptance criteria and validation expectations.

## Product area

Agentic Task system

## Scope

This Build includes:

- Implement `nerv new task "..."`.
- Implement `nerv new build "..."`.
- Implement `nerv build plan BUILD-001`.
- Store scope, out-of-scope, acceptance criteria, validation, risks and relationships.
- Add a simple heuristic for detecting when intent is too large and should become a Build.
- Add confirmation before turning large intent into a Build.

## Out of scope

This Build does not include:

- Automatic AI planning.
- Complex estimation.
- Team workflows.
- Run generation.

## Expected output

By the end of this Build, the repo should have:

- Stored Agentic Builds.
- Stored Agentic Tasks.
- Build-to-task relationships.
- Basic generated build and task Markdown where useful.
- Queryable task and build records.

## Related MVP commands

- `nerv new task "..."`
- `nerv new build "..."`
- `nerv build plan BUILD-001`
- `nerv tasks [query]`
- `nerv builds [query]`

## Suggested Agentic Tasks

Do not complete this section until the Build is approved.

- TASK-001:
- TASK-002:
- TASK-003:

## Acceptance criteria

The Build is complete when:

- A user can create a task from intent.
- A user can create a build from larger intent.
- Tasks remain the execution scope.
- Build context does not override task scope.
- Lists and queries can find created work.

## Validation

The Build should be validated by:

- `pnpm build`
- `pnpm test` if a test script exists.
- Manual creation of a Build.
- Manual creation of a Task.
- Manual query of created Builds and Tasks.

## Risks

- Scope detection may be crude in the MVP.
- Too much planning automation could exceed the MVP.
- Generated task content must not imply false certainty.

## Dependencies

- BUILD-001: Project And CLI Foundation.
- BUILD-002: Local Workspace And SQLite State.
- BUILD-003: Product And Repo Context Flow.

## Notes

If Task scope and Build context conflict, the Task must win.
