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
- Shared current product truth is `.nerv-context/product.md`; shared durable repository truth is `.nerv-context/repo.md`. Generated Repo observations, operational state, and active Markdown remain local under `.nerv/`. Nerv does not own general-purpose memory, code intelligence, or discovery records.
- The runtime CLI is agent agnostic. It must not launch, control, route, or require coding agents or models.
- Work Items have UUID stable IDs and repository-local `WORK-###` refs. Tasks have UUID identities and positions scoped to their Work Item, with no global `TASK-###` ref. Git trailers are `Nerv-Work` (UUID) and `Nerv-Work-Ref` (friendly ref). SQLite allocates refs normally; a fresh `.nerv/` may seed its initial allocator from valid paired trailers reachable from current `HEAD`, without deriving identity from Git.
- `.nerv/` is gitignored, generated workspace state. Create and access it through `workspace.ts` and repository helpers, never by assuming it exists or editing `dist/`.

## Lifecycle Boundaries

- The normal lifecycle is Work Item planning, human approval, Task execution, validation, Work Review, and Git-safe close. Checkpoints are exceptional recovery evidence.
- Do not add a standalone Task lifecycle, Runs, Builds, Intake, Proposal, formal Task Review, or Task Close behavior.
- One Work Item produces one reviewed atomic commit by default. Never blindly stage the whole working tree when unrelated changes may exist.
- `nerv-dev` is the agent workflow protocol for developing this repository. It interprets workflow requests over the runtime primitives; it is not a second lifecycle, database, engine, or host-specific orchestrator.

## Smoke Test Gotchas

- Smoke tests create temporary Git repos and initialized `.nerv/` workspaces; never hard-code paths outside the temporary repo.
- Active Work Item Markdown belongs under `.nerv/agent/active/` and is temporary. Assert its creation, synchronization, and removal where relevant.
