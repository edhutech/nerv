---
name: nerv-development
description: "Develop, fix, review, or validate the Nerv repository itself. Use when implementing CLI commands, fixing SQLite schema or migrations, modifying Product Context or Repo Context workflows, adjusting lifecycle behavior, or validating Nerv's own codebase. Activate even when the user does not name Nerv explicitly but the work targets this repository. Do not use for consumer repositories that use Nerv as a tool, for generic Node.js or TypeScript development, or for the future public nerv skill."
---

# Nerv Development

Internal skill for developing the Nerv repository. Provides concise, authoritative guidance for coding agents working on Nerv's CLI, SQLite state, lifecycle, and Product Context.

## Authority

This skill does not replace authoritative documents. Read them in order:

1. `AGENTS.md` — repository commands, architecture, smoke constraints
2. `.nerv/product/` — product scope, decisions, architecture, evolution (when available)
3. `.nerv/repo/development.md` — generated repository context (when available)

Consult these sources at the relevant step. Do not copy their contents into this skill.

## Gotchas

- SQLite is the durable source of truth; Markdown is a generated interface. Never edit `.nerv/` state directly; use CLI commands and repository helpers.
- `.nerv/` is gitignored. Never assume it exists; create it through `workspace.ts` and helpers.
- `dist/` is compiled output. Never edit it directly; rebuild with `pnpm build`.
- TypeScript uses `module: NodeNext`; local imports use `.js` specifiers.
- `pnpm validate` is the complete gate: build, typecheck, smoke. There are no `test` or `lint` scripts.
- Smoke tests create temporary Git repos; never hard-code paths outside the temporary repo.
- If `run.md` links change, assert their exact relative paths in smoke coverage.

## Lifecycle

Follow the standard Nerv lifecycle for work on this repository:

1. **Intake** — capture ambiguous or large intent before materializing work
2. **Task** — define scope, acceptance criteria, validation, and risks
3. **Run** — start a Run, generate `run.md` and `task.md`
4. **Checkpoint** — save progress only when a Run must be interrupted and resumed
5. **Review** — verify acceptance criteria and validation before closing
6. **Close** — commit changes, capture Git hash, mark Run and Task closed

Checkpoints are memory for interrupted Runs, not routine progress markers.

## Guardrails

- Do not approve or apply proposals without explicit human approval.
- Do not create a Build unless the Task explicitly requires coordination across multiple independent increments.
- Do not modify source code, SQLite schema, Product Context, or Repo Context unless the Task scope explicitly includes it.
- Do not implement or design the future public `nerv` skill; it is out of scope.
- Do not create checkpoints unless execution must genuinely be interrupted.
- Do not start a Run during Intake planning; Intake does not create Runs.

## Workflow

When a request targets Nerv development:

1. Read `AGENTS.md` for repository commands and architecture constraints.
2. Inspect Git status, current Run, and relevant `.nerv/` state.
3. **Classify the request** using the mandatory-Intake conditions below.
4. If any mandatory-Intake condition applies, **stop before editing implementation files** and use Intake to capture intent, create a Proposal, and wait for explicit human approval.
5. If no mandatory-Intake condition applies and the request is genuinely bounded, create or update a Task with explicit scope and acceptance criteria.
6. Start a Run, generate agent entrypoints, and follow the lifecycle.
7. Use `pnpm validate` as the complete verification gate.

### Mandatory Intake Conditions

Use Intake and stop before implementation when the request introduces or changes any of:

- **Durable SQLite schema or migrations** — new tables, columns, foreign keys, or migration logic
- **CLI command surfaces** — new commands, subcommands, or significant option changes
- **Lifecycle states, transitions, gates, review, or close behavior** — changes to how Builds, Tasks, Runs, or Reviews transition between states
- **Coordination across multiple Nerv subsystems** — changes that touch schema, CLI, lifecycle, and generated artifacts together
- **Large or ambiguous repository-level features** — work that spans multiple files, subsystems, or requires planning beyond a single bounded Task

For these conditions, the agent must:

- Stop before editing implementation files
- Create an Intake and Proposal
- Stop before human approval
- Materialize work only after explicit approval via `nerv intake apply`

Use a direct Task only when the request is genuinely bounded and does not meet any mandatory-Intake condition. Examples of bounded work: fixing a typo in documentation, correcting a single function's logic, updating a smoke test assertion.

## When Not to Use

- Consumer repository using Nerv as a tool — use Nerv's CLI commands, not this skill.
- Generic Node.js or TypeScript development unrelated to Nerv — use general-purpose skills.
- Future public `nerv` skill — separate deliverable, separate scope.

## Evaluation

When validating this skill's activation, use English prompts with both positive and negative cases:

**Should trigger:**
- "Fix the SQLite migration in database.ts"
- "Add a new CLI command for workspace cleanup"
- "Review the Product Context workflow for approval gates"
- "Validate that smoke tests don't hard-code paths"

**Should not trigger:**
- "Use Nerv to plan my next feature" (consumer use)
- "Write a Node.js server with Express" (generic development)
- "Create a public skill for Nerv users" (future public skill)
- "Refactor this TypeScript module" (unrelated to Nerv)

Assert that excluded requests do not activate or misuse this skill.
