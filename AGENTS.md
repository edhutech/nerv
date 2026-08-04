# Agent Notes

## Commands

- Use `pnpm` (the pinned package manager is `pnpm@10.33.4`) with Node.js >= 20.
- Run `pnpm validate` for full verification; its required order is build, typecheck, then smoke.
- `pnpm smoke` exercises built `dist/index.js` through the CLI and Product Context scripts, so run `pnpm build` first when invoking smoke alone.
- There are intentionally no `test` or `lint` scripts.

## Architecture

- This is a Node.js TypeScript ESM CLI; the runtime entrypoint is `src/index.ts`, compiled to `dist/index.js` for the `nerv` bin.
- TypeScript uses `module: NodeNext`; local TS imports should use `.js` specifiers, matching existing files.
- SQLite is the durable source of truth; Markdown is a generated human/agent interface. Keep schema bootstrap and additive migration compatibility in `src/database.ts`, and state access in `src/repository.ts`.
- `.nerv/` is gitignored, generated workspace state. Create and access it through `workspace.ts` and repository helpers, never by assuming it exists or editing `dist/`.

## Manual Planning Workspace

- `agent-workspace/` is the manual workspace for building Nerv itself, separate from the runtime implementation in `src/`.
- For planned work, the selected `agent-workspace/tasks/TASK-*.md` is the active record for checkpoints, review, and close evidence. Do not create or update manual files in `agent-workspace/runs/`; they are historical.
- Before closing a manual task, follow `agent-workspace/method/commit-system.md`; update its Build and product evolution when applicable.

## Smoke Test Gotchas

- Smoke tests create temporary Git repos and initialized `.nerv/` workspaces; never hard-code paths outside the temporary repo.
- If generated `run.md` links change, assert their exact relative paths in smoke coverage; links from `.nerv/agent/runs/RUN-###/run.md` are especially easy to break.
