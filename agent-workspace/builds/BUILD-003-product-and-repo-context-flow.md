# BUILD-003: Product And Repo Context Flow

## Status

Closed

## Build Goal

Implement product context creation and lightweight repo awareness.

## Why this Build matters for the Nerv MVP

Nerv's promise depends on giving agents useful product and repo context without dumping everything.

## User value

Developers can capture reusable product and repo context once, then use it across focused agent runs.

## Product area

Product context

## Scope

This Build includes:

- Implement `nerv product`.
- Create stable human docs under `.nerv/product/`.
- Create `.nerv/repo/development.md`.
- Store product metadata and decisions in SQLite where useful.
- Add lightweight repo analysis for package files, scripts, folder structure, Git status if available and validation commands.

## Out of scope

This Build does not include:

- Deep code analysis.
- Tree-sitter integration.
- Semantic search.
- Vector database.
- Cloud sync or team context.

## Expected output

By the end of this Build, the repo should have:

- Product docs scaffolded in `.nerv/product/`.
- Repo development context in `.nerv/repo/development.md`.
- Product context and decisions persisted where appropriate.
- Repo summary data usable by later run generation.

## Related MVP commands

- `nerv product`
- `nerv status`

## Suggested Agentic Tasks

- TASK-007: Implement Product Context Scaffold Command
- TASK-008: Add Lightweight Repo Development Context
- TASK-009: Persist Context Metadata And Status Integration

## Progress

- TASK-007: Closed on 2026-06-08.
- TASK-008: Closed on 2026-06-08.
- TASK-009: Closed on 2026-06-08.

## Acceptance criteria

The Build is complete when:

- A user can create baseline product context.
- Existing product docs are not silently overwritten.
- Repo analysis works even when the repo is not a Git repo.
- Context is available to future `run.md` generation.

## Validation

The Build should be validated by:

- `pnpm build`
- `pnpm test` if a test script exists.
- Manual run of `nerv product` in an initialized repo.
- Manual check of generated product and repo docs.

## Risks

- Product flow could become too documentation-heavy.
- Interactive prompts may slow down the MVP if overdone.
- Repo analysis must avoid reading or exposing sensitive content unnecessarily.

## Review

Reviewed on 2026-06-08.

Acceptance criteria check:

- [x] A user can create baseline product context.
- [x] Existing product docs are not silently overwritten.
- [x] Repo analysis works even when Git metadata is unavailable.
- [x] Context is available to future `run.md` generation.

Scope check:

- Passed. The work stayed within product context creation, lightweight repo awareness and context metadata integration.
- No deep code analysis was added.
- No tree-sitter integration was added.
- No semantic search or vector database was added.
- No cloud sync or team context was added.

Task completion check:

- TASK-007: Closed and committed (`ba5803e`, close-link update `219ccc0`).
- TASK-008: Closed and committed (`c8710d2`, close-link update `ee6acdd`).
- TASK-009: Closed and committed (`1363723`, close-link update `893c90f`).

Validation check:

Commands performed:

```bash
pnpm validate
```

Results:

- Build: passed.
- Typecheck: passed.
- Smoke: passed (28 checks).

Manual validation performed:

- Created a temporary repo and ran `nerv init`.
- Ran `nerv product` and confirmed all 9 product docs are scaffolded.
- Added a decision heading to `.nerv/product/decisions.md`, reran `nerv product` and confirmed the decision is persisted in SQLite.
- Ran `nerv repo` and confirmed `.nerv/repo/development.md` is generated with package script context.
- Ran `nerv status` and confirmed product and repo context availability appears with timestamps.
- Confirmed metadata keys `product_context_updated_at` and `repo_context_updated_at` exist.

Findings:

- None.

Risks:

- Repo validation command hints are intentionally lightweight and may need package-manager-aware formatting before run generation.
- Decision persistence intentionally uses only `###` headings; richer decision parsing is deferred until real decision lifecycle needs exist.

Review result:

- Ready to close. No remaining changes required for BUILD-003.

## Close summary

Closed on 2026-06-08.

Commits:

```txt
ba5803e TASK-007 Implement product context scaffold command
219ccc0 workflow: link commit in TASK-007 close record
c8710d2 TASK-008 Add lightweight repo development context
ee6acdd workflow: link commit in TASK-008 close record
1363723 TASK-009 Persist context metadata and status integration
893c90f workflow: link commit in TASK-009 close record
```

Final summary:

- Implemented `nerv product` to scaffold stable human-editable product docs under `.nerv/product/`.
- Preserved existing product docs and added smoke coverage that verifies edited content is not overwritten.
- Implemented `nerv repo` to generate lightweight development context at `.nerv/repo/development.md`.
- Added repo analysis for package/config files, package scripts, validation hints, top-level folders and Git status when available.
- Added initialized-workspace fallback so `nerv repo` works when Git metadata is unavailable.
- Persisted product and repo context metadata in SQLite.
- Persisted product decisions from `decisions.md` using coarse `###` heading extraction while preserving markdown as the human source of truth.
- Added `discoverContext()` so later run generation can discover available context files and timestamps.
- Updated `nerv status` to show concise product and repo context availability.

User or developer value delivered:

- Developers can create reusable product context and repo development context without deep analysis or cloud services.
- Agents can later consume focused product/repo context instead of requiring repeated explanations.
- Context availability and freshness are visible from `nerv status` and stored in SQLite for future lifecycle commands.

Files changed:

- `src/product.ts`
- `src/repo-context.ts`
- `src/context.ts`
- `src/workspace.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `README.md`
- `agent-workspace/tasks/TASK-007-implement-product-context-scaffold-command.md`
- `agent-workspace/tasks/TASK-008-add-lightweight-repo-development-context.md`
- `agent-workspace/tasks/TASK-009-persist-context-metadata-and-status-integration.md`
- `agent-workspace/builds/BUILD-003-product-and-repo-context-flow.md`

Validation evidence:

- `pnpm validate` passed.
- Smoke: 28 checks passed.
- Manual temp-repo validation confirmed product docs, repo development context, SQLite metadata, persisted decisions and status context availability.

Follow-up builds:

- Continue with the next approved MVP build after BUILD-003.

## Dependencies

- BUILD-001: Project And CLI Foundation.
- BUILD-002: Local Workspace And SQLite State.

## Notes

The product flow should feel like a developer tool, not a documentation chore.
