# Product Evolution

This file tracks meaningful progress while building Nerv manually.

In the real MVP, Nerv will update `.nerv/product/evolution.md` when tasks and builds are closed.

## Format

```md
## YYYY-MM-DD

Closed TASK-ID: Task title

Impact:

- What changed
- What this enables
- Related Build
- Commit hash
```

## 2026-06-07

Closed TASK-001: Initialize TypeScript Package Foundation

Impact:

- Created the first real Nerv software foundation with Node.js, TypeScript and pnpm.
- Added a buildable minimal CLI entrypoint for future command work.
- Related Build: BUILD-001 Project And CLI Foundation
- Commit hash: f6c0e2b

Closed TASK-002: Add Commander CLI Entrypoint And Command Skeleton

Impact:

- Added the Commander-based `nerv` CLI command surface for the MVP scope.
- Added explicit placeholder behavior so commands are discoverable without pretending to perform real work.
- Related Build: BUILD-001 Project And CLI Foundation
- Commit hash: 9dabd5a

Closed TASK-003: Add Minimal Quality Gates And CLI Smoke Validation

Impact:

- Added repeatable CLI smoke validation and an aggregate `pnpm validate` command for the CLI foundation.
- Documented current validation scripts and the intentional absence of `test` and `lint` scripts.
- Related Build: BUILD-001 Project And CLI Foundation
- Commit hash: abf72c1

Closed BUILD-001: Project And CLI Foundation

Impact:

- Established Nerv as a buildable Node.js, TypeScript and pnpm CLI project.
- Added the Commander-based MVP command skeleton and repeatable CLI validation.
- All planned BUILD-001 tasks are closed and the repo is ready for BUILD-002.
- Related tasks: TASK-001, TASK-002, TASK-003

## 2026-06-08

Closed TASK-004: Add Workspace Detection, `nerv init`, And `nerv status`

Impact:

- Added repo-local workspace detection using the current Git repository root.
- Implemented idempotent `nerv init` and minimal `nerv status` behavior.
- Related Build: BUILD-002 Local Workspace And SQLite State
- Commit hash: 11e2296

Closed TASK-005: Add SQLite Bootstrap Schema And Database Initialization

Impact:

- Added the initial SQLite schema for builds, tasks, runs, checkpoints, reviews, decisions, status history and metadata.
- Made database initialization safe to rerun and hardened malformed schema handling.
- Related Build: BUILD-002 Local Workspace And SQLite State
- Commit hash: 2d28223

Closed TASK-006: Add Repository Helpers And Stable ID Generation

Impact:

- Added a thin SQLite repository helper layer.
- Added stable sequential IDs for builds, tasks and runs with malformed/stale counter protection.
- Related Build: BUILD-002 Local Workspace And SQLite State
- Commit hash: 1c10204

Closed BUILD-002: Local Workspace And SQLite State

Impact:

- Established `.nerv/` and `.nerv/nerv.db` as the local-first Nerv state foundation.
- Added repo-scoped initialization, status reporting, durable schema and stable ID generation.
- Unblocked future lifecycle commands that need persistent local state.
- Related tasks: TASK-004, TASK-005, TASK-006

Closed TASK-007: Implement Product Context Scaffold Command

Impact:

- Implemented `nerv product` to scaffold stable human-editable product docs under `.nerv/product/`.
- Added non-overwrite behavior with smoke coverage that verifies edited content is preserved.
- Related Build: BUILD-003 Product And Repo Context Flow
- Commit hash: ba5803e

Closed TASK-008: Add Lightweight Repo Development Context

Impact:

- Implemented `nerv repo` to generate `.nerv/repo/development.md` with lightweight package, script, folder and Git context.
- Added graceful behavior when Git metadata is unavailable in an initialized workspace.
- Related Build: BUILD-003 Product And Repo Context Flow
- Commit hash: c8710d2

Closed TASK-009: Persist Context Metadata And Status Integration

Impact:

- Persisted product/repo context freshness metadata and product decision headings in SQLite.
- Added context discovery and concise context availability output in `nerv status`.
- Related Build: BUILD-003 Product And Repo Context Flow
- Commit hash: 1363723

Closed BUILD-003: Product And Repo Context Flow

Impact:

- Added usable product context creation and lightweight repo awareness to the Nerv CLI.
- Made context availability visible and durable for future `run.md` generation.
- Preserved the local-first, human-editable Markdown model while storing useful structured metadata in SQLite.
- Related tasks: TASK-007, TASK-008, TASK-009

## 2026-06-09

Closed TASK-014: Add Run Persistence And Task Selection Helpers

Impact:

- Added repository helpers for creating, retrieving and listing Run records in SQLite.
- Added active Run metadata helpers and deterministic Task selection for future `nerv start <query>` behavior.
- Related Build: BUILD-005 Run Generation And Agent Entrypoint
- Commit hash: ff8dbbb

## 2026-06-09

Closed TASK-015: Implement nerv start And Run Markdown Generation

Impact:

- Implemented `nerv start <query>` so it creates a Run in SQLite, marks it active, and generates focused `run.md` plus local `task.md`.
- The generated `run.md` is the single agent entrypoint with scope, context, acceptance criteria, validation, checkpoint, review, close and Git awareness sections.
- Related Build: BUILD-005 Run Generation And Agent Entrypoint
- Commit hash: 78a6ea6

## 2026-06-09

Closed TASK-016: Implement nerv current And nerv runs

Impact:

- Implemented `nerv current` to show the active Run with task details and run file path.
- Implemented `nerv runs` to list all Runs with task details.
- Added graceful handling for stale metadata and missing task references.
- Related Build: BUILD-005 Run Generation And Agent Entrypoint
- Commit hash: 077cd83

Closed BUILD-005: Run Generation And Agent Entrypoint

Impact:

- Implemented `nerv start <query>` to create Runs and generate focused `run.md` agent entrypoints.
- Implemented `nerv current` and `nerv runs` for active Run discovery and Run listing.
- All planned BUILD-005 tasks are closed and the repo is ready for BUILD-006.
- Related tasks: TASK-014, TASK-015, TASK-016

## 2026-06-09

Closed TASK-017: Add Checkpoint Persistence And nerv checkpoint

Impact:

- Implemented checkpoint persistence and the `nerv checkpoint` command.
- Developers can save progress checkpoints for active Runs with structured evidence fields.
- Checkpoints are persisted in SQLite and written as Markdown files under each Run's `checkpoints/` directory.
- Related Build: BUILD-006 Checkpoint And Review Lifecycle
- Commit hash: 7bffdf5

## 2026-06-09

Closed TASK-018: Add Review Persistence And nerv review

Impact:

- Implemented review persistence and the `nerv review` command.
- Developers can record review outcomes with structured evidence fields.
- Reviews are persisted in SQLite and written as Markdown files under each Run's `reviews/` directory.
- Related Build: BUILD-006 Checkpoint And Review Lifecycle
- Commit hash: 5f7d347

## 2026-06-09

Closed TASK-019: Harden Checkpoint/Review Integration And Evidence

Impact:

- Updated generated `run.md` with actual checkpoint and review CLI options.
- Added end-to-end smoke coverage for checkpoint then review flow.
- Added Git-unavailable smoke coverage for checkpoint and review.
- Related Build: BUILD-006 Checkpoint And Review Lifecycle
- Commit hash: 3cdb6db

Closed BUILD-006: Checkpoint And Review Lifecycle

Impact:

- Implemented `nerv checkpoint` with structured evidence fields and persistent checkpoint records.
- Implemented `nerv review` with outcome, validation, and evidence capture.
- Generated `run.md` now includes correct checkpoint and review commands.
- All planned BUILD-006 tasks are closed and the repo is ready for BUILD-007.
- Related tasks: TASK-017, TASK-018, TASK-019
- Commit hash: 4807ecc
