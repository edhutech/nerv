# Repository

## Stack

Node.js TypeScript ESM CLI using Commander and SQLite through `node:sqlite`. Build and validation use pnpm.

## Architecture

- `src/index.ts` defines the CLI and lifecycle primitive handlers.
- `src/repository.ts` and `src/database.ts` own SQLite operational persistence and schema.
- `src/workspace.ts` owns local workspace setup and managed public-skill installation.
- `src/work.ts` maintains temporary active Work context and lifecycle recommendations.
- `src/context.ts` reports canonical shared context availability.

## Important paths

- `.agents/skills/nerv/SKILL.md`: managed public Nerv skill.
- `AGENTS.md` and `CLAUDE.md`: discovery-only bridges established when absent or alongside custom instructions; they are not canonical setup paths and ownership-safe removal preserves custom or ambiguous content.
- `test/`: focused built-CLI regression coverage in temporary Git repositories.

## Development rules

- Use NodeNext TypeScript with `.js` local import specifiers.
- Use `pnpm`; the complete verification gate is `pnpm validate`.
- For self-development CLI execution, use `pnpm cli -- <arguments>`; it rebuilds and runs the current repository `dist/index.js` without PATH-based `nerv` resolution.
- Public package identity is `@edhutech/nerv`; the installed CLI binary remains `nerv`.
- Support Node.js `>=22.14.0 <23` or `>=24.11.0 <25`. Package builds run through `prepack`; `pnpm test:package` validates the generated tarball in an isolated installation.
- Nerv commits use Conventional Commit subjects; this is repository authority, not runtime policy.
- OpenCode, Codex, and Cursor natively discover `AGENTS.md` and `.agents/skills`; Claude Code uses its optional bridge. No host affects runtime state or lifecycle.
- `.github/workflows/ci.yml` uses read-only SHA-pinned GitHub Actions for Node 22.14.0 and 24.11.0 minimums on Linux, Node 24.19.0 on macOS and Windows, and package E2E once on Linux Node 24.11.0. It never publishes.
- `README.md` is the developer landing page; detailed product documentation belongs to a future dedicated documentation experience, while this repository keeps onboarding and maintenance material close to the code.
- `.github/workflows/publish.yml` publishes only from a published GitHub Release, after package validation, through npm Trusted Publishing with OIDC and provenance. npmjs.com is the public registry.
- Do not edit generated `dist/` or local `.nerv/` state directly.

## Generated and local state

`.nerv/` is local operational state and temporary active context, excluded through Git's repository-local exclude mechanism. A delimited Nerv-owned exclusion block may be removed by uninstall; legacy unmarked exclusions are preserved. `.nerv-context/` is tracked shared context; `product.md` and `repo.md` are its only canonical current-truth files. Before every new Work, those files and the managed public skill must be committed and clean at `HEAD`.

## Validation

`pnpm validate` runs build, typecheck, then test. `pnpm test` exercises built `dist/index.js`.

Fresh-session REWORK recovery must use `nerv work show <work-ref>` before requesting approval; compact status and active context alone do not reconstruct durable findings or remediation facts.

## Repository invariants

The runtime is agent agnostic and does not control agents. Work UUID identities and repository-local `W-` plus 16 uppercase hexadecimal characters deterministically derived from the UUID are distinct; refs are never allocated sequentially from history. Tasks are positioned within their Work Item. The first Task activates automatically and completion activates the next. Review and Close stage explicit Work paths only, block new unattributed changes, and discover untracked paths through repository `.gitignore` rules rather than mutable local Git exclusions.

CI uses a shallow checkout; regression tests must be self-contained and must not depend on historical tags, remote access, or deep Git history.

Managed public artifacts use one current identity; modified or unknown content is preserved rather than treated as a supported historical release.
