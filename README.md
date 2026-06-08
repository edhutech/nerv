# Nerv

Nerv is a local-first Agent Work Harness for developers who work with coding agents.

## Development Validation

Current validation scripts:

- `pnpm build`: compile TypeScript.
- `pnpm typecheck`: type-check without emitting files.
- `pnpm smoke`: run CLI smoke checks against the built `dist/index.js`.
- `pnpm validate`: run build, typecheck and smoke checks together.

No `pnpm test` or `pnpm lint` script exists yet. That is intentional for the current MVP foundation; TASK-003 only adds lightweight CLI smoke validation.
