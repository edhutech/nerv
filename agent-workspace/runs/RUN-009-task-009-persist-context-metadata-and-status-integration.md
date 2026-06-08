# RUN-009

## Status

Complete

## Active Task

TASK-009: Persist Context Metadata And Status Integration

## Parent Build

BUILD-003

## Primary context

Read first:

- `../tasks/TASK-009-persist-context-metadata-and-status-integration.md`

## Supporting context

Read only if needed:

- `../product/architecture.md`
- `../product/stack.md`
- `../builds/BUILD-003-product-and-repo-context-flow.md`

## Scope rule

The Agentic Task is the execution scope. The Agentic Build provides shared context, but it does not expand the scope of this Run.

## What to do now

Persist context metadata and expose context availability for future run generation.

## Files to inspect first

- `src/repository.ts`
- `src/product.ts`
- `src/repo-context.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`

## Validation plan

- Run `pnpm build`.
- Run `pnpm typecheck`.
- Run `pnpm smoke`.
- Verify product/repo metadata, decision persistence and status context output.

## Do not do

- Do not implement run generation.
- Do not add rich markdown parsing.
- Do not add schema migrations.

## Completion summary

Completed retrospectively on 2026-06-08.

What changed:

- Added `src/context.ts` with `discoverContext()`.
- Persisted product and repo context timestamps in SQLite metadata.
- Persisted product decisions from `decisions.md` using coarse `###` heading extraction.
- Cleared stale decision rows when headings are removed.
- Updated `nerv status` to show product and repo context availability.

Files touched:

- `src/context.ts`
- `src/product.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `README.md`
- `agent-workspace/tasks/TASK-009-persist-context-metadata-and-status-integration.md`
- `agent-workspace/builds/BUILD-003-product-and-repo-context-flow.md`
- `agent-workspace/runs/RUN-009-task-009-persist-context-metadata-and-status-integration.md`

Decisions made:

- Store context freshness in the existing metadata table.
- Keep markdown as the source of truth and persist only coarse decision headings.

Validation performed:

- `pnpm validate`
- Targeted stale-decision clearing regression

Pending work:

- None for RUN-009.

Commit:

```txt
1363723 TASK-009 Persist context metadata and status integration
```
