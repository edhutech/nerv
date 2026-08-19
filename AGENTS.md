# Agent Notes

## Commands

- Use `pnpm` (the pinned package manager is `pnpm@10.33.4`) with Node.js `>=22.14.0 <23` or `>=24.11.0 <25`.
- Run `pnpm validate` for full verification; its required order is build, typecheck, then test.
- `pnpm test` exercises built `dist/index.js`; run `pnpm build` first when invoking it alone.
- There is intentionally no `lint` script.
- Use Conventional Commit subjects for Nerv commits; scopes are optional when useful.

## Architecture

- This is a Node.js TypeScript ESM CLI; the runtime entrypoint is `src/index.ts`, compiled to `dist/index.js` for the `nerv` bin.
- TypeScript uses `module: NodeNext`; local TS imports should use `.js` specifiers, matching existing files.
- SQLite is the durable operational source of truth. Work Items govern work, Tasks belong to Work Items, and Markdown is only minimal temporary active context.
- Canonical tracked context is `.nerv-context/product.md` and `.nerv-context/repo.md`. `.nerv/` contains local operational state and temporary active Markdown. Nerv does not own general-purpose memory, code intelligence, or discovery records.
- The runtime CLI is agent agnostic. It must not launch, control, route, or require coding agents or models.
- `.agents/skills/nerv/SKILL.md` is the managed public Nerv skill and the sole Nerv workflow contract.
- Work Items have UUID stable IDs and repository-local `W-` plus 16 uppercase hexadecimal characters deterministically derived from the Work UUID. Tasks have UUID identities and positions scoped to their Work Item, with no global `TASK-###` ref. Git trailers are `Nerv-Work` (UUID) and `Nerv-Work-Ref` (friendly ref); refs are not sequential or history-allocated.
- `.nerv/` is local generated workspace state, excluded through Git's repository-local exclude mechanism. Create and access it through `workspace.ts` and repository helpers, never by assuming it exists or editing `dist/`.

## Test Gotchas

- Regression tests create temporary Git repos and initialized `.nerv/` workspaces; never hard-code paths outside the temporary repo.
- Active Work Item Markdown belongs under `.nerv/agent/active/` and is temporary. Assert its creation, synchronization, and removal where relevant.

<!-- Nerv managed discovery bridge -->
For Nerv-governed work, read `.agents/skills/nerv/SKILL.md` and follow it.
<!-- End Nerv managed discovery bridge -->
