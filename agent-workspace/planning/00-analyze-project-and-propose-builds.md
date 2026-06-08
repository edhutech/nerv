# Analyze Nerv MVP and Propose Agentic Builds

You are helping build the real Nerv MVP.

This folder is only a temporary agent workspace. Do not treat Markdown as the final product.

## Your task

Analyze the product documents and the current repo, then propose the Agentic Builds needed to build the real Nerv MVP.

## Read first

- `agent-workspace/START-HERE.md`
- `agent-workspace/product/product.md`
- `agent-workspace/product/vision.md`
- `agent-workspace/product/mvp.md`
- `agent-workspace/product/user.md`
- `agent-workspace/product/stack.md`
- `agent-workspace/product/architecture.md`
- `agent-workspace/product/development.md`
- `agent-workspace/product/decisions.md`
- `agent-workspace/product/glossary.md`
- `agent-workspace/method/build-template.md`

## Inspect the repo

Before proposing Builds, inspect the current project structure.

Look for:

- `package.json`
- `pnpm-lock.yaml`
- `tsconfig.json`
- existing `src/` folder
- existing CLI files
- existing tests
- existing config
- current Git status if available

## Important rules

Do not create Agentic Tasks yet.

Do not implement anything.

Only propose Builds.

Each Build should represent a meaningful part of the real MVP.

A Build should be large enough to group several Agentic Tasks, but not so large that it becomes the entire product.

## The real MVP to build

The MVP is a local-first CLI with:

- Node.js
- TypeScript
- Commander
- SQLite with better-sqlite3
- No ORM
- Agent-facing Markdown generated from state
- Agentic Builds
- Agentic Tasks
- Runs
- Checkpoints
- Reviews
- Close
- Basic Git awareness
- Product evolution memory

## Suggested Build areas

Consider Builds such as:

- Project and CLI foundation
- Local `.nerv/` structure
- SQLite schema and repository layer
- Product context flow
- Agentic Build and Task creation
- Scope check
- Run generation and `run.md`
- Checkpoint flow
- Review and Git-aware close flow
- List and status commands

Do not force this exact list. Use the actual repo state.

## Output format

Return proposed Builds using this structure:

```md
# Proposed Agentic Builds for Nerv MVP

## BUILD-001: Build name

### Goal

...

### Why this matters

...

### Scope

- ...
- ...

### Out of scope

- ...
- ...

### Expected output

- ...
- ...

### Related commands

- `nerv ...`

### Acceptance criteria

- ...
- ...

### Risks

- ...
- ...

### Suggested order

Explain when this Build should be done.
```

## Approval rule

After proposing the Builds, stop.

Do not create files.

Do not create Tasks.

Wait for the user to approve, edit or reject the proposed Builds.
