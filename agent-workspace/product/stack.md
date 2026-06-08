# Nerv Stack

## MVP stack

- Runtime: Node.js
- Language: TypeScript
- Package manager: pnpm
- CLI framework: Commander
- Local database: SQLite
- SQLite package: better-sqlite3
- ORM: none for MVP
- Agent-facing files: Markdown
- License: Apache-2.0

## Main decision

SQLite is the source of truth.

Markdown is the interface for humans and agents.

```txt
SQLite = Nerv memory and state
Markdown = generated, readable context for agents and stable product docs
```

## Local database path

```txt
.nerv/nerv.db
```

## Stable human docs

```txt
.nerv/product/product.md
.nerv/product/problem.md
.nerv/product/users.md
.nerv/product/prd.md
.nerv/product/roadmap.md
.nerv/product/scope.md
.nerv/product/decisions.md
.nerv/product/architecture.md
.nerv/product/evolution.md
.nerv/repo/development.md
```

## Agent-facing generated files

```txt
.nerv/agent/runs/RUN-001/run.md
.nerv/agent/runs/RUN-001/task.md
.nerv/agent/builds/BUILD-001.md
```

## Useful libraries

Potential libraries for MVP:

- `commander`
- `better-sqlite3`
- `zod`
- `gray-matter`
- `fast-glob`
- `@inquirer/prompts`
- `picocolors` or `chalk`
- `execa`
- `simple-git`

## Repo analysis for MVP

The MVP should use lightweight repo analysis only:

- Folder structure
- Package and config files
- Scripts
- Git status
- Git diff
- Simple file search
- Tests detected
- Sensitive areas detected from docs and file paths

## Not for MVP

Do not include:

- Prisma
- Drizzle
- Supabase
- Postgres
- Vector DB
- Deep Tree-sitter graph
- MCP server
- TUI
- Cloud services
