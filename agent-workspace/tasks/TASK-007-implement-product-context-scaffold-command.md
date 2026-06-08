# TASK-007: Implement Product Context Scaffold Command

## Status

Closed

## Parent Build

BUILD-003

## Task Goal

Implement the first usable `nerv product` flow that creates stable human-editable product context files under `.nerv/product/` without overwriting existing user content.

## Why this task matters

BUILD-003 needs a baseline product context that developers can maintain once and reuse across future agent runs. This task makes `nerv product` produce the core markdown scaffolding that later commands can reference.

## Context

The stack document defines stable human docs under `.nerv/product/`, including `product.md`, `problem.md`, `users.md`, `prd.md`, `roadmap.md`, `scope.md`, `decisions.md`, `architecture.md` and `evolution.md`. BUILD-002 already creates the workspace and database foundation, so this task should focus on the human document layer and minimal CLI behavior.

## Scope

This task includes:

- Replace the `nerv product` placeholder with a real command.
- Require or create an initialized Nerv workspace using the existing workspace helpers.
- Create stable product markdown files under `.nerv/product/`.
- Seed each file with concise, useful headings and prompts.
- Preserve existing product files and never silently overwrite user edits.
- Add smoke coverage for product scaffolding and non-overwrite behavior.

## Out of scope

This task does not include:

- Interactive prompt flows beyond the thinnest useful command behavior.
- Repo analysis or `.nerv/repo/development.md` generation.
- SQLite persistence beyond what is already done by workspace initialization.
- Run generation or agent-facing context files.

## Files to inspect

The agent should inspect these files before making changes:

- `src/index.ts`
- `src/workspace.ts`
- `src/database.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/builds/BUILD-003-product-and-repo-context-flow.md`
- `agent-workspace/product/stack.md`
- `agent-workspace/product/architecture.md`
- `agent-workspace/product/mvp.md`

## Files likely to change

The agent may need to change:

- `src/index.ts`
- New product-context support files under `src/`
- `scripts/smoke-cli.mjs`
- `README.md`
- `agent-workspace/tasks/TASK-007-implement-product-context-scaffold-command.md`

## Data or state affected

Creates or preserves local markdown files under `.nerv/product/` in the current repo.

## Acceptance criteria

This task is complete when:

- `nerv product` works in an initialized repo.
- The expected product docs are created under `.nerv/product/` when missing.
- Existing product docs are not overwritten or truncated.
- The command behavior is scoped to the current repo only.
- The generated docs are concise and useful for future agent context.

## Validation

Run or verify:

- `pnpm build`
- `pnpm typecheck`
- `pnpm smoke`
- Manual run of `nerv product` in a temporary initialized repo.
- Manual rerun after editing a generated product doc to confirm edits are preserved.

## Risks

- Product scaffolding could become too verbose and feel like a documentation chore.
- Non-overwrite behavior must be explicit enough that users trust the command.
- Future interactive behavior may require revisiting file templates.

## Agent instructions

Work only within this task scope.

Do not expand into repo analysis, SQLite decision persistence or run context generation.

Keep templates short, readable and editable. Prefer predictable file creation over interactive prompts for this first version.

If you find that product file names or required sections conflict with existing product docs, stop and explain the issue before making unrelated changes.

## Expected evidence

At the end, provide:

- Product files created
- Example `nerv product` output
- Non-overwrite behavior evidence
- Files changed
- Validation results
- Remaining risks
- Suggested commit message

## Checkpoint log

### Checkpoint 001

Implemented on 2026-06-08.

What changed:

- Added `src/product.ts` with product context scaffolding logic.
- Implemented `scaffoldProductContext(workspaceRoot)` function that creates 9 product markdown files.
- Product files created: `product.md`, `problem.md`, `users.md`, `prd.md`, `roadmap.md`, `scope.md`, `decisions.md`, `architecture.md`, `evolution.md`.
- Each file is seeded with concise, useful headings and prompts.
- Existing files are preserved and never overwritten.
- Replaced the `nerv product` placeholder in `src/index.ts` with real command behavior.
- Command requires an initialized Nerv workspace and fails clearly if not initialized or not in a Git repo.
- Added 4 smoke tests covering product scaffolding, non-overwrite behavior, and error cases.

Files touched:

- `src/product.ts` (new)
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `README.md`
- `agent-workspace/tasks/TASK-007-implement-product-context-scaffold-command.md`

Decisions made:

- Keep product templates short, readable and editable.
- Use predictable file creation without interactive prompts for this first version.
- Preserve existing files by checking `existsSync` before writing.
- Report both created and preserved files in command output.

Validation performed:

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (19 checks including 4 new product context checks).
- Manual test: `nerv product` creates 9 files in initialized repo.
- Manual test: `nerv product` preserves existing files when run again.
- Manual test: Custom content in `product.md` is preserved after rerun.

Pending work:

- Review and close TASK-007 after the user is satisfied with the product context implementation.

## Review

Reviewed on 2026-06-08.

Acceptance criteria check:

- [x] `nerv product` works in an initialized repo.
- [x] The expected product docs are created under `.nerv/product/` when missing.
- [x] Existing product docs are not overwritten or truncated.
- [x] The command behavior is scoped to the current repo only.
- [x] The generated docs are concise and useful for future agent context.

Scope check:

- Passed. The work stayed within product context scaffolding and CLI wiring.
- No repo analysis was added.
- No SQLite decision persistence was added.
- No run generation or agent-facing context files were added.
- No interactive prompt flow was introduced.

Validation check:

Commands performed:

```bash
pnpm build
pnpm typecheck
pnpm smoke
```

Results:

- Build: passed.
- Typecheck: passed.
- Smoke: passed (19 checks including product scaffolding, preservation and error paths).

Manual behavior checked:

- `nerv product` after `nerv init` created all 9 expected product docs.
- Rerunning `nerv product` preserved existing files.
- Edited content in `product.md` remained present after rerun.

Findings:

- None.

Automated preservation coverage:

- The smoke preservation test now writes custom content to `product.md`, reruns `nerv product` and asserts the content remains unchanged.

Review result:

- Ready to close. No remaining changes required for TASK-007.

## Close summary

Closed on 2026-06-08.

Commit:

```txt
No commit linked yet.
```

Final summary:

- Implemented `nerv product` command that scaffolds 9 product markdown files under `.nerv/product/`.
- Files created: `product.md`, `problem.md`, `users.md`, `prd.md`, `roadmap.md`, `scope.md`, `decisions.md`, `architecture.md`, `evolution.md`.
- Each file is seeded with concise, useful headings and prompts.
- Existing files are preserved and never overwritten.
- Command requires an initialized Nerv workspace and fails clearly if not initialized or not in a Git repo.
- Added 4 smoke tests covering product scaffolding, non-overwrite behavior with content verification, and error cases.

User or developer value delivered:

- Developers can capture reusable product context once and reuse it across future agent runs.
- Product docs are editable and never silently overwritten by subsequent `nerv product` runs.
- The generated docs are concise and useful for future agent context.

Files changed:

- `src/product.ts` (new)
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `README.md`
- `agent-workspace/tasks/TASK-007-implement-product-context-scaffold-command.md`
- `agent-workspace/builds/BUILD-003-product-and-repo-context-flow.md`

Validation evidence:

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (19 checks including content preservation verification).
- Manual test: `nerv product` creates 9 files in initialized repo.
- Manual test: Custom content in `product.md` preserved after rerun.

Related Build update:

- BUILD-003 has TASK-007 closed.
- BUILD-003 remains in progress pending TASK-008 and TASK-009.

Follow-up tasks:

- Start TASK-008: Add Lightweight Repo Development Context.
