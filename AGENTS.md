# Agent Notes

## Commands

- Use `pnpm`; the repo declares `packageManager: pnpm@10.33.4`.
- Full validation: `pnpm validate`.
- `pnpm validate` runs `pnpm build && pnpm typecheck && pnpm smoke` in the required order.
- `pnpm smoke` runs `scripts/smoke-cli.mjs` against built `dist/index.js`; run `pnpm build` first if you are not using `pnpm validate`.
- There is no `pnpm test` or `pnpm lint` script yet; do not report them as missing work unless the task asks for them.

## Architecture

- This is a Node.js TypeScript ESM CLI; the runtime entrypoint is `src/index.ts`, compiled to `dist/index.js` for the `nerv` bin.
- TypeScript uses `module: NodeNext`; local TS imports should use `.js` specifiers, matching existing files.
- SQLite is the source of truth for work state. Schema bootstrap and migration checks live in `src/database.ts`; repository access lives in `src/repository.ts`.
- `.nerv/` is generated local workspace state and is gitignored. Commands should create or read it through workspace/repository helpers, not assume it exists.
- Generated Markdown is the human/agent interface; SQLite remains the durable state.

## Repo Workflow

- `agent-workspace/` is a manual planning workspace for building the MVP, not the product runtime. Keep task/run/build notes there separate from CLI code in `src/`.
- When implementing a planned task, update the matching `agent-workspace/tasks/TASK-*.md` and `agent-workspace/runs/RUN-*.md` evidence if the task workflow requires it.
- `dist/` is ignored build output. Do not edit it manually.

## Smoke Test Gotchas

- Smoke tests create temporary Git repos and initialized `.nerv/` workspaces; avoid hard-coding paths outside the temp repo.
- If generated `run.md` links change, add smoke assertions for the exact links. Relative links are easy to break from `.nerv/agent/runs/RUN-###/run.md`.
