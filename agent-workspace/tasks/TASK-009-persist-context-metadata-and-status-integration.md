# TASK-009: Persist Context Metadata And Status Integration

## Status

Closed

## Parent Build

BUILD-003

## Task Goal

Persist useful product and repo context metadata in SQLite and expose enough status information for later run generation to discover available context.

## Why this task matters

Markdown files are the human interface, but later Nerv lifecycle commands need structured signals that product and repo context exists, when it was refreshed and which decisions are available.

## Context

BUILD-003 includes storing product metadata and decisions in SQLite where useful, and making context available to future `run.md` generation. BUILD-002 already added the SQLite schema and repository helpers, including metadata access and a decisions table.

## Scope

This task includes:

- Persist product context metadata in SQLite using the existing repository/database layer.
- Record useful context timestamps or version markers in `metadata`.
- Persist product decisions from `.nerv/product/decisions.md` where practical and safe.
- Add helper functions that later run generation can call to discover product and repo context files.
- Update `nerv status` to include a concise context availability summary if appropriate.
- Add smoke coverage for metadata persistence and status/context discovery.

## Out of scope

This task does not include:

- Full decision lifecycle commands.
- Rich parsing of arbitrary markdown.
- Run generation or `.nerv/agent/runs/RUN-001/run.md` creation.
- Cloud sync or team context.
- Schema migration framework work.

## Files to inspect

The agent should inspect these files before making changes:

- `src/database.ts`
- `src/repository.ts`
- `src/workspace.ts`
- `src/index.ts`
- Product/repo context helpers added by TASK-007 and TASK-008
- `scripts/smoke-cli.mjs`
- `agent-workspace/builds/BUILD-003-product-and-repo-context-flow.md`
- `agent-workspace/product/architecture.md`

## Files likely to change

The agent may need to change:

- `src/repository.ts`
- `src/index.ts`
- Product/repo context support files under `src/`
- `scripts/smoke-cli.mjs`
- `README.md`
- `agent-workspace/tasks/TASK-009-persist-context-metadata-and-status-integration.md`

## Data or state affected

Writes metadata and decision rows to `.nerv/nerv.db` in the current repo. May update status output to report product and repo context availability.

## Acceptance criteria

This task is complete when:

- Product/repo context generation stores useful metadata in SQLite.
- Product decisions are persisted where practical without over-parsing user docs.
- Later run generation has a small helper or structured result showing context file paths and availability.
- `nerv status` surfaces context availability without becoming noisy.
- Existing product and repo docs remain the editable source for human-facing context.

## Validation

Run or verify:

- `pnpm build`
- `pnpm typecheck`
- `pnpm smoke`
- Manual run of `nerv product` followed by SQLite metadata inspection.
- Manual check that `nerv status` reports context availability accurately.

## Risks

- Persisting markdown-derived decisions can become brittle if parsing is too ambitious.
- Status output may become noisy before lifecycle commands exist.
- Schema needs should be kept minimal to avoid premature migrations.

## Agent instructions

Work only within this task scope.

Do not implement full lifecycle commands or run generation.

Keep SQLite persistence small and practical. Prefer metadata keys and existing tables over schema expansion unless a clear task requirement demands otherwise.

If decision parsing becomes ambiguous, preserve the markdown file as source of truth and store only coarse metadata.

## Expected evidence

At the end, provide:

- Metadata keys or decision persistence summary
- Context discovery helper summary
- Example `nerv status` output
- Files changed
- Validation results
- Remaining risks
- Suggested commit message

## Checkpoint log

### Checkpoint 001

Implemented on 2026-06-08.

What changed:

- Added `src/context.ts` with `discoverContext()` helper that returns context availability for product and repo context.
- Updated `src/product.ts` with `persistProductMetadata()` to store timestamps and file counts in metadata table.
- Updated `src/product.ts` with `parseDecisionsFromFile()` and `persistDecisions()` to extract `### ` headings from decisions.md and store them in the decisions table.
- Updated `src/index.ts` to persist metadata when `nerv product` runs.
- Updated `src/index.ts` to persist `repo_context_updated_at` when `nerv repo` runs.
- Updated `src/index.ts` to show context availability in `nerv status`.
- Added 5 smoke tests covering metadata persistence, decision persistence, stale decision clearing, and status context display.

Files touched:

- `src/context.ts` (new)
- `src/product.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-009-persist-context-metadata-and-status-integration.md`

Decisions made:

- Store product context metadata as key-value pairs in the existing metadata table.
- Parse decisions.md using `### ` headings as decision summaries (coarse parsing).
- Skip the "Format" heading as it's part of the template, not a real decision.
- Use `scope_type = "product"` and `scope_id = "decisions.md"` for persisted decisions.
- Delete and re-insert decisions on each `nerv product` run to keep them in sync with the file.

Validation performed:

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (28 checks including 5 new context metadata checks).
- Manual test: `nerv product` persists metadata and decisions.
- Manual test: Removing decision headings clears stale product decisions from SQLite.
- Manual test: `nerv repo` persists repo context timestamp.
- Manual test: `nerv status` shows context availability.

Pending work:

- Review and close TASK-009 after the user is satisfied with the implementation.

## Review

Reviewed on 2026-06-08.

Acceptance criteria check:

- [x] Product/repo context generation stores useful metadata in SQLite.
- [x] Product decisions are persisted where practical without over-parsing user docs.
- [x] Later run generation has a small helper or structured result showing context file paths and availability.
- [x] `nerv status` surfaces context availability without becoming noisy.
- [x] Existing product and repo docs remain the editable source for human-facing context.

Scope check:

- Passed. The work stayed within metadata persistence, coarse decision extraction, context discovery and status integration.
- No full decision lifecycle commands were added.
- No rich markdown parser was added.
- No run generation was added.
- No schema migration framework was added.

Validation check:

Commands performed:

```bash
pnpm validate
```

Results:

- Build: passed.
- Typecheck: passed.
- Smoke: passed (28 checks including context metadata and stale decision clearing).

Regression checked:

- Added decisions to `.nerv/product/decisions.md`, ran `nerv product`, then removed all decision headings and reran `nerv product`.
- SQLite `decisions` rows for `scope_type = 'product'` correctly cleared to 0.

Findings:

- None.

Risks:

- Decision extraction intentionally only reads `### ` headings and ignores richer markdown structure. This is acceptable for TASK-009 because the markdown file remains the source of truth.

Review result:

- Ready to close. No remaining changes required for TASK-009.

## Close summary

Closed on 2026-06-08.

Commit:

```txt
1363723 TASK-009 Persist context metadata and status integration
```

Final summary:

- Implemented `discoverContext()` helper that returns context availability for product and repo context with timestamps.
- Implemented `persistProductMetadata()` to store `product_context_updated_at`, file counts and created/preserved counts in SQLite metadata table.
- Implemented `parseDecisionsFromFile()` and `persistDecisions()` to extract `### ` headings from `decisions.md` and store them in the decisions table with `scope_type = "product"`.
- Fixed: `persistDecisions()` now clears stale product decisions even when no decision headings remain (previously left orphaned rows).
- Updated `nerv status` to show context availability with product and repo context status and timestamps.
- Added 5 smoke tests covering metadata persistence, decision persistence, stale decision clearing, and status context display.

User or developer value delivered:

- Developers can see product and repo context availability in `nerv status`.
- Product decisions are automatically persisted to SQLite without over-parsing markdown.
- Stale decisions are correctly cleared when removed from `decisions.md`.
- Later run generation can use `discoverContext()` to understand available context files.

Files changed:

- `src/context.ts` (new)
- `src/product.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `README.md`
- `agent-workspace/tasks/TASK-009-persist-context-metadata-and-status-integration.md`
- `agent-workspace/builds/BUILD-003-product-and-repo-context-flow.md`

Validation evidence:

- `pnpm validate` passed.
- Smoke: 28 checks passed.
- Targeted stale-decision repro confirmed 0 rows after removing decision headings from `decisions.md`.

Related Build update:

- BUILD-003 has all tasks closed.
- BUILD-003 is ready to close.
