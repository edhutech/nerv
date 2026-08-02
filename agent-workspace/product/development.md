# Development Rules

This file describes how the Nerv repo should be developed.

## Package manager

Use `pnpm@10.33.4`.

## Runtime

Use Node.js 20 or later.

## Language

Use TypeScript.

This is a Node.js ESM CLI. Use NodeNext module resolution and `.js` specifiers for local TypeScript imports.

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
3. Generate repository-development context.
4. Create Agentic Task.
5. Create Agentic Build when needed.
6. Start a Run.
7. Generate `run.md`.
8. Save checkpoint.
9. Review.
10. Close and update product evolution.

## Testing and validation

Run the full validation command:

```bash
pnpm validate
```

It runs the available scripts in this required order:

```bash
pnpm build
pnpm typecheck
pnpm smoke
```

`pnpm smoke` runs `scripts/smoke-cli.mjs` against built `dist/index.js`. Run `pnpm build` first when invoking `pnpm smoke` directly.

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
