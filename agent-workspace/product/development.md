# Development Rules

This file describes how the Nerv repo should be developed.

## Package manager

Use `pnpm`.

## Runtime

Use Node.js.

## Language

Use TypeScript.

## CLI framework

Use Commander for the MVP.

## Database

Use SQLite with `better-sqlite3`.

Do not use an ORM in the MVP.

## Code style

Prefer small modules with clear responsibilities.

Avoid building advanced abstractions before the MVP flow works end to end.

## MVP priority

Build the thinnest useful vertical slice:

1. Initialize `.nerv/`.
2. Create product docs.
3. Create Agentic Task.
4. Create Agentic Build when needed.
5. Start a Run.
6. Generate `run.md`.
7. Save checkpoint.
8. Review.
9. Close.
10. Update product evolution.

## Testing and validation

When available, run:

```bash
pnpm lint
pnpm test
pnpm build
```

If one of these scripts does not exist, the agent should report that clearly instead of inventing validation.

## Sensitive areas

Be careful with:

- Database schema and migrations
- File writes inside the repo
- Commands that delete files
- Git operations
- Generated agent files
- User product docs

## Agent instruction

Before making changes, inspect the relevant files.

Do not implement future features while working on MVP tasks.
