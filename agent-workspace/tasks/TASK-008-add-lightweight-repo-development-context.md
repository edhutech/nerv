# TASK-008: Add Lightweight Repo Development Context

## Status

Closed

## Parent Build

BUILD-003

## Task Goal

Generate `.nerv/repo/development.md` with lightweight repo awareness that helps later agent runs understand how to work in the current repository.

## Why this task matters

Agents need practical repo context without deep code analysis. This task captures package files, scripts, folder structure, Git status when available and likely validation commands in a stable human-readable document.

## Context

BUILD-003 calls for lightweight repo analysis and `.nerv/repo/development.md`. The MVP explicitly excludes deep code analysis, tree-sitter, semantic search and vector databases. This task should keep analysis shallow, deterministic and safe.

## Scope

This task includes:

- Add a lightweight repo analysis helper.
- Detect common package and config files.
- Detect package scripts from supported package files where practical.
- Capture a concise top-level folder structure summary.
- Capture Git status when the current repo is a Git repo.
- Work gracefully when no Git repository metadata is available.
- Generate or update `.nerv/repo/development.md` with repo development context.
- Add smoke coverage for generated repo context.

## Out of scope

This task does not include:

- Deep code analysis.
- Tree-sitter integration.
- Semantic search.
- Vector databases.
- Reading source file contents beyond small package/config metadata needed for analysis.
- Product doc scaffolding beyond relying on existing workspace directories.

## Files to inspect

The agent should inspect these files before making changes:

- `src/index.ts`
- `src/workspace.ts`
- Product context files added by TASK-007 if present
- `scripts/smoke-cli.mjs`
- `agent-workspace/builds/BUILD-003-product-and-repo-context-flow.md`
- `agent-workspace/product/stack.md`
- `agent-workspace/product/architecture.md`

## Files likely to change

The agent may need to change:

- New repo-analysis support files under `src/`
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `README.md`
- `agent-workspace/tasks/TASK-008-add-lightweight-repo-development-context.md`

## Data or state affected

Creates or updates `.nerv/repo/development.md` in the current repo.

## Acceptance criteria

This task is complete when:

- `.nerv/repo/development.md` is generated with package/config file summary, scripts, folder structure and validation command hints.
- Repo analysis handles missing optional files without failing.
- Repo analysis works even when Git metadata is unavailable.
- Sensitive or large file contents are not dumped into the generated doc.
- The generated repo context is usable by future `run.md` generation.

## Validation

Run or verify:

- `pnpm build`
- `pnpm typecheck`
- `pnpm smoke`
- Manual run in a temporary initialized repo with `package.json` scripts.
- Manual run in a temporary initialized workspace where `.git` is unavailable or absent, if feasible.
- Manual inspection of `.nerv/repo/development.md` for concise output.

## Risks

- Repo analysis may accidentally include too much sensitive information.
- Shelling out to Git must fail gracefully.
- Folder summaries can become noisy if generated recursively without limits.

## Agent instructions

Work only within this task scope.

Do not add deep code analysis, dependency graphing or semantic search.

Keep output bounded and explain omitted detail rather than dumping large structures.

If analysis requires reading a potentially sensitive file, prefer listing the file path instead of its contents.

## Expected evidence

At the end, provide:

- Repo analysis summary
- Example `.nerv/repo/development.md` sections
- Git and non-Git behavior evidence
- Files changed
- Validation results
- Remaining risks
- Suggested commit message

## Checkpoint log

### Checkpoint 001

Implemented on 2026-06-08.

What changed:

- Added `src/repo-context.ts` with lightweight repo analysis logic.
- Implemented `analyzeRepo(repoRoot)` function that detects package/config files, extracts scripts, captures top-level folders, and gets Git status.
- Implemented `generateDevelopmentDoc(analysis)` function that creates markdown documentation.
- Added `nerv repo` command that generates `.nerv/repo/development.md`.
- Command requires an initialized Nerv workspace and fails clearly if not initialized or not in a Git repo.
- Added 4 smoke tests covering repo context generation, missing package.json handling, and error cases.
- Fixed deduplication bug where `tsconfig.json` appeared twice (matched both exact and wildcard patterns).

Files touched:

- `src/repo-context.ts` (new)
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `README.md`
- `agent-workspace/tasks/TASK-008-add-lightweight-repo-development-context.md`

Decisions made:

- Keep analysis shallow and deterministic.
- Use Set for deduplication when detecting package files.
- Extract scripts from package.json when available.
- Capture Git status when available, gracefully handle non-Git repos.
- Generate markdown documentation that's useful for agent runs.
- Limit folder detection to top-level only to avoid noise.

Validation performed:

- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm smoke` passed (23 checks including 4 new repo context checks).
- Manual test: `nerv repo` generates development.md in initialized repo.
- Manual test: Works without package.json (reports no scripts detected).
- Manual test: Fails clearly when workspace not initialized or not in Git repo.

Pending work:

- Review and close TASK-008 after the user is satisfied with the repo context implementation.

### Checkpoint 002

Implemented on 2026-06-08 after review finding.

What changed:

- Added `getInitializedWorkspaceStatus(startDirectory)` in `src/workspace.ts` to find an initialized `.nerv/` workspace even when `.git` metadata is unavailable.
- Updated `nerv repo` to use the initialized workspace fallback while leaving `nerv init` and `nerv product` Git-scoped.
- Updated smoke coverage so an initialized workspace with `.git` removed still generates `.nerv/repo/development.md`.
- The generated development context now reports `Not a Git repository or Git is not available.` for missing Git metadata.

Files touched:

- `src/workspace.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-008-add-lightweight-repo-development-context.md`

Validation performed:

- `pnpm build` passed.
- `pnpm smoke` passed.
- Targeted smoke regression `repo works when git metadata is unavailable` passed.

Pending work:

- Rerun full validation and review TASK-008 again.

## Review

Reviewed on 2026-06-08.

Acceptance criteria check:

- [x] `.nerv/repo/development.md` is generated with package/config file summary, scripts, folder structure and validation command hints.
- [x] Repo analysis handles missing optional files without failing.
- [x] Repo analysis works even when Git metadata is unavailable.
- [x] Sensitive or large file contents are not dumped into the generated doc.
- [x] The generated repo context is usable by future `run.md` generation.

Scope check:

- Passed. The work stayed within lightweight repo analysis and development-context generation.
- No deep code analysis was added.
- No tree-sitter integration was added.
- No semantic search or vector database was added.
- No source file contents are dumped; package file contents are limited to `package.json` script metadata.

Validation check:

Commands performed:

```bash
pnpm validate
```

Results:

- Build: passed.
- Typecheck: passed.
- Smoke: passed (23 checks including repo context generation, missing `package.json`, uninitialized workspace and missing Git metadata).

Regression checked:

- Initialized a workspace, removed `.git`, ran `nerv repo` and confirmed `.nerv/repo/development.md` is generated with Git metadata reported unavailable.

Findings:

- None.

Risks:

- Validation command hints currently list script names rather than full `pnpm <script>` commands. This is acceptable for the lightweight context scope, but later run generation may want package-manager-aware command formatting.

Review result:

- Ready to close. No remaining changes required for TASK-008.

## Close summary

Closed on 2026-06-08.

Commit:

```txt
No commit linked yet.
```

Final summary:

- Implemented `nerv repo` command that generates lightweight repo development context at `.nerv/repo/development.md`.
- Detects package/config files (package.json, tsconfig.json, .gitignore, etc.) using shallow file-system scanning.
- Extracts scripts from `package.json` and surfaces validation command hints.
- Captures top-level folder structure.
- Captures Git status when available; gracefully reports unavailable when `.git` is missing.
- Added `getInitializedWorkspaceStatus()` fallback so `nerv repo` works even when Git metadata is unavailable but `.nerv/` workspace is initialized.
- `nerv init` and `nerv product` remain Git-scoped.
- Added 5 smoke tests covering repo context generation, missing package.json, uninitialized workspace, and missing Git metadata.
- Fixed deduplication bug where `tsconfig.json` appeared twice in package file detection.

User or developer value delivered:

- Developers can generate a concise repo development context document without deep analysis.
- The context helps agents understand the repository structure, available scripts and validation commands.
- Works even in repos where `.git` metadata is unavailable.

Files changed:

- `src/repo-context.ts` (new)
- `src/workspace.ts`
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `README.md`
- `agent-workspace/tasks/TASK-008-add-lightweight-repo-development-context.md`
- `agent-workspace/builds/BUILD-003-product-and-repo-context-flow.md`

Validation evidence:

- `pnpm validate` passed.
- Smoke: 23 checks passed.
- Targeted regression: initialized workspace, removed `.git`, `nerv repo` generated `.nerv/repo/development.md` with Git metadata unavailable.

Related Build update:

- BUILD-003 has TASK-008 closed.
- BUILD-003 remains in progress pending TASK-009.

Follow-up tasks:

- Start TASK-009: Persist Context Metadata And Status Integration.
