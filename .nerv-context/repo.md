# Repository

## Stack

Node.js TypeScript ESM CLI using Commander and SQLite through better-sqlite3. Build and validation use pnpm.

## Architecture

- `src/index.ts` defines the CLI and lifecycle primitive handlers.
- `src/repository.ts` and `src/database.ts` own SQLite operational persistence and schema.
- `src/workspace.ts` owns local workspace setup and managed public-skill installation.
- `src/work.ts` maintains temporary active Work context and lifecycle recommendations.
- `src/context.ts` reports canonical shared context availability.

## Important paths

- `.agents/skills/nerv/SKILL.md`: managed public Nerv skill.
- `CLAUDE.md`: minimal Claude Code bridge to `AGENTS.md` and the canonical skill.
- `test/`: focused built-CLI regression coverage in temporary Git repositories.

## Development rules

- Use NodeNext TypeScript with `.js` local import specifiers.
- Use `pnpm`; the complete verification gate is `pnpm validate`.
- Public package identity is `@edhutech/nerv`; the installed CLI binary remains `nerv`.
- Support Node.js 22 and 24 LTS. Package builds run through `prepack`; `pnpm test:package` validates the generated tarball in an isolated installation.
- Nerv commits use Conventional Commit subjects; this is repository authority, not runtime policy.
- OpenCode, Codex, and Cursor natively discover `AGENTS.md` and `.agents/skills`; Claude Code uses the managed bridge. No host affects runtime state or lifecycle.
- `.github/workflows/ci.yml` uses read-only SHA-pinned GitHub Actions for Linux Node 22/24, macOS Node 24, and Windows Node 24. It runs package E2E once on Linux Node 24 and never publishes.
- Do not edit generated `dist/` or local `.nerv/` state directly.

## Generated and local state

`.nerv/` is local operational state and temporary active context, excluded through Git's repository-local exclude mechanism. `.nerv-context/` is tracked shared context; `product.md` and `repo.md` are its only canonical current-truth files. Before every new Work, those files and the managed public skill must be committed and clean at `HEAD`.

## Validation

`pnpm validate` runs build, typecheck, then test. `pnpm test` exercises built `dist/index.js`.

## Repository invariants

The runtime is agent agnostic and does not control agents. Work UUID identities and repository-local `WORK-###` references are distinct; Tasks are positioned within their Work Item. SQLite allocates friendly refs while local state exists; fresh local state seeds only from valid paired Nerv trailers reachable from current `HEAD`. This is not distributed uniqueness, and no-diff Work refs cannot be reconstructed after local state is discarded. The first Task activates automatically and completion activates the next. Close stages explicit Work paths only and blocks new unattributed changes.
