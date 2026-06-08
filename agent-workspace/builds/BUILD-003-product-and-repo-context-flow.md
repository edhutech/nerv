# BUILD-003: Product And Repo Context Flow

## Status

Approved

## Build Goal

Implement product context creation and lightweight repo awareness.

## Why this Build matters for the Nerv MVP

Nerv's promise depends on giving agents useful product and repo context without dumping everything.

## User value

Developers can capture reusable product and repo context once, then use it across focused agent runs.

## Product area

Product context

## Scope

This Build includes:

- Implement `nerv product`.
- Create stable human docs under `.nerv/product/`.
- Create `.nerv/repo/development.md`.
- Store product metadata and decisions in SQLite where useful.
- Add lightweight repo analysis for package files, scripts, folder structure, Git status if available and validation commands.

## Out of scope

This Build does not include:

- Deep code analysis.
- Tree-sitter integration.
- Semantic search.
- Vector database.
- Cloud sync or team context.

## Expected output

By the end of this Build, the repo should have:

- Product docs scaffolded in `.nerv/product/`.
- Repo development context in `.nerv/repo/development.md`.
- Product context and decisions persisted where appropriate.
- Repo summary data usable by later run generation.

## Related MVP commands

- `nerv product`
- `nerv status`

## Suggested Agentic Tasks

- TASK-007: Implement Product Context Scaffold Command
- TASK-008: Add Lightweight Repo Development Context
- TASK-009: Persist Context Metadata And Status Integration

## Progress

- TASK-007: Closed on 2026-06-08.
- TASK-008: Closed on 2026-06-08.
- TASK-009: Planned on 2026-06-08.

## Acceptance criteria

The Build is complete when:

- A user can create baseline product context.
- Existing product docs are not silently overwritten.
- Repo analysis works even when the repo is not a Git repo.
- Context is available to future `run.md` generation.

## Validation

The Build should be validated by:

- `pnpm build`
- `pnpm test` if a test script exists.
- Manual run of `nerv product` in an initialized repo.
- Manual check of generated product and repo docs.

## Risks

- Product flow could become too documentation-heavy.
- Interactive prompts may slow down the MVP if overdone.
- Repo analysis must avoid reading or exposing sensitive content unnecessarily.

## Dependencies

- BUILD-001: Project And CLI Foundation.
- BUILD-002: Local Workspace And SQLite State.

## Notes

The product flow should feel like a developer tool, not a documentation chore.
