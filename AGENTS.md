# Agent Notes

## Commands

- Use `pnpm` (the pinned package manager is `pnpm@10.33.4`) with Node.js >= 20.
- Run `pnpm validate` for full verification; its required order is build, typecheck, then smoke.
- `pnpm smoke` exercises built `dist/index.js`; run `pnpm build` first when invoking smoke alone.
- There are intentionally no `test` or `lint` scripts.

## Architecture

- This is a Node.js TypeScript ESM CLI; the runtime entrypoint is `src/index.ts`, compiled to `dist/index.js` for the `nerv` bin.
- TypeScript uses `module: NodeNext`; local TS imports should use `.js` specifiers, matching existing files.
- SQLite is the durable operational source of truth. Work Items govern work, Tasks belong to Work Items, and Markdown is only minimal temporary active context.
- Product Context and Repo Context are canonical long-lived context. Durable discovered knowledge is small and searchable; do not replace it with historical Markdown dumps.
- The runtime CLI is agent agnostic. It must not launch, control, route, or require coding agents or models.
- `.nerv/` is gitignored, generated workspace state. Create and access it through `workspace.ts` and repository helpers, never by assuming it exists or editing `dist/`.

## vNext Boundaries

- The normal lifecycle is Work Item planning, human approval, Task execution, validation, Work Review, and Git-safe close. Checkpoints are exceptional recovery evidence.
- Do not add a standalone Task lifecycle, Runs, Builds, Intake, Proposal, formal Task Review, or Task Close behavior.
- One Work Item produces one reviewed atomic commit by default. Never blindly stage the whole working tree when unrelated changes may exist.
- `nerv-dev` is the agent workflow protocol for developing this repository. It interprets workflow requests over the runtime primitives; it is not a second lifecycle, database, engine, or host-specific orchestrator.

## Smoke Test Gotchas

- Smoke tests create temporary Git repos and initialized `.nerv/` workspaces; never hard-code paths outside the temporary repo.
- Active Work Item Markdown belongs under `.nerv/agent/active/` and is temporary. Assert its creation, synchronization, and removal where relevant.
