# Nerv

Nerv is a local-first Agent Work Harness for developers who work with coding agents.

## Current CLI Foundation

- `nerv init` creates repo-local `.nerv/` workspace directories and bootstraps `.nerv/nerv.db` with the initial SQLite schema.
- `nerv status` reports whether the current Git repo is initialized.
- `nerv product` scaffolds stable human-editable product context files under `.nerv/product/`.

## Development Validation

Current validation scripts:

- `pnpm build`: compile TypeScript.
- `pnpm typecheck`: type-check without emitting files.
- `pnpm smoke`: run CLI smoke checks against the built `dist/index.js`.
- `pnpm validate`: run build, typecheck and smoke checks together.

No `pnpm test` or `pnpm lint` script exists yet. That is intentional for the current MVP foundation; TASK-003 only adds lightweight CLI smoke validation.
