# Repository

## Stack

Node.js TypeScript ESM CLI using Commander and SQLite through better-sqlite3. Build and validation use pnpm.

## Architecture

- `src/index.ts` defines the CLI and lifecycle primitive handlers.
- `src/repository.ts` and `src/database.ts` own SQLite operational persistence and schema.
- `src/workspace.ts` owns local workspace setup and managed public-skill installation.
- `src/work.ts` maintains temporary active Work context and lifecycle recommendations.
- `src/context.ts`, `src/product.ts`, and `src/repo-context.ts` manage shared and generated context.

## Important paths

- `.agents/skills/nerv/SKILL.md`: managed public Nerv skill.
- `.agents/skills/nerv-development/SKILL.md`: development protocol for this repository.
- `scripts/smoke.mjs`: built-CLI smoke and E2E coverage in temporary Git repositories.

## Development rules

- Use NodeNext TypeScript with `.js` local import specifiers.
- Use `pnpm`; the complete verification gate is `pnpm validate`.
- Do not edit generated `dist/` or local `.nerv/` state directly.

## Generated and local state

`.nerv/` is ignored local operational state, generated repository observations, and temporary active context. `.nerv-context/` is tracked shared context; `product.md` and `repo.md` are its canonical current-truth files. Promoted Knowledge remains tracked separately under `.nerv-context/knowledge/`.

## Validation

`pnpm validate` runs build, typecheck, then smoke. `pnpm smoke` exercises built `dist/index.js`.

## Repository invariants

The runtime is agent agnostic and does not control agents. Work UUID identities and local `WORK-###` references are distinct; Tasks are positioned within their Work Item. Close selectively stages attributable paths only.
