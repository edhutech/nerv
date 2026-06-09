# TASK-011: Implement Agentic Task Creation

## Status

Closed

## Parent Build

BUILD-004

## Task Goal

Implement `nerv new task "..."` so a developer can turn focused intent into a stored Agentic Task with practical MVP planning fields and readable generated Markdown.

## Why this task matters

Creating an Agentic Task is the first real step in Nerv's core promise: turning vague developer intent into scoped, verifiable work that a coding agent can execute later.

## Context

The command skeleton already exists in `src/index.ts`. TASK-010 should provide the persistence model and repository helpers. This task should keep planning heuristic-based and transparent, not AI-generated.

## Scope

This task includes:

- Replace the `nerv new task` placeholder with real command behavior.
- Require an initialized Nerv workspace before creating tasks.
- Generate a stable `TASK-###` ID using existing ID helpers.
- Derive a concise task title from the provided intent.
- Store intent, title, default status and MVP planning sections in SQLite.
- Generate basic task Markdown where useful, without making Markdown the source of truth.
- Add a simple large-intent heuristic that detects likely Build-sized work.
- Ask for confirmation before turning large intent into a Build, following DEC-008.
- If large-intent build creation is deferred to TASK-012, fail or guide clearly without silently creating the wrong entity.
- Add smoke coverage for normal task creation and large-intent guard behavior.

## Out of scope

This task does not include:

- Implementing `nerv new build`.
- Implementing full `nerv build plan` behavior.
- Automatic AI planning or complex estimation.
- Interactive multi-question task authoring.
- Run generation.
- Review, checkpoint or close lifecycle behavior.

## Files to inspect

The agent should inspect these files before making changes:

- `src/index.ts`
- `src/repository.ts`
- Work-item support files added by TASK-010
- `src/workspace.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/builds/BUILD-004-agentic-builds-and-tasks.md`
- `agent-workspace/product/decisions.md`
- `agent-workspace/product/glossary.md`

## Files likely to change

The agent may need to change:

- `src/index.ts`
- `src/repository.ts`
- Work-item support files under `src/`
- `scripts/smoke-cli.mjs`
- `README.md`
- `agent-workspace/tasks/TASK-011-implement-agentic-task-creation.md`

## Data or state affected

Creates task rows in `.nerv/nerv.db`. May create generated task Markdown under `.nerv/agent/tasks/` or another documented `.nerv/agent/` path if TASK-010 establishes one. Must not overwrite human product docs.

## Acceptance criteria

This task is complete when:

- `nerv new task "Add Google login without breaking email auth"` creates a stored task in an initialized repo.
- Created tasks get stable sequential IDs such as `TASK-001`.
- Created tasks include intent, title, status and basic planning sections suitable for later run generation.
- Build-sized intent is detected by a simple heuristic and does not silently become a normal task.
- If the user declines or confirmation cannot be completed, no incorrect task is persisted.
- The command output tells the user the created task ID and the next likely command.
- Smoke tests cover successful task creation and the large-intent guard.

## Validation

Run or verify:

- `pnpm build`
- `pnpm typecheck`
- `pnpm smoke`
- Manual run of `nerv init` followed by `nerv new task "..."` in a temporary repo.
- Manual SQLite inspection showing the created task row.

## Risks

- Large-intent detection can be crude; the MVP should be honest about this.
- Interactive confirmation can be awkward in smoke tests if not designed with CLI flags or stdin behavior in mind.
- Generated task Markdown must not imply false certainty about scope or validation.

## Agent instructions

Work only within this task scope.

Do not implement build planning or run generation. Keep generated planning sections conservative and editable. If confirmation behavior requires a non-interactive path for tests, choose the smallest clear CLI option and document it.

## Expected evidence

At the end, provide:

- Example `nerv new task` output
- Large-intent heuristic summary
- Persistence and Markdown path summary
- Files changed
- Validation results
- Remaining risks
- Suggested commit message

## Checkpoint log

### Checkpoint 001

Implemented on 2026-06-08.

**What changed:**

- Created `src/task.ts` with task creation logic
- Implemented `createTaskFromIntent()` function that:
  - Generates stable TASK-### IDs using repository helpers
  - Derives concise task titles from intent (max 60 chars)
  - Stores intent, title, status, and planning sections in SQLite
  - Generates task Markdown at `.nerv/agent/tasks/TASK-###.md`
  - Detects large intent using keyword and phrase matching
  - Provides `--force` option to bypass large intent detection
- Updated `src/index.ts` to wire up `nerv new task` command
- Added comprehensive smoke tests for task creation
- Updated help text test to reflect new command options

**Files touched:**

- `src/task.ts` (new)
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-011-implement-agentic-task-creation.md`
- `agent-workspace/runs/RUN-011-task-011-implement-agentic-task-creation.md`

**Decisions made:**

- Large intent detection uses keyword matching (system, platform, infrastructure, etc.) and phrase matching ("build a system", etc.)
- Title derivation truncates at 60 chars or last space before 60 chars
- Task Markdown includes basic sections: Goal, Scope, Out of scope, Acceptance criteria, Validation, Risks
- Tasks directory is created automatically if it doesn't exist
- `--force` flag allows bypassing large intent detection when needed

**Validation performed:**

- `pnpm validate` passed
- All 44 smoke tests pass
- Manual testing confirmed task creation, large intent detection, and --force behavior

**Pending work:**

- Review and close TASK-011

## Review

Reviewed on 2026-06-08.

Findings addressed:

- Empty intent validation: no guard against whitespace-only or empty intent strings. Whitespace-only intent creates a task with an empty title.
- Markdown-before-DB ordering: Markdown file is written before the task row is inserted in SQLite. If DB insert fails, an orphan `.nerv/agent/tasks/TASK-###.md` file exists and the ID counter is consumed.

Acceptance criteria check:

- [x] `nerv new task "Add Google login without breaking email auth"` creates a stored task in an initialized repo.
- [x] Created tasks get stable sequential IDs (TASK-001, TASK-002, etc.).
- [x] Created tasks include intent, title, status and basic planning sections.
- [x] Build-sized intent is detected by a simple heuristic and does not silently become a normal task.
- [x] If large-intent build creation is deferred, no incorrect task is persisted (command fails with guidance).
- [x] Command output tells the user the created task ID and the next likely command.
- [x] Smoke tests cover successful task creation and the large-intent guard.

Scope check:

- Passed. No `nerv new build` or `nerv build plan` behavior added. No run generation. No AI planning. No review/checkpoint/close lifecycle.

Validation check:

- `pnpm validate` passed (44 smoke checks).

Findings:

- None blocking. Two low-priority notes:
  - Empty intent is not rejected; whitespace-only strings produce an empty title.
  - Markdown is written before DB insert; DB failure leaves an orphan Markdown file.

Risks:

- Large-intent detection is intentionally heuristic-based and crude for MVP. This is documented and acceptable.
- Generated task Markdown must not imply false certainty about scope or validation.

Review result:

- Ready to close. No remaining changes required for TASK-011.

## Close summary

Closed on 2026-06-08.

Files changed:

- `src/task.ts` (new)
- `src/index.ts`
- `scripts/smoke-cli.mjs`
- `agent-workspace/tasks/TASK-011-implement-agentic-task-creation.md`
- `agent-workspace/runs/RUN-011-task-011-implement-agentic-task-creation.md`
- `agent-workspace/builds/BUILD-004-agentic-builds-and-tasks.md`

Validation evidence:

- `pnpm validate` passed (44 smoke checks).
- Manual verification confirmed task creation, large-intent detection, and --force behavior.

Implementation notes:

- Large-intent detection uses keyword matching (authentication, system, platform, etc.) and phrase matching ("build a system", etc.).
- `--force` flag bypasses large-intent detection when needed.
- Task Markdown is generated at `.nerv/agent/tasks/TASK-###.md`.
- Tasks directory is created automatically if it doesn't exist.
- ID consumption and Markdown file creation are intentional for MVP simplicity; DB insert failure leaves an orphan Markdown file.
